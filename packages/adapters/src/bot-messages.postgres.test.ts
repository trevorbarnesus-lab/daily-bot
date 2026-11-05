import { createDb, runAsSystem, runAsTenant } from "@rakazo/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { messageBot, returnBotMessageOutcome } from "./bot-messages.js";
import { crossSpaceBotPeers } from "./cross-space-bots.js";

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
  let db: ReturnType<typeof createDb>;
  let owner: ReturnType<typeof createDb>;
  let deps: Parameters<typeof messageBot>[0];

  beforeAll(async () => {
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
      for (const [bot, name, space, organizationId] of [
        [mira, "Mira", "Personal", org],
        [storm, "Storm", "Home Lab", org],
        [duplicate, "storm", "Sandbox", org],
        [foreignUser, "Storm", "Private", org],
        [foreignOrg, "Storm", "Separate organization", otherOrg],
      ] as const) {
        await p.space.create({ data: { id: bot.spaceId, name: space, organizationId } });
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
    }
  });

  const noBot = { ok: false, error: "no bot found with that id or name" };
  const message = "What will the weather be tomorrow?";
  const send = (address: { bot_id?: string; confirm_name?: string }) =>
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
    expect(await send({ confirm_name: "sToRm" })).toMatchObject({ ok: true, botId: storm.botId });
    const targetRun = await runAsTenant(storm, async () => {
      const nextRun = await db.prisma.run.findFirstOrThrow({
        where: { botId: storm.botId, trigger: "bot_message" },
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
