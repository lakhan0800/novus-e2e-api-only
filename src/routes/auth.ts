import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { db, newId } from "../db.js";
import { getAnonymousVisitorId, trackPendoEvent } from "../pendo.js";

export const authRouter = Router();

const LoginBody = z.object({ email: z.string().email(), password: z.string().min(1) });

const msPerDay = 24 * 60 * 60 * 1000;

// The caller isn't signed in, so attribute the failure to the web app's anonymous Pendo visitor.
// If none was forwarded, skip it rather than create a throwaway visitor per failed attempt.
// Never send the submitted email or password.
function trackLoginFailed(
  req: Request,
  failureReason: "invalid_request" | "unknown_email",
  statusCode: number,
) {
  const visitorId = getAnonymousVisitorId(req);
  if (!visitorId) return;
  trackPendoEvent({ event: "login_failed", visitorId, properties: { failureReason, statusCode } });
}

authRouter.post("/login", (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    trackLoginFailed(req, "invalid_request", 400);
    res.status(400).json({ error: "Invalid login" });
    return;
  }
  const user = [...db.users.values()].find((u) => u.email === parsed.data.email);
  if (!user) {
    trackLoginFailed(req, "unknown_email", 401);
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const sessionId = newId();
  db.sessions.set(sessionId, user.id);
  res.cookie("taskly_session", sessionId, { httpOnly: true, sameSite: "lax" });
  const account = db.accounts.get(user.accountId);
  trackPendoEvent({
    event: "user_logged_in",
    visitorId: user.id,
    accountId: user.accountId,
    properties: {
      role: user.role,
      plan: account?.plan,
      seats: account?.seats,
      daysSinceSignup: Math.floor((Date.now() - Date.parse(user.createdAt)) / msPerDay),
    },
  });
  res.json({ user, account });
});

export interface SessionRequest extends Request {
  userId?: string;
  accountId?: string;
}

export function requireSession(req: SessionRequest, res: Response, next: NextFunction) {
  const userId = db.sessions.get(req.cookies?.taskly_session);
  const user = userId ? db.users.get(userId) : undefined;
  if (!user) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  req.userId = user.id;
  req.accountId = user.accountId;
  next();
}
