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
  let reply: string;
  try {
    const completion = await openai.chat.completions.create({
      model: assistantModel,
      messages: [
        { role: "system", content: "You help Taskly users plan projects and tasks." },
        ...body.data.messages,
      ],
    });
    reply = completion.choices[0]?.message.content ?? "";
  } catch (err) {
    // Track the failed generation (no message content), then preserve the original error flow.
    trackServerEvent("assistant_response_generated", req.userId!, req.accountId!, {
      model: assistantModel,
      messageCount,
      success: false,
      errorType: err instanceof Error ? err.constructor.name : "unknown",
    });
    throw err;
  }
  // Track the generated reply (no message content).
  trackServerEvent("assistant_response_generated", req.userId!, req.accountId!, {
    model: assistantModel,
    messageCount,
    replyLength: reply.length,
    success: true,
  });
  res.json({ reply });
});
