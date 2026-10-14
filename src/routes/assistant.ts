import { randomUUID } from "node:crypto";
import { Router } from "express";
import OpenAI from "openai";
import { z } from "zod";
import type { SessionRequest } from "./auth.js";

export const assistantRouter = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const AGENT_ID = "G8fVMdlxogkvAqkdrBFclP1tB9o";

const AssistantBody = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
});

assistantRouter.post("/", async (req: SessionRequest, res) => {
  const body = AssistantBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid conversation" });
    return;
  }

  const conversationId = randomUUID();
  const lastUserMessage = [...body.data.messages].reverse().find((m) => m.role === "user");
  const promptMessageId = randomUUID();

  if (lastUserMessage) {
    pendo.trackAgent("prompt", {
      agentId: AGENT_ID,
      conversationId,
      messageId: promptMessageId,
      content: lastUserMessage.content,
    });
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You help Taskly users plan projects and tasks." },
      ...body.data.messages,
    ],
  });

  const reply = completion.choices[0]?.message.content ?? "";

  pendo.trackAgent("agent_response", {
    agentId: AGENT_ID,
    conversationId,
    messageId: randomUUID(),
    content: reply,
    modelUsed: "gpt-4o-mini",
  });

  res.json({ reply });
});
