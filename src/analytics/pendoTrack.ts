/** Server-side Pendo Track Events sent through the Pendo track API. */

export type TrackPropertyValue = string | number | boolean | undefined;

export interface TrackEventInput {
  visitorId: string;
  accountId: string;
  properties?: Record<string, TrackPropertyValue>;
}

const trackEndpoint =
  process.env.PENDO_TRACK_ENDPOINT ?? "https://data.pendo-dev.pendo-dev.com/data/track";
// Pendo track event (integration) secret. Never commit it; provide it through the environment.
const trackKey = process.env.PENDO_TRACK_KEY;

/** Fire-and-forget: tracking failures are logged and never break the request. */
export function trackServerEvent(eventName: string, input: TrackEventInput): void {
  if (!trackKey) return;
  try {
    const body = {
      type: "track",
      event: eventName,
      visitorId: input.visitorId,
      accountId: input.accountId,
      timestamp: Date.now(),
      properties: input.properties ?? {},
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
  } catch (err) {
    console.warn(`Pendo track "${eventName}" failed`, err);
  }
}
