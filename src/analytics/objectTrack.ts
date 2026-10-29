import type { ProjectStatus } from "../db.js";

/** Server-side track events keyed by business-object ids for Pendo Object Analytics. */

export interface ProjectEventProperties {
  projectId: string;
  accountId: string;
  taskId?: string;
  status?: ProjectStatus;
  taskCount?: number;
}

const trackEndpoint = process.env.PENDO_TRACK_ENDPOINT ?? "https://app.pendo.io/data/track";
const trackKey = process.env.PENDO_TRACK_KEY;

export function trackProjectObjectEvent(
  eventName: string,
  properties: ProjectEventProperties,
  visitorId: string
): void {
  if (!trackKey) return;
  const body = {
    type: "track",
    event: eventName,
    visitorId,
    accountId: properties.accountId,
    properties: {
      projectId: properties.projectId,
      taskId: properties.taskId,
      projectStatus: properties.status,
      taskCount: properties.taskCount,
    },
    timestamp: Date.now(),
  };
  void fetch(`${trackEndpoint}?apikey=${trackKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => undefined);
}

export type TrackEventProperties = Record<string, string | number | boolean | undefined>;

/**
 * Sends a server-side Pendo Track Event that is not tied to a project object.
 * Uses the same PENDO_TRACK_ENDPOINT / PENDO_TRACK_KEY configuration as trackProjectObjectEvent.
 * Fire-and-forget: tracking failures are logged and never break the request.
 */
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
      .then((response) => {
        if (!response.ok) {
          console.error(`Pendo track "${eventName}" failed with status ${response.status}`);
        }
      })
      .catch((err: unknown) => console.error(`Pendo track "${eventName}" failed`, err));
  } catch (err) {
    console.error(`Pendo track "${eventName}" failed`, err);
  }
}
