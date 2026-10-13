import { Router } from "express";
import { z } from "zod";
import { db, type AccountRecord } from "../db.js";
import { trackPendoEvent } from "../pendo.js";
import type { SessionRequest } from "./auth.js";

export const accountRouter = Router();

const planRank: Record<AccountRecord["plan"], number> = { free: 0, team: 1, enterprise: 2 };

const emailDomain = (email: string) => email.slice(email.lastIndexOf("@") + 1).toLowerCase();

accountRouter.post("/invitations", (req: SessionRequest, res) => {
  const body = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "A valid email is required" });
    return;
  }
  // Nothing is stored or emailed yet: once it is, fire this after that succeeds.
  // Never send the invitee's email address.
  const inviter = db.users.get(req.userId!);
  const account = db.accounts.get(req.accountId!);
  const members = [...db.users.values()].filter((u) => u.accountId === req.accountId);
  trackPendoEvent({
    event: "teammate_invited",
    visitorId: req.userId!,
    accountId: req.accountId!,
    properties: {
      inviterRole: inviter?.role,
      plan: account?.plan,
      seats: account?.seats,
      accountMemberCount: members.length,
      inviteeSameDomain: inviter
        ? emailDomain(inviter.email) === emailDomain(body.data.email)
        : undefined,
    },
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
  const previousSeats = account.seats;
  account.plan = body.data.plan;
  account.seats = body.data.plan === "team" ? 25 : 500;
  // This route also downgrades (enterprise to team) and accepts same-plan no-ops.
  if (account.plan !== previousPlan) {
    trackPendoEvent({
      event: "plan_changed",
      visitorId: req.userId!,
      accountId: req.accountId!,
      properties: {
        previousPlan,
        newPlan: account.plan,
        changeDirection: planRank[account.plan] > planRank[previousPlan] ? "upgrade" : "downgrade",
        previousSeats,
        newSeats: account.seats,
        changedByRole: db.users.get(req.userId!)?.role,
      },
    });
  }
  res.json(account);
});
