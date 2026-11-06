import type { Actor } from "@rakazo/contracts";
import type { PrismaClient } from "@rakazo/db";
import { afterEach, expect, it, vi } from "vitest";
import { checkRealtimeChat } from "./realtime-chat-check.js";

const actor = { userId: "user", spaceId: "space" } as Actor;
const target = { threadId: "thread", botId: "bot" };
const pasted = { role: "user", seq: 12, blocks: [{ kind: "text", text: "Newly pasted text." }] };

afterEach(() => vi.useRealTimers());

it("reads the current chat within the caller's bot and space", async () => {
  const findMany = vi.fn().mockResolvedValue([pasted]);
  const prisma = {
    message: { findMany },
    spaceMember: {
      findFirst: vi
        .fn()
        .mockResolvedValue({ ...actor, member: { user: { email: "caller@example.test" } } }),
    },
  } as unknown as PrismaClient;
  const result = await checkRealtimeChat(prisma, actor, target, 11, new AbortController().signal);
  expect(result).toEqual({
    status: "updated",
    latestSeq: 12,
    messages: [{ role: "user", seq: 12, text: "Newly pasted text." }],
  });
  expect(findMany).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      where: {
        threadId: "thread",
        thread: { spaceId: "space", botId: "bot" },
        role: { in: ["user", "bot"] },
        OR: [{ clientNonce: null }, { clientNonce: { not: { startsWith: "call:" } } }],
      },
    }),
  );
});

it("rechecks for a paste that arrives shortly after the spoken request", async () => {
  vi.useFakeTimers();
  const findMany = vi
    .fn()
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([])
    .mockResolvedValue([pasted]);
  const prisma = {
    message: { findMany },
    spaceMember: {
      findFirst: vi
        .fn()
        .mockResolvedValue({ ...actor, member: { user: { email: "caller@example.test" } } }),
    },
  } as unknown as PrismaClient;
  const check = checkRealtimeChat(prisma, actor, target, 11, new AbortController().signal);
  await vi.advanceTimersByTimeAsync(2_000);
  expect((await check).status).toBe("updated");
  expect(findMany).toHaveBeenCalledTimes(3);
});

it("reports a bounded wait without treating missing content as a successful lookup", async () => {
  vi.useFakeTimers();
  const findMany = vi.fn().mockResolvedValue([]);
  const prisma = {
    message: { findMany },
    spaceMember: {
      findFirst: vi
        .fn()
        .mockResolvedValue({ ...actor, member: { user: { email: "caller@example.test" } } }),
    },
  } as unknown as PrismaClient;
  const check = checkRealtimeChat(prisma, actor, target, 11, new AbortController().signal);
  await vi.advanceTimersByTimeAsync(3_000);
  expect(await check).toEqual({ status: "no_new_messages_yet", latestSeq: 11, messages: [] });
  expect(findMany).toHaveBeenCalledTimes(4);
});

it("stops checking when the call ends", async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  const findMany = vi.fn().mockResolvedValue([]);
  const prisma = {
    message: { findMany },
    spaceMember: {
      findFirst: vi
        .fn()
        .mockResolvedValue({ ...actor, member: { user: { email: "caller@example.test" } } }),
    },
  } as unknown as PrismaClient;
  const check = checkRealtimeChat(prisma, actor, target, 11, controller.signal);
  const rejected = expect(check).rejects.toMatchObject({ name: "AbortError" });
  await vi.advanceTimersByTimeAsync(0);
  controller.abort();
  await rejected;
  expect(findMany).toHaveBeenCalledTimes(1);
});
