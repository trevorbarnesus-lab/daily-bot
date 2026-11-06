import type { Actor, MessageBlock } from "@rakazo/contracts";
import {
  isRealtimeVoiceHandoffRunNonce,
  realtimeHandoffRunNonce,
  realtimeUserTranscriptPrefix,
} from "@rakazo/core";
import type { PrismaClient, ThreadEvents } from "@rakazo/db";
import {
  appendEventInTransaction,
  createThreadMessageInTransaction,
  IsolationError,
  requireMembership,
  runAsTenant,
  THREAD_LOCK_TRANSACTION_OPTIONS,
  withTransactionRetry,
} from "@rakazo/db";
import { getLogger } from "@rakazo/logging";

export type ChatDeliveryResult = {
  status: "will_post_in_chat" | "already_in_chat" | "posted_in_chat";
};

/** Change delivery of this call's existing task; never enqueue or repeat its work. */
export async function sendRealtimeTaskToChat(
  deps: { prisma: PrismaClient; events?: Pick<ThreadEvents, "notify"> },
  actor: Actor,
  target: { threadId: string; botId: string; callId: string },
  runId: string,
): Promise<ChatDeliveryResult> {
  const outcome: ChatDeliveryResult & { seq?: number } = await runAsTenant(actor, async () => {
    await requireMembership(deps.prisma, actor.userId, actor.spaceId);
    return withTransactionRetry(() =>
      deps.prisma.$transaction(async (tx) => {
        // Completion uses this same lock, so redirect-before-completion and redirect-after-
        // completion cannot both publish a result.
        await tx.$queryRaw`SELECT id FROM threads WHERE id = ${target.threadId} FOR UPDATE`;
        const run = await tx.run.findFirst({
          where: {
            id: runId,
            userId: actor.userId,
            spaceId: actor.spaceId,
            threadId: target.threadId,
            botId: target.botId,
            sourceMessage: {
              role: "user",
              threadId: target.threadId,
              clientNonce: { startsWith: realtimeUserTranscriptPrefix(target.callId) },
            },
          },
          select: { id: true, status: true, clientNonce: true, sourceMessageId: true },
        });
        if (
          !run?.sourceMessageId ||
          ![
            realtimeHandoffRunNonce(run.sourceMessageId, "voice"),
            realtimeHandoffRunNonce(run.sourceMessageId, "chat"),
          ].includes(run.clientNonce ?? "")
        )
          throw new IsolationError();
        if (["failed", "cancelled"].includes(run.status))
          throw new Error("This task did not complete. It has not been restarted.");
        if (isRealtimeVoiceHandoffRunNonce(run.clientNonce))
          await tx.run.update({
            where: { id: run.id },
            data: { clientNonce: realtimeHandoffRunNonce(run.sourceMessageId, "chat") },
          });
        if (run.status !== "completed") return { status: "will_post_in_chat" as const };

        const saved = await tx.message.findMany({
          where: {
            threadId: target.threadId,
            role: "bot",
            runId,
            // Interim narration is not the task's final result.
            OR: [{ clientNonce: null }, { clientNonce: `realtime-task-result:${runId}` }],
          },
          orderBy: { seq: "desc" },
          select: { id: true, blocks: true },
        });
        if (
          saved.some((m) =>
            (m.blocks as MessageBlock[]).some((b) => b.kind === "text" && b.text.trim()),
          )
        )
          return { status: "already_in_chat" as const };
        const completed = await tx.event.findFirst({
          where: { threadId: target.threadId, runId, type: "run.completed" },
          orderBy: { seq: "desc" },
          select: { payload: true },
        });
        const text = (completed?.payload as { spokenResult?: unknown } | undefined)?.spokenResult;
        if (typeof text !== "string" || !text.trim())
          throw new Error("This task has no saved answer to post. It has not been restarted.");
        const existing = saved.find((m) =>
          (m.blocks as MessageBlock[]).every((b) => b.kind === "steps"),
        );
        const blocks: MessageBlock[] = [
          ...((existing?.blocks as MessageBlock[]) ?? []),
          { kind: "text", text },
        ];
        const message = existing
          ? await tx.message.update({ where: { id: existing.id }, data: { blocks } })
          : await createThreadMessageInTransaction(tx, {
              threadId: target.threadId,
              botId: target.botId,
              role: "bot",
              blocks,
              runId,
              clientNonce: `realtime-task-result:${runId}`,
            });
        // This is a user-requested delivery of an already finished task, not a worker write.
        if (existing)
          await tx.thread.update({ where: { id: target.threadId }, data: { unread: true } });
        const event = await appendEventInTransaction(tx, {
          spaceId: actor.spaceId,
          threadId: target.threadId,
          botId: target.botId,
          runId,
          type: existing ? "thread.message.updated" : "thread.message.created",
          payload: { messageId: message.id, role: "bot", blocks },
        });
        return { status: "posted_in_chat" as const, seq: event.seq };
      }, THREAD_LOCK_TRANSACTION_OPTIONS),
    );
  });
  if (outcome.seq !== undefined)
    await deps.events?.notify(target.threadId, outcome.seq).catch(() => {
      getLogger().warn("Could not notify live call task delivery immediately.");
    });
  return { status: outcome.status };
}
