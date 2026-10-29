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
  const account = db.accounts.get(req.accountId!);
  // Accepted invitation. The invitee's email is personal data and is intentionally not sent.
  trackServerEvent("teammate_invited", {
    visitorId: req.userId!,
    accountId: req.accountId!,
    properties: { accountPlan: account?.plan, seats: account?.seats },
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
  // Plan change saved. Only fire on an actual transition so re-submitting the same plan is ignored.
  if (previousPlan !== account.plan) {
    trackServerEvent("plan_upgraded", {
      visitorId: req.userId!,
      accountId: account.id,
      properties: { previousPlan, plan: account.plan, seats: account.seats },
    });
  }
  res.json(account);
});
