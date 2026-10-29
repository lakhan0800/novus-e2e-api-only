import { Router } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { trackServerEvent } from "../analytics/pendoTrack.js";
import type { SessionRequest } from "./auth.js";

export const assistantRouter = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const assistantModel = "gpt-4o-mini";

const AssistantBody = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
});

assistantRouter.post("/", async (req: SessionRequest, res) => {
  const body = AssistantBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid conversation" });
    return;
  }
  const messageCount = body.data.messages.length;
  let completion: OpenAI.Chat.Completions.ChatCompletion;
  try {
    completion = await openai.chat.completions.create({
      model: assistantModel,
      messages: [
        { role: "system", content: "You help Taskly users plan projects and tasks." },
        ...body.data.messages,
      ],
    });
  } catch (err) {
    // The model call failed, so the user got no reply.
    trackServerEvent("ai_assistant_reply_generated", {
      visitorId: req.userId!,
      accountId: req.accountId!,
      properties: { model: assistantModel, messageCount, success: false },
    });
    throw err;
  }
  const reply = completion.choices[0]?.message.content ?? "";
  // The model returned a reply to the user.
  trackServerEvent("ai_assistant_reply_generated", {
    visitorId: req.userId!,
    accountId: req.accountId!,
    properties: {
      model: assistantModel,
      messageCount,
      replyLength: reply.length,
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      finishReason: completion.choices[0]?.finish_reason ?? "unknown",
      success: true,
    },
  });
  res.json({ reply });
});
