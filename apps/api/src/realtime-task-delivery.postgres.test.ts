import { randomUUID } from "node:crypto";
import type { Actor } from "@rakazo/contracts";
import { realtimeHandoffRunNonce } from "@rakazo/core";
import type { PrismaClient } from "@rakazo/db";
import {
  asSystem,
  createDb,
  createThreadMessage,
  finalizeRun,
  IsolationError,
  provisionMessagingIdentity,
  runAsSystem,
  runAsTenant,
} from "@rakazo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sendRealtimeTaskToChat } from "./realtime-task-delivery.js";

const describePostgres =
  process.env.VERIFY_DATABASE === "1" && process.env.DATABASE_URL
    ? describe.sequential
    : describe.skip;
describePostgres("live task delivery (PostgreSQL)", () => {
  let prisma: PrismaClient, system: PrismaClient, actor: Actor, botId: string, threadId: string;
  let close: () => Promise<void>;
  const address = `+1555${Math.floor(Math.random() * 9000000 + 1000000)}`;
  beforeAll(async () => {
    const db = createDb(process.env.DATABASE_URL!);
    prisma = db.prisma;
    system = asSystem(prisma);
    close = async () => {
      await prisma.$disconnect();
      await db.pool.end();
    };
    const fixture = await runAsSystem("isolated call delivery test fixture", () =>
      provisionMessagingIdentity(
        prisma,
        { provider: "sendblue", address },
        { signupsEnabled: undefined, signupAllowlist: undefined },
      ),
    );
    actor = { userId: fixture.userId, spaceId: fixture.spaceId } as Actor;
    botId = fixture.botId;
    threadId = fixture.threadId;
  });
  afterAll(async () => {
    try {
      if (actor) {
        await system.organization.deleteMany({ where: { id: actor.spaceId } });
        await system.user.deleteMany({ where: { id: actor.userId } });
      }
    } finally {
      await close?.();
    }
  });
  async function fixture(delivery: "voice" | "chat" = "voice") {
    const callId = randomUUID();
    const source = await createThreadMessage(system, {
      threadId,
      botId,
      role: "user",
      clientNonce: `call:${callId}:realtime-user-source`,
      blocks: [{ kind: "text", text: "A synthetic information request" }],
    });
    const task = await system.task.create({
      data: { ...actor, botId, threadId, prompt: "The original request", status: "running" },
    });
    const run = await system.run.create({
      data: {
        ...actor,
        botId,
        threadId,
        taskId: task.id,
        sourceMessageId: source.id,
        trigger: "user",
        status: "running",
        clientNonce: realtimeHandoffRunNonce(source.id, delivery),
        leaseOwner: "voice-delivery-test",
        leaseFence: 1,
        leaseExpiresAt: new Date(Date.now() + 600000),
        startedAt: new Date(),
      },
    });
    const attempt = await system.attempt.create({
      data: { runId: run.id, fence: 1, status: "running" },
    });
    const target = { callId, botId, threadId };
    return {
      run,
      target,
      redirect: () => sendRealtimeTaskToChat({ prisma }, actor, target, run.id),
      finish: (steps = true) =>
        runAsTenant(actor, () =>
          finalizeRun(prisma, {
            spaceId: actor.spaceId,
            botId,
            threadId,
            runId: run.id,
            taskId: task.id,
            attemptId: attempt.id,
            leaseOwner: "voice-delivery-test",
            leaseFence: 1,
            outcome: "completed",
            blocks: [
              ...(steps
                ? [{ kind: "steps" as const, steps: [{ label: "Web search", count: 1 }] }]
                : []),
              ...(delivery === "chat"
                ? [{ kind: "text" as const, text: "The original result" }]
                : []),
            ],
            ...(delivery === "voice" ? { spokenResult: "The original result" } : {}),
          }),
        ),
      async expectOneResult() {
        const messages = await system.message.findMany({
          where: { runId: run.id },
          select: { blocks: true },
        });
        expect(
          messages
            .flatMap((m) => m.blocks as Array<{ kind: string; text?: string }>)
            .filter((b) => b.kind === "text"),
        ).toEqual([{ kind: "text", text: "The original result" }]);
        expect(await system.run.count({ where: { taskId: task.id } })).toBe(1);
        expect((await system.task.findUniqueOrThrow({ where: { id: task.id } })).prompt).toBe(
          "The original request",
        );
      },
    };
  }
  it("updates an already-chat task without starting or posting a second copy", async () => {
    const f = await fixture("chat");
    await Promise.all([f.redirect(), f.redirect()]);
    await f.finish();
    expect(await f.redirect()).toEqual({ status: "already_in_chat" });
    await f.expectOneResult();
  });
  it("redirects a voice worker that already started, including after the call closes", async () => {
    const f = await fixture();
    expect(await f.redirect()).toEqual({ status: "will_post_in_chat" });
    await f.redirect();
    await f.finish();
    await f.expectOneResult();
    expect(await f.redirect()).toEqual({ status: "already_in_chat" });
  });
  it.each([true, false])(
    "posts a completed voice result once (existing activity: %s)",
    async (steps) => {
      const f = await fixture();
      await f.finish(steps);
      const results = await Promise.all([f.redirect(), f.redirect(), f.redirect()]);
      expect(results.filter((r) => r.status === "posted_in_chat")).toHaveLength(1);
      expect(results.filter((r) => r.status === "already_in_chat")).toHaveLength(2);
      await f.expectOneResult();
    },
  );
  it("does not mistake an earlier progress note for a delivered answer", async () => {
    const f = await fixture();
    await createThreadMessage(system, {
      threadId,
      botId,
      runId: f.run.id,
      role: "bot",
      clientNonce: `user-progress:${randomUUID()}`,
      blocks: [{ kind: "text", text: "Earlier progress note" }],
    });
    await f.finish();
    expect(await f.redirect()).toEqual({ status: "posted_in_chat" });
    expect(await f.redirect()).toEqual({ status: "already_in_chat" });
    const messages = await system.message.findMany({
      where: { runId: f.run.id },
      select: { blocks: true },
    });
    const texts = messages
      .flatMap((m) => m.blocks as Array<{ kind: string; text?: string }>)
      .filter((b) => b.kind === "text")
      .map((b) => b.text);
    expect(texts).toHaveLength(2);
    expect(texts).toContain("Earlier progress note");
    expect(texts).toContain("The original result");
  });

  it("serializes a delivery change racing with completion", async () => {
    const f = await fixture();
    await Promise.all([f.finish(), f.redirect(), f.redirect()]);
    await f.expectOneResult();
  });
  it("rejects a task from another call, bot or owner", async () => {
    const f = await fixture();
    await expect(
      sendRealtimeTaskToChat({ prisma }, actor, { ...f.target, callId: randomUUID() }, f.run.id),
    ).rejects.toBeInstanceOf(IsolationError);
    await expect(
      sendRealtimeTaskToChat({ prisma }, actor, { ...f.target, botId: "other-bot" }, f.run.id),
    ).rejects.toBeInstanceOf(IsolationError);
    await expect(
      sendRealtimeTaskToChat({ prisma }, { ...actor, userId: "other-user" }, f.target, f.run.id),
    ).rejects.toBeInstanceOf(IsolationError);
    await f.finish();
  });
});
