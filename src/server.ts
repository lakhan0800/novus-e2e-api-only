import express from "express";
import cookieParser from "cookie-parser";
import * as pendo from "pendo-server-sdk";
import { authRouter, requireSession, type SessionRequest } from "./routes/auth.js";
import { projectsRouter } from "./routes/projects.js";
import { accountRouter } from "./routes/account.js";
import { assistantRouter } from "./routes/assistant.js";
import { dashboardRouter } from "./routes/dashboard.js";

pendo.init({
  apiKey: "4b586c43-f89a-4ea8-b592-6d37fdb831ce",
  agentId: "ntAQ9SmJ4TzQZ5FjZAOLHOZWshs",
  endpoint: "https://app.pendo-dev.pendo-dev.com",
  autoPatch: true,
});

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
app.use(
  "/api/assistant",
  requireSession,
  pendo.middleware((req: SessionRequest) => ({
    visitorId: req.userId, // TODO: map to the visitor id your Pendo web snippet uses
    accountId: req.accountId, // TODO: map to the Pendo account id
    // TODO: set conversationId to the conversation's thread id once POST /api/assistant
    // sends one (for example a threadId field in the request body).
  })),
  assistantRouter,
);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Taskly API listening on :${port}`);
});

async function stop() {
  await pendo.shutdown();
  process.exit(0);
}

process.on("SIGINT", () => {
  void stop();
});
process.on("SIGTERM", () => {
  void stop();
});
