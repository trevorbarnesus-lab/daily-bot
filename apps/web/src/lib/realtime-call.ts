import type { RealtimeCallModel } from "@rakazo/contracts";
import { abortableDelay, requestDeadline, withAbort } from "@rakazo/core";
import { MIN_RING_MS, startRingback } from "./call-pickup.js";
import { withSpaceHeaders } from "./rpc.js";

type RealtimeCallEvent = {
  type?: string;
  transcript?: string;
  item_id?: string;
  delta?: string;
};

export function startRealtimeCall(input: {
  botId: string;
  callId: string;
  model: RealtimeCallModel;
  spaceId: string | null;
  opening?: string;
  onEvent: (event: RealtimeCallEvent) => void;
  onFailure: (message: string) => void;
}) {
  const controller = new AbortController();
  const { signal } = controller;
  let peer: RTCPeerConnection | undefined;
  let media: MediaStream | undefined;
  let audio: HTMLAudioElement | undefined;
  let requested = false;
  let muted = false;
  let connected = false;
  let stopRing: () => void = () => undefined;
  let closing: Promise<void> | undefined;
  let timeLimit: ReturnType<typeof setTimeout> | undefined;
  const headers = withSpaceHeaders({ "content-type": "application/json" }, input.spaceId);

  const stopMedia = () => {
    for (const track of media?.getTracks() ?? []) track.stop();
    if (audio) {
      audio.pause();
      audio.srcObject = null;
    }
    peer?.close();
  };

  const close = () => {
    if (closing) return closing;
    controller.abort();
    stopRing();
    clearTimeout(timeLimit);
    stopMedia();
    closing = requested
      ? fetch("/api/voice/realtime/end", {
          method: "POST",
          headers,
          body: JSON.stringify({ callId: input.callId }),
          keepalive: true,
          signal: AbortSignal.timeout(10_000),
        })
          .then(() => undefined)
          .catch(() => undefined)
      : Promise.resolve();
    return closing;
  };
  const fail = (message: string) => {
    if (signal.aborted) return;
    void close();
    input.onFailure(message);
  };

  const ready = (async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      throw new Error("Live calls need microphone access in a supported browser.");
    }
    const outgoing = input.opening === undefined;
    if (outgoing) stopRing = startRingback().stop;
    const minimumRing = outgoing ? abortableDelay(MIN_RING_MS, signal) : Promise.resolve();
    media = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    if (signal.aborted) {
      stopMedia();
      return;
    }
    peer = new RTCPeerConnection();
    audio = document.createElement("audio");
    audio.autoplay = true;
    for (const track of media.getAudioTracks()) {
      track.enabled = false;
      peer.addTrack(track, media);
    }
    const connection = peer;
    const playback = audio;
    connection.ontrack = ({ streams, track }) => {
      playback.srcObject = streams[0] ?? new MediaStream([track]);
      void playback.play().catch(() => fail("Could not play the call audio."));
    };
    connection.onconnectionstatechange = () => {
      if (connection.connectionState === "failed" || connection.connectionState === "closed")
        fail("The live call disconnected.");
    };
    const channel = connection.createDataChannel("oai-events");
    channel.onclose = () => fail("The live call ended.");
    channel.onmessage = ({ data }) => {
      if (signal.aborted || typeof data !== "string") return;
      try {
        const event = JSON.parse(data) as RealtimeCallEvent | null;
        if (event && typeof event.type === "string") input.onEvent(event);
      } catch {
        // Ignore messages that are not Realtime events.
      }
    };
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    signal.throwIfAborted();
    requested = true;
    const response = await fetch("/api/voice/realtime/start", {
      method: "POST",
      headers,
      signal,
      body: JSON.stringify({
        botId: input.botId,
        callId: input.callId,
        model: input.model,
        sdp: offer.sdp,
        opening: input.opening,
      }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "Could not start the live call.");
    }
    const sdp = await response.text();
    const greetingHeader = response.headers.get("X-Call-Greeting");
    const greeting = greetingHeader ? decodeURIComponent(greetingHeader) : "Hi. How are you?";
    signal.throwIfAborted();
    await connection.setRemoteDescription({ type: "answer", sdp });
    const deadline = requestDeadline(15_000, "The live call did not connect.", signal);
    try {
      await Promise.all([
        withAbort(
          new Promise<void>((resolve) => {
            channel.onopen = () => resolve();
            if (channel.readyState === "open") resolve();
          }),
          deadline.signal,
        ),
        minimumRing,
      ]);
    } finally {
      deadline.dispose();
    }
    signal.throwIfAborted();
    stopRing();
    connected = true;
    for (const track of media.getAudioTracks()) track.enabled = !muted;
    channel.send(
      JSON.stringify({
        type: "response.create",
        response: {
          tool_choice: "none",
          instructions: `Say only this greeting text, then wait for the caller. Greeting text is ${JSON.stringify(greeting)}.`,
        },
      }),
    );
    if (!signal.aborted)
      timeLimit = setTimeout(() => fail("The live call reached its time limit."), 10 * 60_000);
  })().catch((error) => {
    stopRing();
    stopMedia();
    throw error;
  });

  return {
    ready,
    close,
    mute(value: boolean) {
      muted = value;
      media?.getAudioTracks().forEach((track) => {
        track.enabled = connected && !value;
      });
    },
  };
}
