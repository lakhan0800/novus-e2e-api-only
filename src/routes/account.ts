import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { pendoTrack } from "../pendo.js";
import type { SessionRequest } from "./auth.js";

export const accountRouter = Router();

accountRouter.post("/invitations", (req: SessionRequest, res) => {
  const body = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "A valid email is required" });
    return;
  }
  res.status(202).json({ invited: body.data.email });

  // Pendo Track: teammate invitation sent
  const account = db.accounts.get(req.accountId!);
  const inviter = db.users.get(req.userId!);
  void pendoTrack("teammate_invited", req.userId!, req.accountId!, {
    invitee_email: body.data.email,
    account_name: account?.name ?? "",
    account_plan: account?.plan ?? "",
    account_seats: account?.seats ?? 0,
    inviter_role: inviter?.role ?? "",
  });
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
  res.json(account);

  // Pendo Track: account plan upgraded
  const user = db.users.get(req.userId!);
  void pendoTrack("plan_upgraded", req.userId!, req.accountId!, {
    previous_plan: previousPlan,
    new_plan: account.plan,
    new_seats: account.seats,
    user_role: user?.role ?? "",
  });
});
