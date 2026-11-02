import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { db, newId } from "../db.js";

export const authRouter = Router();

const LoginBody = z.object({ email: z.string().email(), password: z.string().min(1) });

authRouter.post("/login", (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid login" });
    return;
  }
  const user = [...db.users.values()].find((u) => u.email === parsed.data.email);
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const sessionId = newId();
  db.sessions.set(sessionId, user.id);
  res.cookie("taskly_session", sessionId, { httpOnly: true, sameSite: "lax" });
  res.json({ user, account: db.accounts.get(user.accountId) });
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
