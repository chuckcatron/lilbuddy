"use client";

import { useQuery } from "convex/react";
import { api } from "@lilbuddy/convex/api";

import { SessionCard } from "@/components/SessionCard";

export default function DashboardPage(): React.ReactElement {
  const sessions = useQuery(api.sessions.getActive);

  if (sessions === undefined) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <h1 className="mb-8 text-2xl font-bold">lilbuddy</h1>
        <p className="text-neutral-400">Loading sessions...</p>
      </main>
    );
  }

  if (sessions.length === 0) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <h1 className="mb-8 text-2xl font-bold">lilbuddy</h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-neutral-800 p-12">
          <p className="text-lg text-neutral-400">No active sessions</p>
          <p className="mt-2 text-sm text-neutral-600">
            Start a Claude Code session to see it here
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="mb-8 text-2xl font-bold">lilbuddy</h1>
      <div className="grid gap-4">
        {sessions.map((session) => (
          <SessionCard key={session._id} session={session} />
        ))}
      </div>
    </main>
  );
}
