import { afterEach, expect, it, vi } from "vitest";
import type { ChatUpdate } from "./realtime-chat-handoff.js";
import { createRealtimeChatHandoff } from "./realtime-chat-handoff.js";

afterEach(() => vi.useRealTimers());

function request(
  bridge: ReturnType<typeof createRealtimeChatHandoff>,
  name: string,
  args = {},
  audio = "audio",
) {
  bridge.observe({ type: "input_audio_buffer.committed", item_id: audio }, false);
  bridge.observe(
    { type: "conversation.item.input_audio_transcription.completed", item_id: audio },
    true,
  );
  bridge.observe({ type: "response.created", response: { id: audio } }, false);
  bridge.observe(
    {
      type: "response.done",
      response: {
        id: audio,
        status: "completed",
        output: [
          {
            type: "function_call",
            name,
            call_id: `${audio}-tool`,
            arguments: JSON.stringify(args),
          },
        ],
      },
    },
    false,
  );
}

it("queues work quietly and announces completion once after earlier audio finishes", async () => {
  const send = vi.fn();
  let publish!: (update: { status: "completed"; text: string }) => void;
  const handoff = createRealtimeChatHandoff({
    signal: new AbortController().signal,
    send,
    submit: vi.fn().mockResolvedValue({ id: "run", cursor: 0 }),
    check: vi.fn(),
    sendToChat: vi.fn().mockResolvedValue({ status: "will_post_in_chat" }),
    watch: async (_run, update) => {
      publish = update;
    },
  });
  handoff.observe({ type: "input_audio_buffer.committed", item_id: "audio" }, false);
  handoff.observe(
    {
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "audio",
    },
    true,
  );
  handoff.observe({ type: "response.created", response: { id: "reply" } }, false);
  handoff.observe({ type: "response.output_audio_transcript.delta", delta: "On it." }, false);
  handoff.observe(
    {
      type: "response.done",
      response: {
        id: "reply",
        status: "completed",
        output: [
          {
            type: "function_call",
            name: "use_bot_tools",
            call_id: "tool",
            arguments: '{"delivery":"chat"}',
          },
        ],
      },
    },
    false,
  );
  await vi.waitFor(() => expect(publish).toBeDefined());
  expect(send.mock.calls.filter(([event]) => event.type === "response.create")).toHaveLength(0);
  publish({ status: "completed", text: "The written paragraph is posted." });
  expect(send.mock.calls.filter(([event]) => event.type === "response.create")).toHaveLength(0);
  handoff.observe({ type: "output_audio_buffer.stopped" }, false);
  handoff.observe({ type: "output_audio_buffer.stopped" }, false);
  expect(send.mock.calls.filter(([event]) => event.type === "response.create")).toHaveLength(1);
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "response.create",
      response: expect.objectContaining({
        tool_choice: "none",
        input: [],
        instructions: expect.any(String),
      }),
    }),
  );
  expect(JSON.stringify(send.mock.calls)).not.toContain("The written paragraph is posted.");
});

it("gives one delayed progress notice, then a short completion with no repeat timer", async () => {
  vi.useFakeTimers();
  const send = vi.fn();
  let publish!: (update: ChatUpdate) => void;
  let finish!: () => void;
  const bridge = createRealtimeChatHandoff({
    signal: new AbortController().signal,
    send,
    submit: vi.fn().mockResolvedValue({ id: "run", cursor: 0 }),
    check: vi.fn(),
    sendToChat: vi.fn().mockResolvedValue({ status: "will_post_in_chat" }),
    watch: async (_run, update) => {
      publish = update;
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
    },
  });
  request(bridge, "use_bot_tools", { delivery: "chat" });
  await vi.advanceTimersByTimeAsync(3_999);
  expect(send.mock.calls.filter(([event]) => event.type === "response.create")).toHaveLength(0);
  await vi.advanceTimersByTimeAsync(1);
  const progress = send.mock.calls.find(([event]) => event.type === "response.create")![0];
  expect(progress.response.input).toEqual([]);
  bridge.observe(
    {
      type: "response.created",
      response: { id: "progress", metadata: progress.response.metadata },
    },
    false,
  );
  bridge.observe(
    { type: "response.done", response: { id: "progress", status: "completed", output: [] } },
    false,
  );
  bridge.observe({ type: "output_audio_buffer.stopped" }, false);
  publish({ status: "completed", text: "A lengthy written result." });
  finish();
  await vi.advanceTimersByTimeAsync(20_000);
  expect(send.mock.calls.filter(([event]) => event.type === "response.create")).toHaveLength(2);
  expect(JSON.stringify(send.mock.calls)).not.toContain("A lengthy written result.");
});

