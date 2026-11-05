import type { RealtimeCallModel } from "@rakazo/contracts";
import { RealtimeCallModelSchema } from "@rakazo/contracts";

export const SIGNED_IN_USER_KEY = "rakazo.signedInUser";
const CHAT_MODEL = "chat";

function preferenceKey(botId?: string) {
  const user = localStorage.getItem(SIGNED_IN_USER_KEY);
  if (!user) return null;
  return botId
    ? `dailybot.botRealtimeCallModel.${JSON.stringify([user, botId])}`
    : `dailybot.realtimeCallModel.${user}`;
}

function readPreference(botId?: string): string | null {
  try {
    const key = preferenceKey(botId);
    return key ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

export function readBotRealtimeCallChoice(botId: string): RealtimeCallModel | "chat" | "" {
  const value = readPreference(botId);
  return value === CHAT_MODEL ? CHAT_MODEL : (RealtimeCallModelSchema.safeParse(value).data ?? "");
}

export function readRealtimeCallModel(botId?: string): RealtimeCallModel | undefined {
  const override = botId ? readBotRealtimeCallChoice(botId) : "";
  if (override) return override === CHAT_MODEL ? undefined : override;
  return RealtimeCallModelSchema.safeParse(readPreference()).data;
}

export function saveRealtimeCallModel(value: string, botId?: string): boolean {
  try {
    const key = preferenceKey(botId);
    if (!key) return false;
    if (!value) localStorage.removeItem(key);
    else if ((botId && value === CHAT_MODEL) || RealtimeCallModelSchema.safeParse(value).success)
      localStorage.setItem(key, value);
    else return false;
    return true;
  } catch {
    return false;
  }
}
