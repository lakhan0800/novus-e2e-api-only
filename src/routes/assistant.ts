import { Router } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { trackServerEvent } from "../analytics/objectTrack.js";
import type { SessionRequest } from "./auth.js";

export const assistantRouter = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const AssistantBody = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
});

assistantRouter.post("/", async (req: SessionRequest, res) => {
  const body = AssistantBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid conversation" });
    return;
  }
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You help Taskly users plan projects and tasks." },
      ...body.data.messages,
    ],
  });
  const reply = completion.choices[0]?.message.content ?? "";
  // Successful assistant response. Message content may contain PII and is intentionally not sent.
  trackServerEvent("assistant_response_generated", req.userId!, req.accountId!, {
    model: completion.model,
    messageCount: body.data.messages.length,
    replyLength: reply.length,
    finishReason: completion.choices[0]?.finish_reason ?? undefined,
    promptTokens: completion.usage?.prompt_tokens,
    completionTokens: completion.usage?.completion_tokens,
  });
  res.json({ reply });
});
