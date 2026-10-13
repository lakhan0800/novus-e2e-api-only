import { Router } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { trackPendoEvent } from "../pendo.js";
import type { SessionRequest } from "./auth.js";

export const assistantRouter = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = "gpt-4o-mini";

const AssistantBody = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
});

assistantRouter.post("/", async (req: SessionRequest, res) => {
  const body = AssistantBody.safeParse(req.body);
  if (!body.success) {
    trackPendoEvent({
      event: "ai_assistant_request_failed",
      visitorId: req.userId!,
      accountId: req.accountId!,
      properties: { failureReason: "invalid_conversation", model },
    });
    res.status(400).json({ error: "Invalid conversation" });
    return;
  }
  // The client resends the whole history on every call, so the number of user messages is the
  // conversation turn. Only counts and lengths are tracked: message text may be confidential.
  const userMessages = body.data.messages.filter((m) => m.role === "user");
  const startedAt = performance.now();
  let completion: OpenAI.ChatCompletion;
  try {
    completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "You help Taskly users plan projects and tasks." },
        ...body.data.messages,
      ],
    });
  } catch (err) {
    // Express 4 doesn't catch async errors; an unhandled rejection here would crash the process.
    console.error("Assistant request failed", err);
    trackPendoEvent({
      event: "ai_assistant_request_failed",
      visitorId: req.userId!,
      accountId: req.accountId!,
      properties: {
        failureReason: "provider_error",
        errorStatus: err instanceof OpenAI.APIError ? err.status : undefined,
        errorCode: err instanceof OpenAI.APIError ? (err.code ?? undefined) : undefined,
        model,
        conversationTurn: userMessages.length,
        latencyMs: Math.round(performance.now() - startedAt),
      },
    });
    res.status(502).json({ error: "Assistant unavailable" });
    return;
  }
  const choice = completion.choices[0];
  const reply = choice?.message.content ?? "";
  trackPendoEvent({
    event: "ai_assistant_response_generated",
    visitorId: req.userId!,
    accountId: req.accountId!,
    properties: {
      model,
      conversationTurn: userMessages.length,
      messageCount: body.data.messages.length,
      promptLength: userMessages.at(-1)?.content.length ?? 0,
      replyLength: reply.length,
      replyEmpty: reply.length === 0,
      finishReason: choice?.finish_reason,
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      latencyMs: Math.round(performance.now() - startedAt),
    },
  });
  res.json({ reply });
});
