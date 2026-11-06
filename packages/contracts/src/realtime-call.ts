import { z } from "zod";

export const OPENAI_VOICE_PROVIDER_ID = "openai";

export const RealtimeCallModelSchema = z.enum(["gpt-realtime-2.1-mini", "gpt-realtime-2.1"]);

const callId = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);

export const RealtimeCallStartSchema = z.object({
  botId: z.string().min(1).max(128),
  callId,
  model: RealtimeCallModelSchema,
  sdp: z.string().startsWith("v=0").max(60_000),
  opening: z.string().max(2_000).optional(),
});

export const RealtimeCallEndSchema = z.object({ callId });

export type RealtimeCallModel = z.infer<typeof RealtimeCallModelSchema>;
