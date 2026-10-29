import { Router } from "express";
import { z } from "zod";
import { trackServerEvent } from "../analytics/pendoTrack.js";
import { db } from "../db.js";
import type { SessionRequest } from "./auth.js";

export const accountRouter = Router();

accountRouter.post("/invitations", (req: SessionRequest, res) => {
  const body = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "A valid email is required" });
    return;
  }
  // Track the accepted invitation. The invitee's email is PII and is not sent.
  const inviter = db.users.get(req.userId!);
  const account = db.accounts.get(req.accountId!);
  trackServerEvent("teammate_invited", req.userId!, req.accountId!, {
    inviterUserId: req.userId,
    inviterRole: inviter?.role,
    accountPlan: account?.plan,
  });
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
  // Track the saved plan change; only fire when the plan actually changed.
  if (previousPlan !== account.plan) {
    trackServerEvent("plan_upgraded", req.userId!, account.id, {
      previousPlan,
      plan: account.plan,
      seats: account.seats,
    });
  }
  res.json(account);
});
