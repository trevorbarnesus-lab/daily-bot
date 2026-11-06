import type { RealtimeCallModel } from "@rakazo/contracts";
import WebSocket from "ws";

const API = "https://api.openai.com/v1/realtime";
export const REALTIME_CHAT_HANDOFF_TOOL = "use_bot_tools";
export const REALTIME_CHAT_DELIVERY_TOOL = "send_task_to_chat";
export const REALTIME_CHAT_CHECK_TOOL = "check_chat";
const REALTIME_VOICES = new Set([
  "alloy",
  "ash",
  "ballad",
  "cedar",
  "coral",
  "echo",
  "marin",
  "sage",
  "shimmer",
  "verse",
]);

export async function openOpenAIRealtimeCall(input: {
  apiKey: string;
  safetyId: string;
  model: RealtimeCallModel;
  instructions: string;
  voiceId: string;
  offer: string;
  signal: AbortSignal;
  onEvent: (event: unknown) => void;
  onClose: () => void;
}) {
  const headers = { Authorization: `Bearer ${input.apiKey}` };
  const form = new FormData();
  form.set("sdp", input.offer);
  form.set(
    "session",
    JSON.stringify({
      type: "realtime",
      model: input.model,
      instructions: input.instructions,
      output_modalities: ["audio"],
      tools: [
        {
          type: "function",
          name: REALTIME_CHAT_CHECK_TOOL,
          description:
            "Read the latest saved text in this same chat. Use this to check what the caller pasted or what changed in chat. Checks again briefly if no new content has arrived. This only reads messages.",
          parameters: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          type: "function",
          name: REALTIME_CHAT_HANDOFF_TOOL,
          description:
            "Search the web for current information, read public pages, use connected apps, or perform an action through the bot's full tools. You DO have web access through this function, even though web_search and web_fetch are not separate voice functions. Use it for live facts, current conditions, news, schedules, prices, availability, account information, and requested actions. This starts NEW work. For a follow-up that only changes delivery of a queued task, use send_task_to_chat with its task ID instead of starting the work again. Default to voice delivery for questions, lookups, and action confirmations. Use chat delivery for explicitly requested chat posts, drafts, documents, code, or other substantial written work. Start immediately after a brief natural acknowledgment. Tool execution is internal: do not announce a handoff or ask permission to delegate.",
          parameters: {
            type: "object",
            properties: {
              delivery: { type: "string", enum: ["chat", "voice"] },
            },
            required: ["delivery"],
            additionalProperties: false,
          },
        },
        {
          type: "function",
          name: REALTIME_CHAT_DELIVERY_TOOL,
          description:
            "Send an EXISTING task's result to chat once. If it is still running, it continues and posts when done, even after hang-up. Repeated requests reuse that same task and do not post duplicates. Use the task ID returned when work was queued. Call silently: the application gives one confirmation after saving. This never starts new work.",
          parameters: {
            type: "object",
            properties: { task_id: { type: "string" } },
            required: ["task_id"],
            additionalProperties: false,
          },
        },
      ],
      audio: {
        input: {
          transcription: { model: "gpt-live-transcribe" },
          noise_reduction: { type: "near_field" },
          turn_detection: {
            type: "semantic_vad",
            eagerness: "low",
            create_response: true,
            interrupt_response: true,
          },
        },
        output: { voice: REALTIME_VOICES.has(input.voiceId) ? input.voiceId : "marin" },
      },
    }),
  );
  const response = await fetch(`${API}/calls`, {
    method: "POST",
    headers: { ...headers, "OpenAI-Safety-Identifier": input.safetyId },
    body: form,
    signal: AbortSignal.any([input.signal, AbortSignal.timeout(15_000)]),
    redirect: "error",
  });
  if (!response.ok) {
    await response.body?.cancel();
    if (response.status === 401 || response.status === 403) {
      throw new Error("Check the OpenAI key and its Realtime API access in Voice settings.");
    }
    if (response.status === 429) throw new Error("OpenAI Realtime reached its usage limit.");
    throw new Error(`OpenAI could not start the call (HTTP ${response.status}).`);
  }
  const id = response.headers.get("location")?.match(/(?:^|\/)(rtc_[\w-]+)$/)?.[1];
  if (!id) {
    await response.body?.cancel();
    throw new Error("OpenAI did not return a Realtime call ID.");
  }
  const end = async () => {
    const ended = await fetch(`${API}/calls/${id}/hangup`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(5_000),
      redirect: "error",
    });
    await ended.body?.cancel();
  };
  const socket = new WebSocket(`wss://api.openai.com/v1/realtime?call_id=${id}`, {
    headers,
    handshakeTimeout: 5_000,
    maxPayload: 2 * 1024 * 1024,
  });
  socket.on("message", (data) => {
    let event: unknown;
    try {
      event = JSON.parse(data.toString());
    } catch {
      return;
    }
    input.onEvent(event);
  });
  socket.on("error", () => socket.terminate());
  socket.once("close", input.onClose);
  let sdp: string;
  try {
    [, sdp] = await Promise.all([
      new Promise<void>((resolve, reject) => {
        socket.once("open", resolve);
        socket.once("close", () => reject(new Error("Could not connect the call transcript.")));
      }),
      response.text(),
    ]);
    input.signal.throwIfAborted();
  } catch (error) {
    socket.terminate();
    await end().catch(() => undefined);
    throw error;
  }
  return {
    sdp,
    send(event: object) {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event));
    },
    async close() {
      try {
        await end();
      } finally {
        // Drain provider events before the API finalizes the local transcript.
        if (socket.readyState !== WebSocket.CLOSED) {
          await new Promise<void>((resolve) => {
            const timer = setTimeout(() => socket.terminate(), 1_000);
            socket.once("close", () => {
              clearTimeout(timer);
              resolve();
            });
            socket.close();
          });
        }
      }
    },
  };
}
