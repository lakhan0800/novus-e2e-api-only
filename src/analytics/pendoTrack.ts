/** Server-side Pendo Track Events sent to the Pendo Track API. */

export type TrackEventProperties = Record<string, string | number | boolean | undefined>;

const trackEndpoint =
  process.env.PENDO_TRACK_ENDPOINT ?? "https://data.pendo-dev.pendo-dev.com/data/track";
const trackKey = process.env.PENDO_TRACK_KEY;

export function trackServerEvent(
  eventName: string,
  visitorId: string,
  accountId: string,
  properties: TrackEventProperties
): void {
  if (!trackKey) return;
  try {
    const body = {
      type: "track",
      event: eventName,
      visitorId,
      accountId,
      properties,
      timestamp: Date.now(),
    };
    void fetch(trackEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-pendo-integration-key": trackKey },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) console.warn(`Pendo track "${eventName}" failed with status ${res.status}`);
      })
      .catch((err: unknown) => {
        console.warn(`Pendo track "${eventName}" failed`, err);
      });
  } catch (err) {
    console.warn(`Pendo track "${eventName}" failed`, err);
  }
}
