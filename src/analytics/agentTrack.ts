/** Server-side Pendo Agent Analytics events, mirroring the browser pendo.trackAgent() API. */

export const TASKLY_ASSISTANT_AGENT_ID = "Cg4omxHVaWWkTVBttssv1Z3P4wk";

export type AgentEventType = "prompt" | "agent_response" | "user_reaction";

export interface AgentEventMetadata {
  agentId: string;
  conversationId: string;
  messageId: string;
  content: string;
  modelUsed?: string;
  suggestedPrompt?: boolean;
  toolsUsed?: string[];
  fileUploaded?: boolean;
}

const trackEndpoint = process.env.PENDO_TRACK_ENDPOINT ?? "https://app.pendo.io/data/track";
const trackKey = process.env.PENDO_TRACK_KEY;

export function trackAgent(
  eventType: AgentEventType,
  metadata: AgentEventMetadata,
  visitorId: string,
  accountId?: string
): void {
  if (!trackKey) return;
  const body = {
    type: "track",
    event: eventType,
    visitorId,
    accountId,
    properties: metadata,
    timestamp: Date.now(),
  };
  void fetch(`${trackEndpoint}?apikey=${trackKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => undefined);
}
