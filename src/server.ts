import express from "express";
import cookieParser from "cookie-parser";
import { authRouter, requireSession } from "./routes/auth.js";
import { projectsRouter } from "./routes/projects.js";
import { accountRouter } from "./routes/account.js";
import { assistantRouter } from "./routes/assistant.js";
import { dashboardRouter } from "./routes/dashboard.js";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/dashboard", requireSession, dashboardRouter);
app.use("/api/projects", requireSession, projectsRouter);
app.use("/api/account", requireSession, accountRouter);
app.use("/api/assistant", requireSession, assistantRouter);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Taskly API listening on :${port}`);
});