it("returns delegated lookup evidence for a short spoken answer", async () => {
  const send = vi.fn();
  const bridge = createRealtimeChatHandoff({
    signal: new AbortController().signal,
    send,
    check: vi.fn(),
    sendToChat: vi.fn().mockResolvedValue({ status: "will_post_in_chat" }),
    submit: vi.fn().mockResolvedValue({ id: "run", cursor: 0 }),
    watch: async (_run, publish) =>
      publish({ status: "completed", text: "Synthetic forecast evidence." }),
  });
  request(bridge, "use_bot_tools", { delivery: "voice" });
  await vi.waitFor(() =>
    expect(send.mock.calls.some(([event]) => event.type === "response.create")).toBe(true),
  );
  const response = send.mock.calls.find(([event]) => event.type === "response.create")![0].response;
  expect(response.input).toEqual([]);
  expect(response.instructions).toContain(JSON.stringify("Synthetic forecast evidence."));
});

it("defaults every delegated tool request to voice and pins it to the original audio", async () => {
  const send = vi.fn();
  const submit = vi.fn().mockResolvedValue({ id: "run", cursor: 0 });
  const bridge = createRealtimeChatHandoff({
    signal: new AbortController().signal,
    send,
    submit,
    check: vi.fn(),
    sendToChat: vi.fn().mockResolvedValue({ status: "will_post_in_chat" }),
    watch: async () => undefined,
  });
  request(bridge, "use_bot_tools", {}, "first");
  bridge.observe({ type: "input_audio_buffer.committed", item_id: "second" }, false);
  bridge.observe(
    { type: "conversation.item.input_audio_transcription.completed", item_id: "second" },
    true,
  );
  await vi.waitFor(() => expect(submit).toHaveBeenCalledExactlyOnceWith("first", "voice"));
  expect(send.mock.calls.filter(([event]) => event.type === "response.create")).toHaveLength(0);
});

it("updates the existing task across follow-up turns without another submit or watcher", async () => {
  const submit = vi.fn().mockResolvedValue({ id: "original", cursor: 0 });
  const sendToChat = vi.fn().mockResolvedValue({ status: "will_post_in_chat" });
  let publish!: (update: ChatUpdate) => void;
  const watch = vi.fn(async (_run, update) => {
    publish = update;
  });
  const send = vi.fn();
  const bridge = createRealtimeChatHandoff({
    signal: new AbortController().signal,
    submit,
    sendToChat,
    watch,
    send,
    check: vi.fn(),
  });
  request(bridge, "use_bot_tools", { delivery: "voice" }, "question");
  await vi.waitFor(() => expect(publish).toBeDefined());
  request(bridge, "send_task_to_chat", { task_id: "original" }, "hang-up");
  await vi.waitFor(() => expect(sendToChat).toHaveBeenCalledTimes(1));
  request(bridge, "send_task_to_chat", { task_id: "original" }, "confirmation");
  await vi.waitFor(() => expect(sendToChat).toHaveBeenCalledTimes(2));
  publish({ status: "completed", text: "The original answer." });
  await vi.waitFor(() =>
    expect(send.mock.calls.filter(([e]) => e.type === "response.create")).toHaveLength(1),
  );
  expect(submit).toHaveBeenCalledExactlyOnceWith("question", "voice");
  expect(watch).toHaveBeenCalledOnce();
  expect(JSON.stringify(send.mock.calls)).not.toContain("The original answer.");
});

it("also reuses a task ID supplied to the ordinary work tool", async () => {
  const submit = vi.fn().mockResolvedValue({ id: "original", cursor: 0 });
  const sendToChat = vi.fn().mockResolvedValue({ status: "will_post_in_chat" });
  const bridge = createRealtimeChatHandoff({
    signal: new AbortController().signal,
    submit,
    sendToChat,
    watch: vi.fn(),
    send: vi.fn(),
    check: vi.fn(),
  });
  request(bridge, "use_bot_tools", { delivery: "chat" }, "question");
  await vi.waitFor(() => expect(submit).toHaveBeenCalledOnce());
  request(bridge, "use_bot_tools", { delivery: "chat", task_id: "original" }, "repeat");
  await vi.waitFor(() => expect(sendToChat).toHaveBeenCalledWith("original"));
  expect(submit).toHaveBeenCalledOnce();
});

