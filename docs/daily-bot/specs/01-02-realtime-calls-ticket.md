# Faster calls / realtime speech-to-speech (Phases 1-2)

> Verbatim from Trevor's original spec (TASK.md, ticket). Do not edit; put design notes in PLAN.md.

---
Summary: Allow calls to use a realtime speech-to-speech model, such as OpenAI's Realtime API (gpt-realtime), instead of the current pipeline (speech-to-text → the bot's chat model → text-to-speech). That would make calls feel like ChatGPT or Grok voice mode, where replies start in about a second.

Problem: Today a call turn is a normal chat run. The client sends a message with a call: nonce, and the executor runs the bot's own model and thinking level, with VOICE_CALL_INSTRUCTION appended. That works, but every turn waits on three sequential round trips, so calls feel slow even with a fast model. Measured on a self-hosted instance (Docker images 2026-11-03 edge, OpenAI voice provider, bot on gpt-6-luna, default thinking), per turn: end-of-speech detection in the client about 1 s; /api/voice/transcribe (gpt-4o-mini-transcribe) 1.0-1.5 s; model run from message to first response (about 8.3K input tokens, 40-565 reasoning tokens) 2.7-6.6 s; /api/voice/speak (gpt-4o-mini-tts) 0.9-1.9 s; total before playback about 6-10 s. The speech models are already the fast ones, so the pipeline is the bottleneck.

Proposal: Add an optional call model, set per bot or as an account model role, similar to the computer-use model role in feat: computer-use model as an account model role #2745 (https://github.com/elie222/rakazo/pull/2745). When set to a realtime model, a call opens a realtime session instead of running turn by turn. In that session, give the realtime model the bot's instructions, memory and recent chat context, and expose the bot's tools as realtime function tools, so it can still act or hand longer work to the bot's normal model as a background run after the call. Write the call transcript back to the chat as calls do today, and record usage per call. Fall back to the current pipeline when no call model is set or the provider has no realtime support.

Smaller wins even without realtime: stream the model's reply into TTS sentence by sentence so playback starts on the first sentence. Allow a separate model or thinking level for call turns (for example thinking off), and a slimmer tool set during calls.

Why: Calls are one of the best parts of the mobile app, but at 6-10 s per turn they feel like walkie-talkie messages. Most assistant apps use speech-to-speech models for voice mode for this reason.
---
