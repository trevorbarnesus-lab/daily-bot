import { setTimeout as delay } from "node:timers/promises";
import type { Actor, MessageBlock } from "@rakazo/contracts";
import type { PrismaClient } from "@rakazo/db";
import { requireMembership, runAsTenant } from "@rakazo/db";

/** Recheck saved chat text briefly while the caller finishes pasting. */
export async function checkRealtimeChat(
  prisma: PrismaClient,
  actor: Actor,
  target: { threadId: string; botId: string },
  afterSeq: number,
  signal: AbortSignal,
) {
  return runAsTenant(actor, async () => {
    for (let attempt = 0; ; attempt++) {
      signal.throwIfAborted();
      await requireMembership(prisma, actor.userId, actor.spaceId);
      const rows = await prisma.message.findMany({
        where: {
          threadId: target.threadId,
          thread: { spaceId: actor.spaceId, botId: target.botId },
          role: { in: ["user", "bot"] },
          OR: [{ clientNonce: null }, { clientNonce: { not: { startsWith: "call:" } } }],
        },
        select: { role: true, seq: true, blocks: true },
        orderBy: { seq: "desc" },
        take: 8,
      });
      const messages = rows.flatMap((row) => {
        const text = ((row.blocks ?? []) as MessageBlock[])
          .filter((block) => block.kind === "text")
          .map((block) => block.text)
          .join("\n")
          .trim()
          .slice(0, 2_000);
        return text ? [{ role: row.role, seq: row.seq, text }] : [];
      });
      const latestSeq = messages[0]?.seq ?? afterSeq;
      if (latestSeq > afterSeq || attempt === 3) {
        return {
          status: latestSeq > afterSeq ? "updated" : "no_new_messages_yet",
          latestSeq,
          messages: messages.reverse(),
        };
      }
      await delay(1_000, undefined, { signal });
    }
  });
}
