/** Server-side Pendo track events that are not keyed by a project business object. */

export type TrackPropertyValue = string | number | boolean;

export interface TrackIdentity {
  visitorId: string;
  accountId: string;
}

const trackEndpoint =
  process.env.PENDO_TRACK_ENDPOINT ?? "https://data.pendo-dev.pendo-dev.com/data/track";
const trackKey = process.env.PENDO_TRACK_KEY;

/**
 * Sends a track event to Pendo. Fire-and-forget: failures are logged and never
 * affect the API response. No-op when PENDO_TRACK_KEY is not configured.
 */
export function trackServerEvent(
  eventName: string,
  identity: TrackIdentity,
  properties: Record<string, TrackPropertyValue>
): void {
  if (!trackKey) return;
  const body = {
    type: "track",
    event: eventName,
    visitorId: identity.visitorId,
    accountId: identity.accountId,
    properties,
    timestamp: Date.now(),
  };
  void fetch(trackEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-pendo-integration-key": trackKey },
    body: JSON.stringify(body),
  })
    .then((response) => {
      if (!response.ok) {
        console.warn(`Pendo track "${eventName}" failed with status ${response.status}`);
      }
    })
    .catch((err: unknown) => {
      console.warn(`Pendo track "${eventName}" failed`, err);
    });
}
