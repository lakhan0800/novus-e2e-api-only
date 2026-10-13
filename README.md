# Taskly API

REST API for Taskly. Express + TypeScript, in-memory storage. There is no user interface in this repository; the web app lives in `novus-e2e-frontend`.

```bash
npm install
OPENAI_API_KEY=... npm run dev   # listens on :4000
```

| Route                                           | Purpose                                       |
| ----------------------------------------------- | --------------------------------------------- |
| `POST /api/auth/login`                          | Start a session; returns the user and account |
| `GET /api/dashboard`                            | Task counts and recent projects               |
| `GET/POST /api/projects`                        | List and create projects                      |
| `GET /api/projects/:id`                         | Project with tasks                            |
| `POST /api/projects/:id/tasks`                  | Add a task                                    |
| `POST /api/projects/:id/tasks/:taskId/complete` | Complete a task                               |
| `POST /api/account/invitations`                 | Invite a teammate                             |
| `POST /api/account/upgrade`                     | Change plan                                   |
| `POST /api/assistant`                           | Chat with the Taskly AI assistant (OpenAI)    |

## Pendo Track Events

Route handlers send server-side Pendo Track Events through `src/pendo.ts`. Set `PENDO_TRACK_EVENT_SECRET` to the subscription's Track Event shared secret to enable them; without it, tracking is off. `PENDO_DATA_HOST` overrides the default data host. Events use the signed-in user's `id` and `accountId`, the same IDs the web app passes to `pendo.initialize`.

`login_failed` has no signed-in user, so it is sent only when the web app forwards its anonymous Pendo visitor ID (`pendo.getVisitorId()`, which starts with `_PENDO_T_`) in an `X-Pendo-Visitor-Id` header on `POST /api/auth/login`.
