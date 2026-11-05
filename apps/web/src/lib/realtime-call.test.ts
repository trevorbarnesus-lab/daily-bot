// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { startRealtimeCall } from "./realtime-call.js";

const { ring, stopRing } = vi.hoisted(() => ({ ring: vi.fn(), stopRing: vi.fn() }));
vi.mock("./call-pickup.js", () => ({
  MIN_RING_MS: 2_000,
  startRingback: () => {
    ring();
    return { stop: stopRing };
  },
}));
vi.mock("./rpc.js", () => ({ withSpaceHeaders: (headers: object) => headers }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.clearAllMocks();
});

function setup(opening?: string) {
  vi.useFakeTimers();
  const track = { enabled: true, stop: vi.fn() };
  const channel = {
    readyState: "connecting",
    onopen: undefined as (() => void) | undefined,
    send: vi.fn(),
  };
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [track],
        getAudioTracks: () => [track],
      }),
    },
  });
  vi.stubGlobal(
    "RTCPeerConnection",
    class {
      addTrack() {}
      createDataChannel() {
        return channel;
      }
      async createOffer() {
        return { sdp: "v=0\r\n" };
      }
      async setLocalDescription() {}
      async setRemoteDescription() {}
      close() {}
    },
  );
  const fetch = vi.fn(async (url: string, _init?: RequestInit) =>
    url.endsWith("/start")
      ? new Response("v=0\r\n", { headers: { "X-Call-Greeting": encodeURIComponent("Hi Casey.") } })
      : new Response(null, { status: 204 }),
  );
  vi.stubGlobal("fetch", fetch);
  const call = startRealtimeCall({
    botId: "bot",
    callId: "call",
    model: "gpt-realtime-2.1-mini",
    spaceId: null,
    opening,
    onEvent: vi.fn(),
    onFailure: vi.fn(),
  });
  return { call, channel, track, fetch };
}

it("rings before pickup and requests one greeting after the live channel connects", async () => {
  const { call, channel, track } = setup();
  await vi.advanceTimersByTimeAsync(0);
  expect(ring).toHaveBeenCalledOnce();
  expect(track.enabled).toBe(false);
  channel.readyState = "open";
  channel.onopen?.();
  await vi.advanceTimersByTimeAsync(1_999);
  expect(channel.send).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  await call.ready;
  expect(stopRing).toHaveBeenCalled();
  expect(track.enabled).toBe(true);
  expect(channel.send).toHaveBeenCalledOnce();
  expect(JSON.parse(channel.send.mock.calls[0]![0])).toMatchObject({
    type: "response.create",
    response: { tool_choice: "none", instructions: expect.stringContaining("Hi Casey.") },
  });
  await call.close();
  expect(track.stop).toHaveBeenCalled();
});

it("skips ringback for an answered incoming call and preserves its opening", async () => {
  const { call, channel, track, fetch } = setup("Hello from your bot.");
  await vi.advanceTimersByTimeAsync(0);
  call.mute(true);
  channel.readyState = "open";
  channel.onopen?.();
  await call.ready;
  expect(ring).not.toHaveBeenCalled();
  expect(track.enabled).toBe(false);
  expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string).opening).toBe("Hello from your bot.");
  call.mute(false);
  expect(track.enabled).toBe(true);
  await call.close();
});

it("releases the microphone and ringback if hung up before connecting", async () => {
  const { call, track } = setup();
  const rejected = expect(call.ready).rejects.toMatchObject({ name: "AbortError" });
  await vi.advanceTimersByTimeAsync(0);
  await call.close();
  await rejected;
  expect(stopRing).toHaveBeenCalled();
  expect(track.stop).toHaveBeenCalled();
});
