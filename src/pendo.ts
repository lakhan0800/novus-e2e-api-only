import type { Request } from "express";

// Server-side Pendo Track Events (POST /data/track). PENDO_TRACK_EVENT_SECRET is the subscription's
// Track Event shared secret: keep it in the environment, never in source control. Tracking is off
// without it.
const dataHost = process.env.PENDO_DATA_HOST || "data.pendo-dev.pendo-dev.com";
const trackEventSecret = process.env.PENDO_TRACK_EVENT_SECRET;

if (!trackEventSecret) {
  console.warn("PENDO_TRACK_EVENT_SECRET is not set; Pendo track events are disabled");
}

// Track types registered in Pendo. Metrics match on these names exactly, so never rename them.
export type PendoTrackEventName =
  | "user_logged_in"
  | "login_failed"
  | "project_created"
  | "task_created"
  | "task_completed"
  | "teammate_invited"
  | "plan_changed"
  | "ai_assistant_response_generated"
  | "ai_assistant_request_failed";

export interface PendoTrackEvent {
  event: PendoTrackEventName;
  // The user and account IDs the web app passes to pendo.initialize, so events join that visitor.
  visitorId: string;
  // Omit only for anonymous visitors, which have no account.
  accountId?: string;
  // Undefined values are dropped. Never send PII or free text (emails, names, titles, prompts).
  properties?: Record<string, string | number | boolean | undefined>;
}

/** Sends a Track Event in the background. Failures are logged, never thrown. */
export function trackPendoEvent(trackEvent: PendoTrackEvent): void {
  if (!trackEventSecret) return;
  postTrackEvent(trackEvent, trackEventSecret).catch((err: unknown) => {
    console.error(`Pendo track event "${trackEvent.event}" failed`, err);
  });
}

async function postTrackEvent(
  { event, visitorId, accountId, properties }: PendoTrackEvent,
  secret: string,
) {
  const res = await fetch(`https://${dataHost}/data/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-pendo-integration-key": secret },
    body: JSON.stringify({
      type: "track",
      event,
      visitorId,
      accountId,
      timestamp: Date.now(),
      properties,
    }),
    signal: AbortSignal.timeout(5000),
  });
  await res.arrayBuffer(); // read the body so the connection can be reused
  if (!res.ok) throw new Error(`Pendo responded with HTTP ${res.status}`);
}

/**
 * Unauthenticated requests have no Taskly user, so the web app forwards its anonymous Pendo
 * visitor ID (pendo.getVisitorId()) in the X-Pendo-Visitor-Id header. Only anonymous IDs are
 * accepted, so an unauthenticated caller cannot attach events to a signed-in visitor.
 */
export function getAnonymousVisitorId(req: Request): string | undefined {
  const visitorId = req.get("x-pendo-visitor-id");
  return visitorId?.startsWith("_PENDO_T_") && visitorId.length <= 128 ? visitorId : undefined;
}
