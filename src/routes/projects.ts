import { Router } from "express";
import { z } from "zod";
import { db, newId } from "../db.js";
import type { SessionRequest } from "./auth.js";

export const projectsRouter = Router();

projectsRouter.get("/", (req: SessionRequest, res) => {
  const projects = [...db.projects.values()]
    .filter((p) => p.accountId === req.accountId)
    .map((p) => ({ id: p.id, name: p.name, taskCount: p.tasks.length }));
  res.json(projects);
});

projectsRouter.post("/", (req: SessionRequest, res) => {
  const body = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Project name is required" });
    return;
  }
  const project = { id: newId(), accountId: req.accountId!, name: body.data.name, tasks: [] };
  db.projects.set(project.id, project);
  res.status(201).json({ id: project.id, name: project.name, taskCount: 0 });
});

projectsRouter.get("/:projectId", (req: SessionRequest, res) => {
  const project = db.projects.get(req.params.projectId);
  if (!project || project.accountId !== req.accountId) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json({ id: project.id, name: project.name, tasks: project.tasks });
});

projectsRouter.post("/:projectId/tasks", (req: SessionRequest, res) => {
  const project = db.projects.get(req.params.projectId);
  const body = z.object({ title: z.string().min(1) }).safeParse(req.body);
  if (!project || project.accountId !== req.accountId || !body.success) {
    res.status(400).json({ error: "Invalid task" });
    return;
  }
  const task = { id: newId(), title: body.data.title, done: false };
  project.tasks.push(task);
  res.status(201).json(task);
});

projectsRouter.post("/:projectId/tasks/:taskId/complete", (req: SessionRequest, res) => {
  const project = db.projects.get(req.params.projectId);
  const task = project?.tasks.find((t) => t.id === req.params.taskId);
  if (!project || project.accountId !== req.accountId || !task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  task.done = true;
  res.json(task);
});
