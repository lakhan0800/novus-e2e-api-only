import { Router } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { TASKLY_ASSISTANT_AGENT_ID, trackAgent } from "../analytics/agentTrack.js";
import { newId } from "../db.js";
import type { SessionRequest } from "./auth.js";

export const assistantRouter = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const AssistantBody = z.object({
  conversationId: z.string().min(1).optional(),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
});

assistantRouter.post("/", async (req: SessionRequest, res) => {
  const body = AssistantBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid conversation" });
    return;
  }
  const conversationId = body.data.conversationId ?? newId();
  const visitorId = req.userId;
  const prompt = [...body.data.messages].reverse().find((m) => m.role === "user");
  if (visitorId && prompt) {
    trackAgent(
      "prompt",
      {
        agentId: TASKLY_ASSISTANT_AGENT_ID,
        conversationId,
        messageId: newId(),
        content: prompt.content,
        suggestedPrompt: false,
        fileUploaded: false,
      },
      visitorId,
      req.accountId
    );
  }
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You help Taskly users plan projects and tasks." },
      ...body.data.messages,
    ],
  });
  const message = completion.choices[0]?.message;
  const reply = message?.content ?? "";
  const messageId = completion.id || newId();
  if (visitorId) {
    trackAgent(
      "agent_response",
      {
        agentId: TASKLY_ASSISTANT_AGENT_ID,
        conversationId,
        messageId,
        content: reply,
        modelUsed: completion.model,
        toolsUsed: message?.tool_calls?.map((t) => t.function.name) ?? [],
      },
      visitorId,
      req.accountId
    );
  }
  res.json({ reply, conversationId, messageId });
});
