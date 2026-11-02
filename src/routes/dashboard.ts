import { Router } from "express";
import { db } from "../db.js";
import type { SessionRequest } from "./auth.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", (req: SessionRequest, res) => {
  const projects = [...db.projects.values()].filter((p) => p.accountId === req.accountId);
  const openTasks = projects.flatMap((p) => p.tasks).filter((t) => !t.done).length;
  res.json({
    openTasks,
    dueThisWeek: Math.min(openTasks, 3),
    recentProjects: projects.slice(0, 5).map((p) => ({ id: p.id, name: p.name })),
  });
});
