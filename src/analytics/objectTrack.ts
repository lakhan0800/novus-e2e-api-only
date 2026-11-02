import type { ProjectStatus } from "../db.js";

/** Server-side track events keyed by business-object ids for Pendo Object Analytics. */

export interface ProjectEventProperties {
  projectId: string;
  accountId: string;
  taskId?: string;
  status?: ProjectStatus;
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
    },
    timestamp: Date.now(),
  };
  void fetch(`${trackEndpoint}?apikey=${trackKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => undefined);
}
