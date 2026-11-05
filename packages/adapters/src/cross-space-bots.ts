import type { Prisma, PrismaClient } from "@rakazo/db";
import { runAsSystem } from "@rakazo/db";

type BotMessageScope = { botId: string; spaceId: string; userId: string };

export function crossSpacePeerWhere(
  scope: BotMessageScope,
  organizationId: string,
): Prisma.BotWhereInput {
  return {
    spaceId: { not: scope.spaceId },
    space: { organizationId, deletingAt: null },
    userId: scope.userId,
    archivedAt: null,
    crossSpaceCommunication: true,
    thread: { isNot: null },
  };
}

export async function senderOrganization(
  prisma: Pick<PrismaClient, "bot">,
  scope: BotMessageScope,
) {
  const sender = await prisma.bot.findFirst({
    where: {
      id: scope.botId,
      spaceId: scope.spaceId,
      userId: scope.userId,
      archivedAt: null,
      crossSpaceCommunication: true,
      space: { deletingAt: null },
    },
    select: { space: { select: { organizationId: true } } },
  });
  return sender?.space?.organizationId;
}

export async function crossSpaceBotPeers(
  prisma: PrismaClient,
  scope: BotMessageScope,
  address: Prisma.BotWhereInput,
  take: number,
) {
  if (take <= 0) return [];
  const organizationId = await senderOrganization(prisma, scope);
  if (!organizationId) return [];

  return runAsSystem("Daily Bot same-owner peer lookup across spaces", () =>
    prisma.bot.findMany({
      where: { AND: [crossSpacePeerWhere(scope, organizationId), address] },
      select: {
        id: true,
        name: true,
        description: true,
        spaceId: true,
        space: { select: { name: true } },
        thread: { select: { id: true } },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take,
    }),
  );
}
