import { randomUUID } from "node:crypto";
import type { Actor } from "@rakazo/contracts";
import type { PrismaClient } from "@rakazo/db";
import {
  acceptSpaceInvite,
  asSystem,
  createDb,
  createSpaceInvite,
  createThreadMessage,
  provisionMessagingIdentity,
  runAsSystem,
  runAsTenant,
} from "@rakazo/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { callContext } from "./realtime-call.js";
import { checkRealtimeChat } from "./realtime-chat-check.js";
import { startRealtimeChatRun } from "./realtime-chat-handoff.js";
import { sendRealtimeTaskToChat } from "./realtime-task-delivery.js";

const describePostgres =
  process.env.VERIFY_DATABASE === "1" && process.env.DATABASE_URL
    ? describe.sequential
    : describe.skip;
describePostgres("live calls in shared spaces", () => {
  let prisma: PrismaClient, system: PrismaClient, owner: Actor, member: Actor, outsider: Actor;
  let botId: string, threadId: string, close: () => Promise<void>;
  const memberId = randomUUID(),
    outsiderId = randomUUID();
  beforeAll(async () => {
    const db = createDb(process.env.DATABASE_URL!);
    prisma = db.prisma;
    system = asSystem(prisma);
    close = async () => {
      await prisma.$disconnect();
      await db.pool.end();
    };
    const fixture = await runAsSystem("shared call fixture", () =>
      provisionMessagingIdentity(
        prisma,
        { provider: "sendblue", address: `+1555${Math.floor(Math.random() * 9000000 + 1000000)}` },
        { signupsEnabled: undefined, signupAllowlist: undefined },
      ),
    );
    ({ botId, threadId } = fixture);
    owner = { userId: fixture.userId, spaceId: fixture.spaceId } as Actor;
    member = { userId: memberId, spaceId: owner.spaceId } as Actor;
    outsider = { userId: outsiderId, spaceId: owner.spaceId } as Actor;
    await system.user.createMany({
      data: [memberId, outsiderId].map((id) => ({
        id,
        name: "Synthetic caller",
        email: `${id}@example.test`,
      })),
    });
    const invite = await runAsTenant(owner, () => createSpaceInvite(prisma, owner));
    await runAsSystem("accept synthetic shared-space invite", () =>
      acceptSpaceInvite(prisma, { userId: memberId, token: invite.token }),
    );
    await system.memoryDocument.create({
      data: {
        spaceId: owner.spaceId,
        userId: owner.userId,
        botId,
        scope: "bot",
        path: "CALL-TEST.md",
        content: "Synthetic shared context.",
      },
    });
    await createThreadMessage(system, {
      threadId,
      role: "user",
      authorUserId: owner.userId,
      blocks: [{ kind: "text", text: "Synthetic shared chat." }],
    });
  });
  afterAll(async () => {
    try {
      if (owner) {
        await system.organization.deleteMany({ where: { id: owner.spaceId } });
        await system.user.deleteMany({
          where: { id: { in: [owner.userId, memberId, outsiderId] } },
        });
      }
    } finally {
      await close?.();
    }
  });
  it("shares chat context but keeps delegated work and delivery under the caller", async () => {
    const context = await runAsTenant(member, () =>
      callContext({ prisma } as never, member, botId),
    );
    expect(context.instructions).toContain("Synthetic shared context.");
    expect(
      (
        await checkRealtimeChat(
          prisma,
          member,
          { botId, threadId },
          -1,
          new AbortController().signal,
        )
      ).messages,
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ text: "Synthetic shared chat." })]),
    );
    const foreignCall = randomUUID();
    await createThreadMessage(system, {
      threadId,
      role: "user",
      authorUserId: owner.userId,
      clientNonce: `call:${foreignCall}:realtime-user-other-member`,
      blocks: [{ kind: "text", text: "Another member's request." }],
    });
    await expect(
      startRealtimeChatRun(
        { prisma, jobs: { enqueue: vi.fn() } },
        member,
        { botId, threadId, callId: foreignCall },
        "other-member",
        new AbortController().signal,
      ),
    ).rejects.toThrow("Caller transcript belongs to another member.");
    const callId = randomUUID(),
      itemId = "synthetic-item";
    await runAsTenant(member, () =>
      createThreadMessage(prisma, {
        threadId,
        role: "user",
        authorUserId: memberId,
        clientNonce: `call:${callId}:realtime-user-${itemId}`,
        blocks: [{ kind: "text", text: "Look up a synthetic public fact." }],
      }),
    );
    const run = await startRealtimeChatRun(
      { prisma, jobs: { enqueue: vi.fn().mockResolvedValue(undefined) } },
      member,
      { botId, threadId, callId },
      itemId,
      new AbortController().signal,
    );
    expect(
      await system.run.findUnique({ where: { id: run.id }, select: { userId: true } }),
    ).toEqual({ userId: memberId });
    await expect(
      sendRealtimeTaskToChat({ prisma }, owner, { botId, threadId, callId }, run.id),
    ).rejects.toThrow();
    await expect(
      sendRealtimeTaskToChat({ prisma }, member, { botId, threadId, callId }, run.id),
    ).resolves.toEqual({ status: "will_post_in_chat" });
  });
  it("revokes a call's access when its caller leaves the shared space", async () => {
    await system.spaceMember.delete({
      where: { spaceId_userId: { spaceId: owner.spaceId, userId: memberId } },
    });
    await expect(
      checkRealtimeChat(prisma, member, { botId, threadId }, -1, new AbortController().signal),
    ).rejects.toThrow();
    await expect(
      startRealtimeChatRun(
        { prisma, jobs: { enqueue: vi.fn() } },
        member,
        { botId, threadId, callId: "closed" },
        "item",
        new AbortController().signal,
      ),
    ).rejects.toThrow();
    await expect(
      sendRealtimeTaskToChat({ prisma }, member, { botId, threadId, callId: "closed" }, "run"),
    ).rejects.toThrow();
  });
  it("does not expose the shared bot to a nonmember", async () => {
    await expect(
      runAsTenant(outsider, () => callContext({ prisma } as never, outsider, botId)),
    ).rejects.toThrow();
  });
});
