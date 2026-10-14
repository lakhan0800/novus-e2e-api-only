import { Router } from "express";
import OpenAI from "openai";
import { z } from "zod";
import type { SessionRequest } from "./auth.js";
import { pendoTrack } from "../pendo.js";

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
  res.json({ reply });

  // Pendo Track: user sent a message to the AI assistant
  void pendoTrack("ai_assistant_message_sent", req.userId!, req.accountId!, {
    message_count: body.data.messages.length,
    conversation_length: body.data.messages.length,
    model: "gpt-4o-mini",
    reply_length: reply.length,
  });
});
