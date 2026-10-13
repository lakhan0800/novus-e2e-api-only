import { randomUUID } from "node:crypto";

export interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  role: "owner" | "admin" | "member";
  accountId: string;
  createdAt: string;
}

export interface AccountRecord {
  id: string;
  name: string;
  plan: "free" | "team" | "enterprise";
  seats: number;
}

export interface TaskRecord {
  id: string;
  title: string;
  done: boolean;
}

export interface ProjectRecord {
  id: string;
  accountId: string;
  name: string;
  tasks: TaskRecord[];
}

const account: AccountRecord = { id: "acct_1", name: "Acme Corp", plan: "free", seats: 5 };

export const db = {
  accounts: new Map<string, AccountRecord>([[account.id, account]]),
  users: new Map<string, UserRecord>([
    [
      "user_1",
      {
        id: "user_1",
        email: "ada@acme.test",
        fullName: "Ada Lovelace",
        role: "owner",
        accountId: account.id,
        createdAt: "2026-01-15T10:00:00.000Z",
      },
    ],
  ]),
  projects: new Map<string, ProjectRecord>(),
  sessions: new Map<string, string>(),
};

export const newId = () => randomUUID();