it("does not redirect unknown tasks or merge unrelated requests", async () => {
  const submit = vi.fn().mockResolvedValue({ id: "run", cursor: 0 });
  const sendToChat = vi.fn();
  const bridge = createRealtimeChatHandoff({
    signal: new AbortController().signal,
    submit,
    sendToChat,
    watch: vi.fn(),
    send: vi.fn(),
    check: vi.fn(),
  });
  request(bridge, "send_task_to_chat", { task_id: "other-call" }, "unknown");
  expect(sendToChat).not.toHaveBeenCalled();
  request(bridge, "use_bot_tools", { delivery: "chat" }, "first-new-task");
  request(bridge, "use_bot_tools", { delivery: "voice" }, "different-new-task");
  await vi.waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
});

it("waits for a delivery change racing with completion and confirms only the committed destination", async () => {
  const send = vi.fn();
  let publish!: (update: ChatUpdate) => void;
  let commit!: (value: { status: "posted_in_chat" }) => void;
  const sendToChat = vi.fn(
    () =>
      new Promise<{ status: "posted_in_chat" }>((resolve) => {
        commit = resolve;
      }),
  );
  const submit = vi.fn().mockResolvedValue({ id: "original", cursor: 0 });
  const bridge = createRealtimeChatHandoff({
    signal: new AbortController().signal,
    send,
    submit,
    sendToChat,
    check: vi.fn(),
    watch: async (_run, update) => {
      publish = update;
    },
  });
  request(bridge, "use_bot_tools", { delivery: "voice" }, "question");
  await vi.waitFor(() => expect(publish).toBeDefined());
  request(bridge, "send_task_to_chat", { task_id: "original" }, "redirect");
  await vi.waitFor(() => expect(commit).toBeDefined());
  publish({ status: "completed", text: "Saved result, not a second lookup." });
  expect(send.mock.calls.filter(([e]) => e.type === "response.create")).toHaveLength(0);
  commit({ status: "posted_in_chat" });
  await vi.waitFor(() =>
    expect(send.mock.calls.filter(([e]) => e.type === "response.create")).toHaveLength(1),
  );
  expect(JSON.stringify(send.mock.calls)).not.toContain("Saved result, not a second lookup.");
  expect(submit).toHaveBeenCalledOnce();
});

it.each([
  { delivery: "voice", task_id: "" },
  { delivery: "chat", task_id: "" },
  { delivery: "voice", task_id: "   " },
  { delivery: "chat", task_id: "   " },
  { delivery: "voice", task_id: null },
  { delivery: "chat", task_id: null },
])("starts new work for a blank optional task ID: %j", async (args) => {
  const submit = vi.fn().mockResolvedValue({ id: "new-task", cursor: 0 });
  const sendToChat = vi.fn();
  const send = vi.fn();
  const watch = vi.fn();
  const bridge = createRealtimeChatHandoff({
    signal: new AbortController().signal,
    submit,
    sendToChat,
    send,
    watch,
    check: vi.fn(),
  });
  request(bridge, "use_bot_tools", {
    ...args,
    parameters: { query: "A public information lookup" },
  });
  await vi.waitFor(() => expect(watch).toHaveBeenCalledOnce());
  expect(submit).toHaveBeenCalledExactlyOnceWith("audio", args.delivery);
  expect(sendToChat).not.toHaveBeenCalled();
  const output = send.mock.calls.find(([event]) => event.item?.type === "function_call_output")![0];
  expect(JSON.parse(output.item.output)).toEqual({ status: "queued", task: "new-task" });
});

it("does not invent a capability explanation for an unknown existing task", () => {
  const submit = vi.fn();
  const send = vi.fn();
  const bridge = createRealtimeChatHandoff({
    signal: new AbortController().signal,
    submit,
    send,
    sendToChat: vi.fn(),
    watch: vi.fn(),
    check: vi.fn(),
  });
  request(bridge, "use_bot_tools", { delivery: "voice", task_id: "unknown-task" });
  expect(submit).not.toHaveBeenCalled();
  const output = send.mock.calls.find(([event]) => event.item?.type === "function_call_output")![0];
  expect(JSON.parse(output.item.output)).toEqual({ status: "unknown_task" });
  const response = send.mock.calls.find(([event]) => event.type === "response.create")![0];
  expect(response.response).toMatchObject({ input: [], tool_choice: "none" });
});
