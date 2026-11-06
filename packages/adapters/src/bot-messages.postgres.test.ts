import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDb, runAsSystem, runAsTenant } from "@rakazo/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createArtifactStore } from "./artifact-store-factory.js";
import { messageBot, returnBotMessageOutcome } from "./bot-messages.js";
import { crossSpaceBotPeers } from "./cross-space-bots.js";
import type { RunContext } from "./run-context.js";
import type { ToolCall } from "./run-tool-gate.js";
import { saveWorkspaceFile } from "./run-tools-files.js";

const runtimeUrl = process.env.DATABASE_URL;
const ownerUrl = process.env.DATABASE_MIGRATION_URL;
const describePostgres =
  process.env.VERIFY_DATABASE && runtimeUrl && ownerUrl && runtimeUrl !== ownerUrl
    ? describe.sequential
    : describe.skip;

describePostgres("Daily Bot messaging across spaces", () => {
  const org = "daily-bot-test-org";
  const otherOrg = "daily-bot-test-other-org";
  const userId = "daily-bot-test-owner";
  const otherUser = "daily-bot-test-other-owner";
  const scope = (name: string, owner = userId) => ({
    botId: `bot-${name}`,
    threadId: `thread-${name}`,
    spaceId: `space-${name}`,
    userId: owner,
  });
  const mira = scope("mira");
  const storm = scope("storm");
  const duplicate = scope("duplicate");
  const foreignUser = scope("other-user", otherUser);
  const foreignOrg = scope("other-org");
  const sender = { id: mira.botId, name: "Mira" };
  const run = { ...mira, id: "run-mira" };
  let artifactDirectory: string;
  let db: ReturnType<typeof createDb>;
  let owner: ReturnType<typeof createDb>;
  let deps: Parameters<typeof messageBot>[0];

  beforeAll(async () => {
    artifactDirectory = await mkdtemp(join(tmpdir(), "dailybot-cross-files-"));
    db = createDb(runtimeUrl!, { encryptContent: true });
    owner = createDb(ownerUrl!, { encryptContent: true });
    deps = {
      prisma: db.prisma,
      events: { notify: vi.fn().mockResolvedValue(undefined) },
      jobs: { enqueue: vi.fn().mockResolvedValue(undefined) },
    };
    await runAsSystem("seed Daily Bot messaging test", async () => {
      const p = owner.prisma;
      for (const id of [org, otherOrg]) {
        await p.organization.create({ data: { id, name: id, slug: id, createdAt: new Date() } });
      }
      for (const id of [userId, otherUser]) {
        await p.user.create({ data: { id, name: id, email: `${id}@example.test` } });
      }
      for (const organizationId of [org, otherOrg]) {
        for (const userId of ["daily-bot-test-owner", otherUser])
          await p.member.create({
            data: {
              id: `${organizationId}-${userId}`,
              organizationId,
              userId,
              role: "owner",
              createdAt: new Date(),
            },
          });
      }
      for (const [bot, name, space, organizationId] of [
        [mira, "Mira", "Personal", org],
        [storm, "Storm", "Home Lab", org],
        [duplicate, "storm", "Sandbox", org],
        [foreignUser, "Storm", "Private", org],
        [foreignOrg, "Storm", "Separate organization", otherOrg],
      ] as const) {
        await p.space.create({ data: { id: bot.spaceId, name: space, organizationId } });
        await p.spaceMember.create({
          data: {
            id: `member-${bot.spaceId}`,
            organizationId,
            spaceId: bot.spaceId,
            userId: bot.userId,
            role: "owner",
            createdAt: new Date(),
          },
        });
        await p.bot.create({
          data: {
            id: bot.botId,
            spaceId: bot.spaceId,
            userId: bot.userId,
            name,
            description: "Handles weather",
            color: "#000",
            crossSpaceCommunication: bot !== duplicate,
          },
        });
        await p.thread.create({
          data: { id: bot.threadId, spaceId: bot.spaceId, userId: bot.userId, botId: bot.botId },
        });
      }
      const data = { ...mira, status: "running" as const };
      const task = await p.task.create({
        data: { ...data, status: "queued", prompt: "Delegate a task" },
      });
      await p.run.create({
        data: { ...data, id: run.id, taskId: task.id, trigger: "created" },
      });
    });
  });

  afterAll(async () => {
    try {
      await runAsSystem("clean up Daily Bot messaging test", async () => {
        await owner?.prisma.organization.deleteMany({ where: { id: { in: [org, otherOrg] } } });
        await owner?.prisma.user.deleteMany({ where: { id: { in: [userId, otherUser] } } });
      });
    } finally {
      await Promise.all([owner?.pool.end(), db?.pool.end()]);
      if (artifactDirectory) await rm(artifactDirectory, { recursive: true, force: true });
    }
  });

  const noBot = { ok: false, error: "no bot found with that id or name" };
  const message = "What will the weather be tomorrow?";
  const send = (address: { bot_id?: string; confirm_name?: string; deliveryKey?: string }) =>
    runAsTenant(mira, () => messageBot(deps, run, sender, { ...address, message }));
  const peers = () => runAsTenant(mira, () => crossSpaceBotPeers(db.prisma, mira, {}, 10));
  const toggle = (bot: typeof mira, enabled: boolean) =>
    runAsTenant(bot, () =>
      db.prisma.bot.update({
        where: { id: bot.botId },
        data: { crossSpaceCommunication: enabled },
      }),
    );

  it("shows only eligible peers and uses the saved bot toggle directly", async () => {
    expect(await peers()).toMatchObject([
      { id: storm.botId, space: { name: "Home Lab" }, description: "Handles weather" },
    ]);
    for (const bot of [duplicate, foreignUser, foreignOrg]) {
      expect(await send({ bot_id: bot.botId })).toEqual(noBot);
    }
    await toggle(mira, false);
    try {
      expect(await peers()).toEqual([]);
      expect(await send({ bot_id: storm.botId })).toEqual(noBot);
    } finally {
      await toggle(mira, true);
    }
  });

  it("does not let another shared-space member reach the owner's private bots", async () => {
    await runAsSystem("shared-space member fixture", () =>
      owner.prisma.spaceMember.create({
        data: {
          id: "daily-bot-test-guest",
          organizationId: org,
          spaceId: mira.spaceId,
          userId: otherUser,
          role: "member",
          createdAt: new Date(),
        },
      }),
    );
    const guest = { ...mira, userId: otherUser };
    expect(await runAsTenant(guest, () => crossSpaceBotPeers(db.prisma, guest, {}, 10))).toEqual(
      [],
    );
    expect(
      await runAsTenant(guest, () =>
        messageBot(deps, { ...run, userId: otherUser }, sender, { bot_id: storm.botId, message }),
      ),
    ).toEqual(noBot);
  });

  it("copies an attachment with the destination space key and keeps it out of the source space", async () => {
    const artifacts = createArtifactStore(artifactDirectory, db.prisma, {});
    const bytes = new TextEncoder().encode("Synthetic cross-space attachment.");
    const ctx = { deps: { prisma: db.prisma, artifacts }, run } as unknown as RunContext;
    const saved = await runAsTenant(mira, () =>
      saveWorkspaceFile(ctx, { executionId: "cross-space-file" } as ToolCall, "notes.txt", bytes, {
        botId: storm.botId,
        spaceId: storm.spaceId,
      }),
    );
    const row = await runAsTenant(storm, () =>
      db.prisma.artifact.findUniqueOrThrow({ where: { id: saved.artifactId } }),
    );
    expect(row).toMatchObject({ spaceId: storm.spaceId, botId: storm.botId, userId });
    expect(
      await runAsTenant(mira, () => db.prisma.artifact.findUnique({ where: { id: row.id } })),
    ).toBeNull();
    const context = {
      ...storm,
      operationId: "read",
      traceId: "read",
      signal: new AbortController().signal,
    };
    expect(await runAsTenant(storm, () => artifacts.get(row.storageKey, context))).toEqual(bytes);
    expect(
      (
        await readFile(join(artifactDirectory, "artifacts", storm.spaceId, row.storageKey))
      ).includes(Buffer.from(bytes)),
    ).toBe(false);
    expect(
      await runAsTenant(mira, () =>
        messageBot(deps, run, sender, {
          bot_id: storm.botId,
          message: "Read the attached notes.",
          files: [saved.block],
          deliveryKey: "cross-space-file",
        }),
      ),
    ).toMatchObject({ ok: true });
    const received = await runAsTenant(storm, () =>
      db.prisma.message.findUniqueOrThrow({
        where: {
          threadId_clientNonce: {
            threadId: storm.threadId,
            clientNonce: "bot-message:cross-space-file",
          },
        },
      }),
    );
    expect(received.blocks).toEqual(expect.arrayContaining([saved.block]));
  });

  it("reports ambiguous cross-space names and allows the exact ID", async () => {
    await toggle(duplicate, true);
    try {
      expect(await send({ confirm_name: "Storm" })).toEqual({
        ok: false,
        error: expect.stringMatching(
          /Use bot_id: .*Home Lab.*Sandbox|Use bot_id: .*Sandbox.*Home Lab/,
        ),
      });
      expect(await send({ bot_id: duplicate.botId })).toMatchObject({
        ok: true,
        botId: duplicate.botId,
      });
    } finally {
      await toggle(duplicate, false);
    }
  });

  it("writes encrypted chat in each space and returns a reply to the sender's chat", async () => {
    expect(await send({ confirm_name: "sToRm", deliveryKey: "return-check" })).toMatchObject({
      ok: true,
      botId: storm.botId,
    });
    const targetRun = await runAsTenant(storm, async () => {
      const nextRun = await db.prisma.run.findFirstOrThrow({
        where: {
          botId: storm.botId,
          trigger: "bot_message",
          sourceMessage: { clientNonce: "bot-message:return-check" },
        },
      });
      const inbound = await db.prisma.message.findUniqueOrThrow({
        where: { id: nextRun.sourceMessageId! },
      });
      expect(inbound).toMatchObject({
        threadId: storm.threadId,
        blocks: [{ kind: "bot_message_received", text: message, fromBotId: mira.botId }],
      });
      const raw = await owner.pool.query("SELECT blocks FROM messages WHERE id = $1", [inbound.id]);
      expect(raw.rows).toHaveLength(1);
      expect(JSON.stringify(raw.rows[0].blocks)).not.toContain(message);
      return db.prisma.run.update({ where: { id: nextRun.id }, data: { status: "completed" } });
    });
    await runAsTenant(mira, async () => {
      expect(
        await db.prisma.message.findUnique({ where: { id: targetRun.sourceMessageId! } }),
      ).toBeNull();
    });
    await runAsTenant(storm, async () => {
      expect(
        await returnBotMessageOutcome(
          deps,
          targetRun,
          { id: storm.botId, name: "Storm" },
          "Sunny.",
        ),
      ).toBe(true);
    });
    await runAsTenant(mira, async () => {
      const received = await db.prisma.message.findFirstOrThrow({
        where: { threadId: mira.threadId, role: "user" },
        include: { replyTo: true },
      });
      expect(received.blocks).toMatchObject([
        { kind: "bot_message_received", text: "Sunny.", hop: 2 },
      ]);
      expect(received.replyTo?.threadId).toBe(mira.threadId);
    });
  });

  it("rechecks the recipient's toggle inside the delivery transaction", async () => {
    const prisma = new Proxy(db.prisma, {
      get(target, key) {
        if (key !== "$transaction") return Reflect.get(target, key);
        // The lookup already found Storm when this transaction is about to open.
        return async (operation: Parameters<typeof target.$transaction>[0]) => {
          await toggle(storm, false);
          return target.$transaction(operation);
        };
      },
    });
    try {
      const before = await runAsTenant(storm, () => db.prisma.message.count());
      expect(
        await runAsTenant(mira, () =>
          messageBot({ ...deps, prisma }, run, sender, { bot_id: storm.botId, message }),
        ),
      ).toEqual(noBot);
      expect(await runAsTenant(storm, () => db.prisma.message.count())).toBe(before);
    } finally {
      await toggle(storm, true);
    }
  });
});
