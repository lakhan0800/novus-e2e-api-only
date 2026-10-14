const PENDO_DATA_HOST =
  process.env.PENDO_DATA_HOST ?? "data.pendo-dev.pendo-dev.com";
const PENDO_INTEGRATION_KEY = process.env.PENDO_INTEGRATION_KEY ?? "";

interface PendoTrackPayload {
  type: "track";
  event: string;
  visitorId: string;
  accountId: string;
  timestamp: number;
  properties?: Record<string, string | number | boolean>;
}

/**
 * Send a server-side Pendo Track Event via HTTP POST.
 * Fire-and-forget — errors are logged but never propagated so tracking
 * failures cannot break application flow.
 */
export async function pendoTrack(
  event: string,
  visitorId: string,
  accountId: string,
  properties?: Record<string, string | number | boolean>,
): Promise<void> {
  if (!PENDO_INTEGRATION_KEY) {
    console.warn(
      "[Pendo] PENDO_INTEGRATION_KEY not set — skipping track event:",
      event,
    );
    return;
  }

  const payload: PendoTrackPayload = {
    type: "track",
    event,
    visitorId,
    accountId,
    timestamp: Date.now(),
    ...(properties && { properties }),
  };

  try {
    await fetch(`https://${PENDO_DATA_HOST}/data/track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-pendo-integration-key": PENDO_INTEGRATION_KEY,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[Pendo] Failed to send track event:", event, err);
  }
}
