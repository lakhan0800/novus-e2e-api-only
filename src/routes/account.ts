import { Router } from "express";
import { z } from "zod";
import { trackServerEvent } from "../analytics/track.js";
import { db } from "../db.js";
import type { SessionRequest } from "./auth.js";

export const accountRouter = Router();

accountRouter.post("/invitations", (req: SessionRequest, res) => {
  const body = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "A valid email is required" });
    return;
  }
  // Invitation accepted. The invitee's email is PII and is deliberately not sent to Pendo.
  const inviter = db.users.get(req.userId!);
  const account = db.accounts.get(req.accountId!);
  trackServerEvent(
    "teammate_invited",
    { visitorId: req.userId!, accountId: req.accountId! },
    {
      inviterUserId: req.userId!,
      inviterRole: inviter?.role ?? "unknown",
      accountPlan: account?.plan ?? "unknown",
    }
  );
  res.status(202).json({ invited: body.data.email });
});

accountRouter.post("/upgrade", (req: SessionRequest, res) => {
  const body = z.object({ plan: z.enum(["team", "enterprise"]) }).safeParse(req.body);
  const account = db.accounts.get(req.accountId!);
  if (!body.success || !account) {
    res.status(400).json({ error: "Invalid plan" });
    return;
  }
  const previousPlan = account.plan;
  account.plan = body.data.plan;
  account.seats = body.data.plan === "team" ? 25 : 500;
  // Conversion milestone: only fire when the saved plan actually changed.
  if (previousPlan !== account.plan) {
    trackServerEvent(
      "plan_upgraded",
      { visitorId: req.userId!, accountId: account.id },
      { previousPlan, plan: account.plan, seats: account.seats }
    );
  }
  res.json(account);
});
