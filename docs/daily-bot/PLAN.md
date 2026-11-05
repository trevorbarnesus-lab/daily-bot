# PLAN: Daily Bot roadmap (fork of Rakazo, branch `daily-bot`)

Status: plan only. No tracked file was changed, built or run. Read on branch `daily-bot` at `4044a65d`; upstream `main` fetched read-only at `b89cac3a` (55 commits ahead, v0.7.0 released) via a local `upstream` remote with pushing disabled (nothing merged). Companion file: `TREVOR_TODO.md` (everything you must decide or do before building). Summary: `REPORT.md`.

Rules for all work: changes go on `daily-bot`; `main` stays an unchanged upstream mirror; logic lives in new files with tiny hooks into existing code; all DB changes are additive (rolling-deploy safe); no vendor names outside adapters; keep UI copy minimal; tests deterministic and offline. Decided: app name Daily Bot, bundle prefix `cc.dailybooth.bot`, domain `bot.dailybooth.cc`. Still placeholders: logo and visual brand.

# Part A: Unified plan

## A1. The eight phases at a glance
Numbering note: TASK.md's addenda number some phases differently. This plan uses one scheme: Phase 1-2 voice calls, 3 dictation, 4 iPad, 5 rebrand, 6 instruction/memory consolidation (TASK.md "Phase 5"), 7 platform improvements (TASK.md "Phase 6", items 3 and 5 of which are Phases 6 and 1-2), 8 cross-space bot messaging (TASK.md "Phase 8").

| Phase | What | Effort | Needs from Trevor | Schema | Native build? |
|---|---|---|---|---|---|
| 1 | Faster calls, quick wins: sentence-streamed TTS; call model, thinking off, slim tools | 4-6 d | model choice for calls | none | no |
| 2 | Realtime speech-to-speech calls, tools, handoff, usage | 3-4 wks | realtime API key, transport choice, spend caps | maybe `call_sessions` | yes (WebRTC) |
| 3 | iOS composer dictation button | 4-6 d | on-device vs server | none | yes (permission strings) |
| 4 | iPad: verify universal build, layouts, keyboard, multitasking | 0.5-1 d + 2-3 d (more if layouts bad) | own Apple build | none | yes (first own build) |
| 5 | Rebrand to Daily Bot, new bundle ids, placeholder logo | 1-2 d + design; ids +1-2 d | bundle id, App IDs/keys inside existing accounts | none | yes |
| 6 | Consolidation: update-or-replace memory, run-state store, propose-diff-approve, routine history, cleanup job | 4-5 wks (6a 2, 6b 2, 6c 1) | approval policy, judge model | `routine_revisions`, `bot_state`, revision columns, pending changes | no |
| 7 | Platform: tool error visibility, connector reliability, setup fixes, routine settings, usage/budgets, safer connector defaults, native Gmail push | ~8-9 wks | Mailey routine type, Google Cloud, budget policy | several additive | no |
| 8 | Cross-space messaging: `message_bot` reaches the same user's toggle-on bots in other spaces, with roster, replies, docs | 3-4 d | default-on decision, space/org check | none | no |

## A2. Key findings that shape the order
- Calls are slow because a turn is a full chat run (`call:` nonce → executor with main model, thinking, all tools) between a transcribe and a speak request. Streaming speech and a call-specific model remove most of it without a new provider.
- Upstream PR #2745 (computer-use role) was merged **after** our base (`924ff22b`). It is now read: see A9 for the exact role pattern. A new role needs no migration.
- Dictation pieces mostly exist (`expo-speech-recognition`, `expo-audio`, `lib/dictation.ts`, `audio` background mode); no composer button exists.
- The repo is already universal (`supportsTablet: true`); the letterboxed app you saw was upstream's App Store build. Your own first build should confirm the device family.
- Rebrand footprint is ~2,600 files; display-name rebrand plus new bundle ids only, keep internal `rakazo` identifiers to preserve upstream syncs.
- Memory is append-mostly with a 4 KB cap; instructions already have 20-version history; routines have none; bots edit their own instructions without approval today.
- Routines already have per-routine model/thinking and notify; "watch" routines poll without a model; no connector rate limiting or retry exists; `UsageRecord` and usage summary exist.

## A3. Dependencies between phases
- **Phase 5 + 4 + 3 share the first native iOS build.** The new bundle id, reworded permission strings (dictation, calls), and the iPad device-family check all need a native build, and a first own TestFlight build needs the Apple setup. Batch them into one build to avoid repeated App Store review cycles.
- **Phase 6a before Phase 7 Gmail push:** the run-state store removes checkpoints from routine prompts, and event-driven routines need no checkpoint at all.
- **Phase 7 connector limiter + error logging before Gmail push:** the new connector should inherit retries and typed errors.
- **Phase 7 item 5 (memory cap) pairs with Phase 6:** raising the 4 KB cap costs tokens every run, so consolidation should land with or before it.
- **New model roles** (`call` in Phases 1-2, `consolidation` in Phase 6, optional `routine` in Phase 7) share one pattern; add them in a single small contracts change to limit conflicts.
- **Phase 2 depends on Phase 1** (the `call` role, call tool filter, call instruction constants are reused).
- **Phase 8 is independent** (no schema, no native build) but edits `executor.ts` and `bot-messages.ts`, so it comes after the Wave 0 upstream sync. The toggle default is decided: off in the fork (C2, design 4).
- **Phase 6 propose-diff-approve and Phase 7 safer defaults** both touch the approval ledger/card UI; build the diff card once.

## A4. Recommended build order
**Wave 0: sync, then Codex setup tasks (Codex does these; Trevor is asked only for logins and 2FA).** (a) First sync `daily-bot` with `upstream/main` using the C3 procedure, and set up the sync check script (C4) and `rerere`. (b) Codex creates the Apple App IDs `cc.dailybooth.bot` / `.widgets` / `.notifications` with the capabilities listed in TREVOR_TODO, the App Group, the APNs key and the App Store Connect app record. (c) Codex creates the EAS project (Trevor's existing Expo account has none yet). (d) Trevor points DNS at the server (the one thing only he does); Codex sets up the server (C7) and the privacy/support pages. Google Play is out of scope: Android is a sideloaded APK.
**Wave 1: foundations (~2-3 wks).**
1. Phase 5 rebrand (display name, placeholder wordmark/icons, new bundle ids, `dailybot` URL scheme alias) with Phase 4 step 0 and Phase 3 permission strings in the same native build → first own TestFlight build; verify iPad device family.
2. Phase 8 cross-space bot messaging (3-4 days, server side only, small and self-contained; delivers the Mira-to-Storm example early).
3. Phase 7 items 4 (tool error visibility), 2 (connector reliability), 9 (setup fixes, memory cap warning) in parallel on the server/web side; they need no native build.
**Wave 2: daily value (~3-4 wks).**
4. Phase 1 (streamed TTS, call model/thinking/tools) and Phase 3 dictation implementation (second native build only if the first did not include the JS).
5. Phase 4 layout polish on iPad.
6. Phase 6a (state store, memory update-or-replace, revision reasons) and Phase 7 item 6 (routine settings).
**Wave 3: safety and governance (~4 wks).**
7. Phase 6b (propose-diff-approve, routine history) and 6c (cleanup job), Phase 7 items 7 (usage/budgets) and 8 (safer connector defaults).
**Wave 4: big builds (~6-7 wks).**
8. Phase 7 item 1 Gmail push (after Google Cloud setup), then Phase 2 realtime calls (after Phase 1 and a realtime API key).
Total ≈ 15-20 engineer-weeks (Phase 8 adds under a week) if sequential; waves 1-2 deliver the visible wins in about 5-7 weeks.

## A5. Consolidated schema changes (all additive)
`routine_revisions`; `bot_state`; nullable `reason/actorType/actorBotId` on `memory_revisions`; pending-changes record (or `ExternalEffect` reuse); `mail_watch`; `usage_budgets`; `Routine.quietUnlessReport`; tool-call error columns (`errorCode`, `errorSummary`, `durationMs`); optional `connector_limits`, `ConnectorBotAccess`, `call_sessions`. New roles are rows in existing tables (no migration). Timestamps after upstream's newest migration (`20261123120000_account_bot_avatar_set` at time of reading); RLS on every tenant table following `20261024150000_model_roles`.

## A6. Consolidated risks (top)
1. Realtime tools acting on misheard speech, and audio cost (Phase 2). 2. Native dependency/rebuild cycles (WebRTC, bundle id change). 3. LLM judgment errors deleting rules (Phase 6); mitigated by approval + revisions. 4. Retrying writes causing duplicates (Phase 7). 5. Upstream sync conflicts in hot files. 6. Gmail restricted-scope OAuth verification and public endpoint requirement. 7. Bundle id change makes a new app (no migration of installs/push tokens) and needs new push/CallKit credentials. 8. Prompt-injection through email and proposals authored by tainted runs.

## A7. Cross-cutting test strategy
Deterministic offline tests by default (scripted voice/realtime/Gmail/connector fakes); postgres tests for every new table including RLS; opt-in, versioned-rubric LLM judge only for natural-language quality (consolidation, persona), cost reported separately, judge errors never count as passes; mobile/web state-machine tests with fakes; Maestro screenshot flows updated for the new brand strings; never run the desktop Playwright suite locally.

## A8. Decisions already made
- **Rebrand confirmed: Rakazo to Daily Bot.** Publishing under Trevor's own Apple/Google accounts, so bundle ids must change. Domain `bot.dailybooth.cc` and bundle prefix `cc.dailybooth.bot` have since been decided (bullets below). No logo yet.
- **iPad:** the letterboxed build is the **App Store build, i.e. upstream's published Rakazo app, not a build from this fork**. So there is probably nothing to debug in this repo: our `app.json` already says `supportsTablet: true`. Upstream's listing/binary is simply what is iPhone-only. Consequence: Phase 4's "find what strips iPad" becomes "ship our own first build and confirm `UIDeviceFamily` contains 2 in the TestFlight binary before any layout work". If the first Daily Bot build is still iPhone-only, then investigate `app.config.ts` and the plugins named in Phase 4.
- **Bundle ids DECIDED: `cc.dailybooth.bot`** (app), `cc.dailybooth.bot.widgets`, `cc.dailybooth.bot.notifications`. Never `com.trevor.*`. Use the middle path: change only the identifiers Apple/Google require, keep source names, package scope, env vars and storage keys. Concretely: `com.rakazo.app` becomes `cc.dailybooth.bot`, the extensions follow, `apps/mobile/app.json` bundleIdentifier/package, `app.config.ts` associatedDomains, native-module Android package names (`com.rakazo.notifications|pdfview|filedrop`) only if Play needs them unique (the app id is `package`; internal module packages can stay), App Group / keychain access group / entitlements, CallKit/PushKit/VoIP push certificates and APNs keys, Expo `owner`/`slug`/EAS project id, `eas.json` credentials, push-token server config. These touch `app.json`, `app.config.ts`, `plugins/with-*.js`, `ios-widgets`, `ios-intents`: all upstream-hot, so keep them in one commit.
- **Domain DECIDED: `bot.dailybooth.cc`** (DNS can be routed to wherever it is hosted). Use it for: the server/API host (the app's server URL is still user-entered in `app/server.tsx`), `associatedDomains: ["applinks:bot.dailybooth.cc"]` and the `apple-app-site-association` file at `/.well-known/` (plus Android `assetlinks.json`) for universal links, the privacy policy and support pages (`/privacy`), the Gmail push endpoint (Phase 7.1), and OAuth redirect URIs. Still add the custom scheme `dailybot` (keep `rakazo` as alias) as a fallback for auth returns and for devices where universal links don't fire. `apps/www` can be deployed to this host or to a sub-path later; no decision made.
- **Mailey DECIDED:** today a timer routine that checks Gmail every 15 minutes; goal is a Gmail push event that wakes the bot when new mail arrives (Phase 7.1). So the 96 runs/day are real model runs, and event-driven triggering saves them all.
- **Upstream fetch approved and done (read-only).** Findings in A9.
- **No logo yet.** Ship with a clean placeholder: a text wordmark "Daily Bot" and a simple monochrome glyph (the app is monochrome with ink primary). Generate the icon set (iOS `.icon`/1024 px, Android adaptive foreground/monochrome/background, favicon, splash, Electron) from one source SVG so the real logo is a single-file swap later. Do not reuse the Rakazo mark.
- **Accounts and who does setup (Nov 4, 7:20 PM):** Trevor has Apple Developer and Expo accounts (no Expo project yet). **Codex does the portal and store setup** (App IDs, capabilities, App Group, APNs key, App Store Connect record, EAS project) and asks Trevor only for logins and 2FA. **Google Play is skipped**: Android is a sideloaded APK. Logo, privacy and support pages are Codex tasks once hosting exists. Trevor self-hosts the server and points DNS himself (Part C7).

---

## A9. Upstream findings (fetched read-only, `upstream/main` at `b89cac3a`)
- **#2745 is merged** as `924ff22b` (2026-11-04), 54 files, ~2,800 lines. Its pattern for adding a role: add `"computer"` to `ModelRoleSchema` (`packages/contracts/src/model-roles.ts`: `z.enum(["main","approval","computer"])`); extend `modelSupportsRole` with a capability check (`entry.images !== false`); add a branch in `deploymentModelRole` (`packages/adapters/src/model-roles.ts`: "no computer model means the main model works the screen itself", i.e. unset falls back to main, exactly the fallback we want for a `call` role); a dedicated settings module (`packages/adapters/src/computer-model-settings.ts`) and picker changes in `apps/web/src/pages/ModelRoleSettings.tsx`, `ModelSettingsOverlay.tsx` and the mobile model screens; executor selection in `executor.ts` + `model-selection.ts`; catalog changes (`visionModelIds`, per-connection model lists). It also fixed that custom OpenAI-compatible endpoints appeared only as a placeholder, so models from the connection's own enabled list are now offered; this overlaps Phase 7 item 9.4 (custom model not in catalog). It touched `executor.ts` heavily (+279 lines) and `pi-runtime.ts`; the same file is our biggest conflict hotspot.
- **Implication for the `call` role (Phases 1-2):** copy #2745's shape after syncing (enum + `modelSupportsRole` branch with a realtime-capability check + `deploymentModelRole` returns `{primary: null}` so unset follows the existing pipeline + a small settings module + pickers). Do this **after** merging upstream into `daily-bot`, not before, to avoid reimplementing a moving target.
- **Not built upstream (grep of `upstream/main`):** no realtime speech-to-speech calls (the only "realtime" hit is `RealtimeFanout`, event delivery, and a model-id test fixture mentioning `gpt-realtime`); no Gmail push/Pub/Sub or `users.watch`; no usage budgets; no quiet-unless-report routine flag; no per-routine key/value state store; no routine revision history; no connector bot-scoping table. Phases 2, 6 and the main Phase 7 items remain ours to build. Re-grep before each phase starts.
- **Relevant things upstream did ship (adopt, don't rebuild):** keyboard shortcuts + a shortcuts list on web/desktop (`ed671589` #3348; iPad hardware shortcuts remain ours, Phase 4); pasted images in the iOS composer (`130d632f` #3354, touches `rakazo-file-drop` native module and `pick-attachments.ts`); call fixes (`b8c6aa94` #3356 server headers on the call transcription request, `927ffd8e` #3308 call card after session change, `61d712a1` #3267 web call mic after empty transcription) which touch `apps/mobile/lib/call-session.ts` (we plan to modify it); `c351cafb` #3368 connector rules for hyphenated tool names and `d335a058` individual approval rules (relevant to Phase 7.6); `83757846` Activity grouped into Needs attention / Working / Unread (relevant to Phase 7.3: the Activity panel should extend this grouping); Auto Review JSON repair-and-retry (`b1580ec8`); Polish language (`104a5dd6`, adds `locales/pl.json` and `.po` files, more rebrand surface); `3f4916ba` per-extension Info.plist references (touches the iOS extensions we will re-id); Release v0.7.0. `apps/mobile/app.json` changed upstream (new `pl` locale) and `supportsTablet` is still `true` there.
- **Sync plan impact:** 55 commits to absorb. Diff of our hot files vs upstream is small today (`app.json` +1 locale, `thread-composer.tsx` +2 lines, `call-session.ts` ~27 lines). **Merge (not rebase; see Part C) `upstream/main` into `daily-bot` first (Wave 0), before any feature work and before the rebrand**, so each later change starts from current upstream and conflicts stay minimal. Keep `main` an untouched upstream mirror: fast-forward `main` to `upstream/main` only if you want that, never push the fork's work to it.

# Part B: Phase details
Each phase below has: relevant files, proposed changes file by file, client impact, DB/schema, risks, effort, test plan, open questions. Open questions from every phase are consolidated, with recommendations, in `TREVOR_TODO.md`.

## B0. What the call code does today (context for Phases 1-3; read at our base commit, upstream has since changed `call-session.ts` slightly)

One call turn, end to end:

1. **Client records and detects end of speech.** `apps/mobile/lib/call-session.ts` (902 lines): `startCall` (~201), `openMic`/`recordTurn` (~709, stops once the speaker goes quiet), `transcribeClip` (~772) POSTs base64 audio to `/api/voice/transcribe`. Phases are `listening | thinking | speaking`. A device-dictation fallback exists (~697) for speak-only providers (`canTranscribe`). Web has its own session in `apps/web/src/lib/call-session.ts` (+ `call-pickup.ts`, `tts.ts`, `dictation.ts`).
2. **Transcribe.** `apps/api/src/voice.ts` `mountVoiceHttpRoutes` → `/api/voice/transcribe` → `transcribeVoice` → `VoiceProvider.transcribe` (interface in `packages/adapter-kit/src/interfaces.ts:540`; OpenAI impl `packages/adapters/src/openai-voice.ts`, compatible variant `openai-compatible-voice.ts`).
3. **Send as chat message.** The client posts a thread message with `clientNonce = callClientNonce(callId)` (`packages/core/src/call-nonce.ts`: `call:<callId>:<uuid>`). Server side `apps/api/src/routes/threads.ts` (`callMarkerClientNonce` ~63 → `call:<id>:marker`; hang-up uses `HANG_UP_PROMPT` and a run with `trigger: "call_end"`, ~601).
4. **Executor.** `packages/adapters/src/executor.ts`: `voiceCall = callEndRun || isCallClientNonce(sourceClientNonce)` (~1184); prompt gets `voiceCallInstruction(disabledBuiltinTools)` appended (~1540) unless it is the hang-up run. `VOICE_CALL_INSTRUCTION` / `voiceCallInstruction` live in `packages/adapters/src/run-instructions.ts:8-20`. Model comes from the bot override → main role (`selectConfiguredModel`, `packages/adapters/src/model-roles.ts`); thinking level resolved at executor ~944-1006 and ~1748. The full tool set is offered; ~8.3K input tokens in Trevor's measurement.
5. **Speak.** Client receives the finished reply, calls `speakText` (`apps/mobile/lib/voice.ts`) → `/api/voice/speak` → `synthesizeVoice` (`apps/api/src/voice.ts` ~516). `spokenUtterances` splits with `toUtterances` (`packages/core/src/speech-text.ts`) and may run `deps.speechSummary` for long text. Playback is utterance-by-utterance on the client, but **only after the whole reply exists**.
6. **Call card in chat.** `packages/db/src/repos.ts` (~411) finds ringing calls by `clientNonce startsWith "call:" endsWith ":request"`. Clients group one call's messages into a transcript card by callId from the nonce.

Model roles today: `ModelRoleSchema = z.enum(["main", "approval"])` in `packages/contracts/src/model-roles.ts`; `modelSupportsRole` there; resolution in `packages/adapters/src/model-roles.ts` (`deploymentModelRole`, `effectiveModelRole`); persistence in `packages/db/src/model-roles.ts` over `SpaceModelRoleChoice` / `UserModelRoleChoice` (Prisma ~2204-2250; first migration `packages/db/prisma/migrations/20261024150000_model_roles`; roles are stored as a plain `role String`, so **a new role needs no schema change**). UI: `apps/web/src/pages/ModelSettingsOverlay.tsx`, `apps/mobile/app/(settings)/models.tsx`; API: `apps/api/src/routes/account.ts`; settings: `packages/core/src/model-role-settings.ts`; RPC: `packages/contracts/src/rpc.ts`.

**Important finding:** upstream PR #2745 (computer-use model role) is **not in this checkout**. `git log` and grep find no computer-use role; only `main` and `approval` exist. The closest precedent is `cd2386b3` "Add shared model roles and configurable approval models (#2058)", which added the `approval` role (consumed in `packages/adapters/src/run-trust.ts:87` via `effectiveModelRole`). Phase 2 is modeled on that, and on #2745 once it is fetched (see open questions). Per AGENTS.md the enum comment says "Add purposes here; connections, persistence, pickers and backups stay shared", so adding `"call"` should be small.

---

## B1. Phase 1: Quick wins on the existing pipeline

Goal: cut roughly 3-6 s of the 6-10 s without a new provider protocol.

### 1.1 Relevant files
- Executor/prompt: `packages/adapters/src/executor.ts` (~1184, ~1540, model/thinking ~944-1006, tool assembly ~1500 region via `partitionTools`, `disabledBuiltinTools`), `run-instructions.ts`.
- Model selection: `packages/adapters/src/model-roles.ts`, `model-selection.ts`.
- Reply delivery to clients: run events/streaming path (threads routes `apps/api/src/routes/threads.ts`, `packages/contracts/src/runs.ts`); need to confirm the client already receives incremental text deltas for normal chat (open question 3).
- TTS: `apps/api/src/voice.ts` (`synthesizeVoice`, `spokenUtterances`), `packages/core/src/speech-text.ts` (`toUtterances`, `speakable`), mobile `apps/mobile/lib/voice.ts` (`speakQueue` ~168, `speakText` ~210), `call-session.ts` (`speakAndListen` ~585).

### 1.2 Proposed changes (file by file)

**A. Sentence-streamed TTS (biggest win, ~1-2 s plus the tail of model generation)**
- `apps/mobile/lib/call-session.ts`: while a call run is in `thinking`, subscribe to the run's streamed text; feed a sentence splitter; hand each complete sentence to a speech queue as it arrives; flip to `speaking` on the first sentence. Reuse `speakQueue` (`voice.ts:168`) rather than a new player.
- `packages/core/src/speech-text.ts`: add `createSentenceSplitter()` (incremental; reuses `toUtterances` rules and abbreviation handling). Pure, unit-testable. New file preferred: `packages/core/src/speech-stream.ts`.
- `apps/mobile/lib/voice.ts`: prefetch TTS for sentence N+1 while N plays (today fetch and play are serial per utterance). Small hook, keep logic in a new `apps/mobile/lib/speech-prefetch.ts`.
- `apps/web/src/lib/call-session.ts` / `tts.ts`: same behavior on web, sharing the splitter from core.
- Skip `speechSummary` for call turns (it adds a model round trip for long text); the call instruction already forces short replies.
- Server: no new endpoint needed if the run already streams text; `/api/voice/speak` stays per-sentence. Optional later: make `/api/voice/speak` stream audio chunks (OpenAI TTS supports chunked streaming), kept behind `VoiceProvider` as an optional `synthesizeStream?`.

**B. Separate call model, thinking level, slim tools**
- Introduce a `call` model role (reused in Phase 2, see 2.2) but in Phase 1 it means "the *text* model used for call turns": `packages/contracts/src/model-roles.ts` add `"call"`; `modelSupportsRole` allow it. Resolve with `effectiveModelRole(..., "call", ...)` falling back to the bot's/main model (so unset = today's behavior).
- `packages/adapters/src/executor.ts`: when `voiceCall && !callEndRun`, pick the call role model and thinking level (default `off`/lowest the model supports) instead of the main choice. This is the one invasive hook (~944-1006 region); wrap it in a helper `resolveCallTurnModel()` in a new file `packages/adapters/src/call-model.ts` and call it from a single line.
- Slim tool set: add `callTurnToolFilter()` in `call-model.ts` that returns a `disabledBuiltinTools`-style set for call turns. Keep `end_call`, memory read/search, calendar/time, and a handoff tool; drop heavy items (computer, shell, file, browser, subagents) and let the instruction say "if this needs those, say you'll do it after the call". Needs a decision on what stays (open question 2). Extend `voiceCallInstruction` accordingly only via a new constant, do not rewrite the existing one (keeps `executor.test.ts:1878` stable).
- Settings plumbing: reuse existing shared role UI (`ModelSettingsOverlay.tsx`, mobile `models.tsx`); a "Calls" row appears in the roles list. Thinking level `off` must be representable; check `ThinkingLevelSchema` (`packages/contracts/src/ids.ts`).

### 1.3 Client impact
- **Mobile (primary):** `call-session.ts`, `voice.ts` changes above; a new settings row for the call model; no visual changes to the call screen.
- **Web/Electron:** same streaming behavior in its call session; settings row via the shared overlay. Per AGENTS.md, UI copy minimal: one row labeled e.g. "Call model", no explainer text.

### 1.4 DB/schema
None. Role rows are free-text `role` in existing tables. No migration. (A per-bot override, if wanted, would add nullable columns on the bot; adds are safe for rolling deploys, but start with account role only.)

### 1.5 Risks
- Sentence splitting mistakes (abbreviations, decimals, URLs) causing choppy speech; mitigated by reusing `toUtterances` rules and tests.
- Call turns with off-thinking + slim tools degrade answer quality; fallback is leaving the role unset.
- Barge-in/stop semantics: streamed queue must be cancelled by `stopSpeaking` and the `speechSeq` guards in `call-session.ts` (~590-613). Easy to regress.
- Executor edit sits in a hot, frequently edited file (conflict risk, see §3).
- If run text is not streamed to the client today, A requires adding that (bigger).

### 1.6 Effort
~4-6 days: sentence streaming mobile+web 2-3 d, call role + thinking + slim tools 2 d, settings UI 0.5 d, tests/polish 1 d. Expected result: first audio ~3-5 s after end of speech (from 6-10 s).

### 1.7 Test plan (offline, deterministic per AGENTS.md)
- Unit: sentence splitter (`packages/core`), call-turn model resolution and tool filter (`packages/adapters`, alongside `executor.test.ts` patterns using `testing/model-roles.ts`), role schema/persistence (`model-roles.postgres.test.ts` pattern).
- Mobile: extend `call-session.test.ts`, `voice-session.test.ts` with fake streams: first sentence plays before run completes; barge-in cancels the queue; hang-up flow unchanged.
- Scripted voice provider (`packages/adapters/src/scripted-voice.ts`) for server tests. Do not run the desktop Playwright e2e locally (steals focus on macOS; CI does it).
- Manual: same measurement as Trevor's, per-stage timings on a self-hosted instance.

### 1.8 Open questions
1. Does the run protocol already stream text deltas to clients? (Decides whether A is client-only.)
2. Which tools stay during a call?
3. Default call thinking level: off, or "minimal"? Which model for the call role by default: same as main?
4. Should the call model apply per bot too, or account-wide only at first?

---

## B2. Phase 2: Realtime speech-to-speech call model

Goal: first audio in about 1 s; ChatGPT-style voice.

### 2.1 Relevant files
- Role system as above (`model-roles.ts` contracts/adapters/db, settings UIs, `account.ts` routes). Precedent: `cd2386b3` (#2058, approval role) and upstream #2745 (not in repo).
- Voice provider seam: `packages/adapter-kit/src/interfaces.ts:540` (`VoiceProvider`), `packages/adapters/src/voice-factory.ts`, `openai-voice.ts`, `apps/api/src/voice.ts` (`VoiceDeps`, `loadDefaultVoiceCredential`, `resolveVoiceTarget`).
- Chat context assembly: `packages/adapters/src/executor.ts` (system prompt, memory via `recalledMemory`, history via `compactedHistory`, tools via `partitionTools`), `run-instructions.ts`.
- Call identity + transcript: `packages/core/src/call-nonce.ts`, `apps/api/src/routes/threads.ts` (marker, hang-up, `call_end` run), `packages/db/src/repos.ts` (~411), `end_call` tool.
- Usage: `UsageRecord` model in `packages/db/prisma/schema.prisma` (~1636) and its writers.
- Mobile audio/WebRTC: `apps/mobile/lib/call-session.ts`, `voice.ts`. Web: `apps/web/src/lib/call-session.ts`.

### 2.2 Proposed changes (file by file)

**Contracts / provider-neutral layer** (AGENTS.md: no vendor names outside adapters)
- `packages/contracts/src/model-roles.ts`: `"call"` role (shared with Phase 1). `modelSupportsRole`: allow models whose catalog entry has a realtime/speech protocol. Add a catalog capability e.g. `ModelCatalogEntry.protocol = "realtime"` (`packages/contracts/src/domain.ts`) so the picker can list realtime models only for the call role, and so `main` excludes them (like `decisions`).
- New `packages/contracts/src/realtime-call.ts`: neutral session contract: `RealtimeCallSession` (`{ sessionId, transport: "webrtc" | "websocket", clientSecret, url, expiresAt }`), event shapes for transcript turns, tool calls, usage. No vendor names.
- `packages/adapter-kit/src/interfaces.ts`: new `RealtimeCallProvider` interface (separate from `VoiceProvider`): `describe()`, `createSession({ instructions, tools, voice, model, context })` returning the neutral session (ephemeral client credential), `parseUsage(event)`. Optional on the voice factory so absent = unsupported = fallback.

**Adapter** (the only place the vendor appears)
- New `packages/adapters/src/openai-realtime.ts`: mints an ephemeral client secret via the provider's direct API, translates neutral tools to function-tool JSON (reuse `openai-tool-parameters.ts` sanitizing), maps usage. Dynamic `import()` only when configured. Plus `openai-realtime.test.ts` with recorded fixtures (offline conformance), and a `scripted-realtime.ts` fake like `scripted-voice.ts`.
- `packages/adapters/src/voice-factory.ts`: register realtime capability.

**Server orchestration** (backend owns it, per AGENTS.md)
- New `apps/api/src/realtime-call.ts` (mirrors `voice.ts`): 
  - `POST /api/calls/realtime` : authenticate, resolve the call role (`effectiveModelRole`), return 409/`unsupported` if unset or no provider support (client falls back), build the session instructions = bot persona/system prompt + memory + recent N messages + realtime-specific call instruction (new constant; do not touch `VOICE_CALL_INSTRUCTION`), tool list = slim safe subset + `handoff_to_bot` + `end_call`. Return the neutral session. Write the call marker message as today.
  - `POST /api/calls/:callId/tool` : client relays a realtime function call; server authorizes and executes through the same tool path and approval rules (`action-approval`, `run-trust.ts`), returns result. Tools execute server-side, never in the client.
  - `POST /api/calls/:callId/events` (or end-of-call): client posts final transcript turns + provider usage; server writes messages and `UsageRecord`.
- `handoff_to_bot(task)`: creates a normal background run on the bot's main model (same mechanism as the `call_end` run in `threads.ts` ~601; reuse that run creation helper) and returns "started". Result lands in chat after the call; optionally tell the realtime model when it finishes if the call is still open.
- Context builder: factor out of `executor.ts` the memory/history assembly into a reusable function only if it is easy; otherwise a read-only duplicate in a new `realtime-context.ts` (prefer duplication over editing the executor, for sync safety; revisit if upstream drifts).
- Transcript write-back: each completed user/assistant turn is stored as thread messages with `callClientNonce(callId)` nonces so the existing call card grouping in clients keeps working with zero client changes to rendering. At hang-up, keep the existing `call_end` flow (`HANG_UP_PROMPT`, title via `end_call`).
- Usage: `UsageRecord` write per call with audio in/out and text token counts, labeled by neutral kind `call` (no vendor name in columns). Need to inspect `UsageRecord` fields for a fit (open question 6).
- Fallback: `callsRealtimeAvailable` capability flag on bootstrap/capabilities (alongside `callsEnabled` in `apps/api/src/routes/context.ts` / `shared.ts`); client checks it before starting, and on any session error mid-call falls back to turn-by-turn without ending the call.

**Clients**
- Mobile: new `apps/mobile/lib/realtime-call.ts`: WebRTC transport (needs `react-native-webrtc` or a WebSocket + PCM streaming path; the native dependency is the biggest cost, open question 4). `call-session.ts` gets a small branch: if realtime available, delegate to the new module, still publishing the same `CallState` phases so the UI is unchanged. Echo cancellation/audio session config via existing `expo-av`/audio setup. Barge-in is handled by the model's server VAD.
- Web/Electron: `apps/web/src/lib/realtime-call.ts` using browser `RTCPeerConnection` (no new dependency; Electron hosts the web UI so it comes for free).
- Settings: the "Call model" row from Phase 1 now lists realtime models; picking one switches the call to realtime.

### 2.3 Client impact
- Biggest on mobile (native WebRTC module, dev-client rebuild, OTA cannot ship native modules; runtime version bump, see the OTA commit `d1f0a0ca`). Web is cheap. UI unchanged apart from the model row. Mic permissions already exist.

### 2.4 DB/schema
- Likely none for the role or transcripts (existing tables). Possible small additive migration: call-session row (`call_sessions`: id, spaceId, userId, botId, threadId, callId, model, startedAt, endedAt, usage JSON) to make tool-relay auth and idempotent usage writes simple. If added: tables are safe; follow RLS pattern from `20261024150000_model_roles` (enable RLS + tenant/system policies). A per-bot call model override, if wanted later, adds nullable bot columns (additive, safe).

### 2.5 Risks
- **Quality/behavior mismatch:** the realtime model is a different brain than the bot's; persona and tool-use fidelity drop. Mitigated by handoff to the main model and clear instructions.
- **Tool safety:** realtime models call tools autonomously with speech-recognition errors. Keep read-only/low-risk tools; route everything else through approval; never expose shell/computer. Security-sensitive per AGENTS.md.
- **Cost:** audio tokens are much pricier than STT+text+TTS; need per-call caps, max duration, and visible usage.
- **Mobile native dependency + Expo build/OTA constraints.**
- **Vendor rule:** AGENTS.md forbids vendor names outside adapters, including settings/UI/copy. Model names will show in pickers (they already do for models) but not "OpenAI Realtime" in contracts/routes.
- **Concurrency:** many parallel calls; session creation must not sit behind a global queue; tool relay is stateless (Postgres lookups only).
- **Ephemeral key leakage:** short TTL, scoped to one session, never logged (redaction).
- **Transcript fidelity:** realtime transcription of user speech is a separate, sometimes worse model; assistant transcript can differ from spoken audio.
- Rolling-deploy safety: migrations additive only.

### 2.6 Effort
~3-4 weeks for one engineer: contracts+adapter 4 d, server session/tool/handoff/usage 6-8 d, web client 3 d, mobile client incl. native WebRTC and audio-session debugging 6-8 d, settings/capability/fallback 2 d, tests and hardening 3-4 d.

### 2.7 Test plan
- Offline conformance for `RealtimeCallProvider` with `scripted-realtime.ts` (deterministic event scripts: transcripts, tool calls, errors, usage).
- Server tests: session creation (role unset → unsupported; wrong protocol → unsupported), context contents (bot instructions, memory, recent N), tool relay authz/approval, handoff creates a main-model run, transcript write-back with correct `call:` nonces, idempotent usage record, RLS (postgres tests following `model-roles.postgres.test.ts` / `row-security.postgres.test.ts`).
- Client tests: mobile/web state machines with a fake transport; fallback on mid-call failure; barge-in; hang-up writes marker and triggers the `call_end` run.
- Optional, opt-in judge-based rubric for persona adherence per AGENTS.md (not keyword checks); report cost separately.
- Manual device testing on iOS (echo, interruptions, Bluetooth routes, backgrounding). No local Electron e2e.

### 2.8 Open questions
See §4.

---

## B3. Phase 3: Built-in voice dictation in the iOS composer

Goal: a mic button in the mobile composer: tap to record, text lands in the input, recording survives scrolling and navigating the app, with permission, error and visual states. (Independent of Phases 1-2; can ship first.)

### 3.1 Relevant files (found)
- Composer: `apps/mobile/components/thread-composer.tsx` (props `draft`, `attachActions`, `canSend` ~387, `TextInput` ~639, `ThreadComposerHandle` ~57); dock/screen: `apps/mobile/components/thread/thread-composer-dock.tsx`, `thread-screen.tsx`.
- Existing on-device recognizer wrapper: `apps/mobile/lib/dictation.ts` (`available`, `listen`, `stop`, `setSpeechRecognizer`; endpoint-silence logic, restarts on recognizer timeout, `FATAL_ERRORS`, give-up reasons). Built for calls, but reusable.
- Existing recorder + server transcription: `recordClip` and `transcribeClip` in `apps/mobile/lib/call-session.ts` (~709, ~772) using `expo-audio`, POST to `/api/voice/transcribe` (`apps/api/src/voice.ts`, body cap `MAX_TRANSCRIBE_BYTES`).
- Dependencies/config already present: `expo-speech-recognition` 57.1.0 and `expo-audio` 57.0.5 (`apps/mobile/package.json`); `app.json` has the plugin, `UIBackgroundModes: ["voip","audio","remote-notification"]`, and permission strings. Those strings say "voice calls", so they need rewording for dictation (native Info.plist change, so a new build, not OTA).
- Web analog: `apps/web/src/components/composer/HoldToTalk.tsx` + `apps/web/src/lib/dictation.ts` (modes `hold`/`endpoint`, desktop bridge speech).
- No mobile dictation button exists today (grep of the composer finds no mic).

### 3.2 Proposed changes (file by file)
- New `apps/mobile/lib/composer-dictation.ts`: a module-level (not component-level) store, so recording is owned by the app, not the screen. This is what lets it survive scroll, navigation and composer remounts. State: `idle | requesting | listening | transcribing | error`, current text, level. Subscribed via `useSyncExternalStore`, like `useCallSession`.
- Engine choice (default **on-device first**, server fallback):
  1. On-device streaming via `lib/dictation.ts` (`continuous`, interim results): text appears live in the input, zero upload latency, works with speak-only voice providers. Needs a small option to disable the call-specific endpoint-silence auto-stop (tap-to-stop instead) via a new parameter rather than editing the call path.
  2. If on-device is unavailable or the locale is unsupported, record with `expo-audio` and send to `/api/voice/transcribe` (reuse `recordClip` pieces; factor the shared recorder setup into `lib/audio-recorder.ts` only if cheap, otherwise copy to stay out of `call-session.ts`). Better accuracy for names/mixed language; text arrives after stop.
  - Provider-neutral: no vendor names; server path already goes through `VoiceProvider.transcribe`.
- New `apps/mobile/components/composer-dictation-button.tsx`: native-first per AGENTS.md (SF Symbol `mic` / `waveform` via existing icon approach in the composer; Liquid Glass button where the composer already uses it). States: idle (mic), listening (animated waveform/level + stop), transcribing (spinner), error (brief inline state, destructive tint). Accessible name "Dictate" / "Stop dictation"; minimal copy, no explainer text.
- `apps/mobile/components/thread-composer.tsx`: small hook: render the button when the draft is empty or alongside send (mic replaces send arrow when draft is empty, a common pattern); on text events call the existing draft setter, inserting at the caret/selection and keeping interim text separate from committed text. This is the only edit to a shared component (conflict risk).
- Survive navigation: the store keeps recording and keeps appending to a **dictation target** (thread id + draft key). If the user leaves the thread, text goes to that thread's draft store (check how drafts persist; open question 3) and a small persistent indicator (the existing playback dock pattern in `lib/voice.ts` suggests a global mini-state) shows recording is active with a stop control. Minimal v1: recording stops cleanly on leaving the thread and the partial text is kept in that draft; "keep recording while moving around" is the stretch described below.
- Background/app switching: `UIBackgroundModes` already includes `audio`, so a recording audio session can continue when the app is backgrounded; on-device recognizer may be interrupted by iOS, so handle interruption events, finalize text, and show it on return. Phone calls/Siri interrupt: end gracefully.
- Coordination with calls: do not start dictation during a live call (`getSnapshot()` from `call-session.ts` non-null → hide/disable button), and stop speaking playback (`stopSpeaking` in `voice.ts`) when dictation starts to avoid echo.
- Permissions: use `requestPermissionsAsync` (recognizer) and `AudioModule.requestRecordingPermissionsAsync()` (recorder). Denied → one-line error with an "Open Settings" action (`Linking.openSettings()`), no repeated prompts. Update `app.json` permission strings to mention dictation.
- Errors: map `FATAL_ERRORS` / `TRANSIENT_ERRORS` from `dictation.ts` and `voiceAccountErrorText` from transcribe failures into one short message; offer retry. Never lose already captured text.
- Server: none required. Optional later: a streaming transcription endpoint if on-device quality is insufficient; not in v1.

### 3.3 Client impact
- **Mobile:** composer button and store as above; new native build because of Info.plist strings (if only wording changes it still needs a build; the plugins are already installed, so no new native modules).
- **Web/Electron (lower priority):** web already has `HoldToTalk` and dictation; the only follow-up is parity of behavior (tap-to-toggle mode in addition to hold, continue across navigation via the existing `dictation` store). Share the "insert at caret, interim vs committed" logic by moving it to `packages/core` if both clients need it; otherwise leave web alone.

### 3.4 DB/schema
None.

### 3.5 Risks
- Keeping recognition alive across navigation and backgrounding is the hard part: iOS may end recognition after about a minute of continuous use or on interruption; the existing restart logic (`RESTART_MIN_MS`/`MAX_DEAD_RESTARTS`) helps but was tuned for calls.
- Audio session conflicts with call audio, TTS playback and other apps (mode switching in `setAudioModeAsync`; see the `recordingTurn` guard in `call-session.ts`).
- Draft integrity: inserting text while the user also types or edits; interim text replacing user edits.
- Locale support gaps in on-device recognition (uses `recognitionLocaleTag`, `supportedSpeechTag` from `@rakazo/core`).
- Privacy: audio sent to the server only on the fallback path; make sure it is clear which path is used and that the existing AI-consent gate (`packages/core/src/ai-consent.ts`) applies.
- Composer file is hot upstream (conflict risk).

### 3.6 Effort
~4-6 days: store + on-device flow 2 d, button + composer integration + states 1-1.5 d, server-transcribe fallback 1 d, cross-navigation/background handling 1-1.5 d, tests 1 d. Simulator cannot test the real recognizer well; allow device time.

### 3.7 Test plan
- Unit with the injectable recognizer (`setSpeechRecognizer`, pattern in `dictation.test.ts`): start/stop, interim vs committed text, restart on recognizer end, fatal errors, permission denied, locale unsupported, fallback to server path when unavailable.
- Store tests with fake `expo-audio` (pattern in `voice-session.test.ts`): state transitions, mutual exclusion with calls and TTS, stop on session change (`subscribeSessionGeneration` like `call-session.ts`).
- Component test for the button states and accessible names; draft insertion at caret.
- Manual on device: permissions flows, scroll/navigate/background during recording, interruption by a phone call, AirPods route changes.
- No desktop e2e locally.

### 3.8 Open questions
1. On-device recognizer first (live text, free, works offline) or server transcription first (more accurate, consistent with web)? Recommendation: on-device first, server fallback.
2. Tap-to-toggle only, or also hold-to-talk like web?
3. "Keep recording while moving around the app": is it enough to keep recording across scroll and in-thread navigation, or must it survive leaving the thread and backgrounding? Where do per-thread drafts live today?
4. Should dictated text auto-send ever, or only fill the input?
5. Mic button position: replace send when the draft is empty, or a separate button?

---

## B4. Phase 4: iPad support for the iOS app

**Finding first: the repo already declares the app universal.** `apps/mobile/app.json` has `"ios": { "supportsTablet": true }` (line ~94, present since the initial commit `4bdbcb05`) and `"orientation": "default"` (both orientations). A tablet split view also exists: `apps/mobile/lib/split-view.ts` (`splitsWindow` at width >= 600, `inboxPaneWidth`, draggable and persisted list width), `SplitFrame` in `apps/mobile/app/_layout.tsx` (~116), added in `98c6a0d7` for Android foldables/tablets and fitted to iPhone Duo in `ee571a85`. A Maestro flow `apps/mobile/.maestro/split-view.yaml` covers it, but only on an Android emulator. So "no iPad support" is probably one of: an older binary built before this, an App Store Connect listing with no iPad screenshots/metadata, or an iPad-specific breakage nobody has exercised on iOS. This was not verified (no builds/simulators allowed). Phase 4 is therefore mostly **verify, fix, and ship**, not build from scratch.

**Update from Trevor: on an iPad the app runs as a small iPhone-sized window (letterboxed compatibility mode).** That symptom means the installed binary's `UIDeviceFamily` is iPhone-only, i.e. iOS is treating it as an iPhone app, so the problem is the **build, not the layouts**. It contradicts the checked-in config, so something between `app.json` and the shipped binary drops iPad. Candidates, most likely first (all unverified; no builds allowed):
1. The installed build is older than the config, or comes from a different pipeline/profile than `eas.json` production/preview. Check the build's `Info.plist` (`UIDeviceFamily` should be `[1, 2]`) and Xcode `TARGETED_DEVICE_FAMILY = "1,2"` for the main target.
2. A config plugin or `apps/mobile/app.config.ts` rewrites the iOS block. `app.config.ts` spreads `...result.ios` (line ~35), so check the final output with `npx expo config --type introspect` (read-only, but is a command run, so do it when implementing). The extension plugins (`plugins/with-app-intents.js:91`, `with-agent-notifications.js:79`) already set `"1,2"` for their targets, which only matters if the main target differs.
3. `plugins/with-scene-lifecycle.js` (UIScene manifest, recent iOS 26 fix) rewrites `Info.plist`/AppDelegate; confirm it does not drop device-family or orientation keys, and that the scene manifest works on iPadOS.
4. A locally maintained `ios/` folder or stale prebuild cache keeps `TARGETED_DEVICE_FAMILY = 1` (no `ios/` dir exists in the repo, so this applies only to a local/EAS cached prebuild: run `expo prebuild --clean`).
5. Installing an iPhone-only build onto an iPad from a source that only offered the iPhone slice (rare; TestFlight shows a universal build on iPad as native).
Step 0 of the implementation is therefore: inspect the produced `Info.plist`/Xcode project, find which of the above drops iPad, fix that in `app.json`/plugin, ship a new TestFlight build (a native change; OTA cannot fix it). Only then do the layout work in 4.2.3+.

### 4.1 Relevant files (found)
- Config: `apps/mobile/app.json` (supportsTablet, orientation, `infoPlist`, `UIBackgroundModes`), `apps/mobile/app.config.ts`, `apps/mobile/eas.json` (iOS image `macos-tahoe-26.6-xcode-27.1`; profiles preview/production), `.github/workflows/release-mobile.yml`.
- Layout: `apps/mobile/lib/split-view.ts`, `fold-layout`/`fold-regions` helpers, `apps/mobile/app/_layout.tsx` (`SplitFrame`, `useSplitView`, `closesSplitPane`), `apps/mobile/app/index.tsx` (inbox), `app/thread.tsx`, `app/group-thread.tsx`, `components/thread/thread-screen.tsx`, `thread-composer.tsx`.
- Native pieces that matter on iPad: `apps/mobile/ios-widgets`, `ios-intents`, `modules/`, `native/`, `plugins/` (widget and notification extensions, bundle ids `com.rakazo.app.widgets`, `.notifications`).
- Screenshots/tests: `apps/mobile/.maestro/` (`screenshots.yaml`, `split-view.yaml`, `smoke.yaml`), `.github/workflows/mobile-android-screenshots.yml`. The iOS screenshot catalog referenced in AGENTS.md is iPhone only as far as I found.
- No keyboard-shortcut or pointer/hover handling was found in `app/`, `components/`, `lib/`.

### 4.2 Proposed changes (file by file)
1. **Confirm the build is universal.** After a prebuild, check `TARGETED_DEVICE_FAMILY = "1,2"` in the generated Xcode project and the built binary's `UIDeviceFamily`. If it is already `1,2`, nothing to change in `app.json`. (Do not add `requireFullScreen`; it would block Split View/Slide Over.)
2. **Orientations/multitasking** (`app.json`): keep `"orientation": "default"`. Make sure the generated `Info.plist` lists all four iPad orientations and does not set `UIRequiresFullScreen`. Set `UIApplicationSupportsMultipleScenes` only if multiple windows are wanted (not v1).
3. **Layout** (`lib/split-view.ts`, `app/_layout.tsx`): the 600 pt split threshold fits iPad full-screen (744-1366 pt wide) and 1/2 and 2/3 Split View; 1/3 Split View and Slide Over (~320-375 pt) fall below it and use the phone layout, which is correct. Adjust only what testing shows: sheet/modal widths (use form-sheet or constrained max width instead of full-width stretched content), composer and message bubble max widths for readability on wide panes, settings screens in `app/(settings)/` (consider a master-detail only if they look sparse), image/page/artifact viewers. Reuse `useWindowDimensions`-based hooks; no new layout system.
4. **Keyboard**: hardware-keyboard shortcuts in a new `apps/mobile/lib/keyboard-shortcuts.ts` (Return to send / Shift-Return newline in `thread-composer.tsx`, Cmd-N new chat, Cmd-F search, Cmd-W close pane, Cmd-1..9 jump to chat) via a small native module or `UIKeyCommand` discoverability through an Expo module (check existing `modules/`). v1 can ship with only Return-to-send; shortcuts are optional polish.
5. **Pointer/trackpad**: use native iOS hover/pointer effects on tappable rows and buttons where the native controls already provide them (AGENTS.md: native-first); only add hover styling to custom rows (inbox tiles) if missing. Context menus already use native menus so right-click works.
6. **Drag and drop / Stage Manager**: optional later (drop files/images into the composer). Not v1.
7. **Calls and dictation on iPad** (checks, mostly no code):
   - Calls (`apps/mobile/lib/call-session.ts`, CallKit/`voip` background mode): verify the ring screen, speaker routing (iPad has no earpiece; default to speaker), and that the call UI works in split layout. In Split View another app may hold the audio session; handle interruption (`subscribeSessionGeneration` pattern).
   - Mic permission and `expo-audio` recording under multitasking: iPad Slide Over and Split View keep the mic only for the foreground app; test `recordClip`.
   - Phase 3 dictation: mic button must exist in the wide composer; on-device recognition works on iPad; hardware-keyboard dictation key is separate.
   - Phase 1/2: sentence streaming is device-agnostic. WebRTC (Phase 2) behaves the same on iPad.
8. **Widgets/Intents/Notification extensions**: confirm the widget extension declares supported families that make sense on iPad (systemMedium/Large, optionally extraLarge) in `ios-widgets`; the notification service extension needs no change.
9. **Store assets** (outside code): iPad screenshots (13-inch required if the app is universal; 12.9/13 in. and optionally 11 in.), iPad description unchanged. Add an iPad destination to the iOS screenshot flow/Maestro catalog (`screenshots.yaml`) rather than a special runner, per AGENTS.md; if CI cannot capture iPad, say so rather than linking iPhone shots.

### 4.3 Client impact
- Mobile only. Web/Electron already adapt to wide windows; no change. Android tablets/foldables already use the same split code, so layout fixes must keep the Android `split-view.yaml` flow green (shared code, conflict between platforms is the main regression risk).

### 4.4 DB/schema
None. Server unchanged. (Push tokens: devices register per install; confirm the token record does not assume phone-only.)

### 4.5 Risks
- Root cause of the letterboxing is not yet found; the fix may be a one-line config/plugin change, but layout quality at full iPad size is untested and likely needs real work once iPad mode is on.
- Shared split code with Android: iPad tweaks can regress foldables.
- Multitasking and audio-session conflicts for calls/dictation (see 4.2.7); Slide Over is a narrow width the phone layout must survive.
- App Store: a universal app must provide iPad screenshots and pass review on iPad; the review team tests on iPad, so crashes or stretched layouts risk rejection. Existing TestFlight testers on iPhone are unaffected; adding iPad changes the build's `UIDeviceFamily`, and Apple does not allow later removing iPad support for users who already installed on it without extra steps.
- Native extensions (widgets, intents, notifications) must be valid for the iPad family or the archive upload fails validation.
- Daily-bot fork: `app.json` edits conflict with upstream (they bump `buildNumber`/versions often); keep the change minimal or none.
- Real verification needs an iPad simulator/device (no iPad testing was possible here).

### 4.6 Effort
- If the app is already universal and mostly fine: ~0.5-1 day for the build fix plus ~2-3 days (audit on iPad simulator, fix 3-6 layout issues, Return-to-send, screenshots).
- If significant layout problems: ~1-1.5 weeks including shortcuts, pointer polish, widget families, and store assets.

### 4.7 Test plan
- Unit: layout helpers (`splitsWindow`, `inboxPaneWidth`) with iPad widths (744, 820, 1024, 1366 and Split View widths 507, 678, 375, 320), extending existing split-view tests.
- Maestro: add an iPad pass to the iOS flow set (inbox + chat side by side, rotate, Split View) using the existing helpers; keep `split-view.yaml` for Android. Verify with Xcode's iPad simulator manually, not the focus-stealing desktop e2e.
- Manual matrix: iPad mini/Air/Pro; portrait/landscape; full screen, Split View 1/2 and 1/3, Slide Over, Stage Manager; hardware keyboard and trackpad; call, dictation, attachments, share extension, widget, push notification.
- App Store: TestFlight internal build on an iPad before external testing; check App Store Connect validation for device family.

### 4.8 Open questions
1. Answered: it runs letterboxed as an iPhone app. Still needed: which build is on the iPad (TestFlight, App Store, local Xcode, EAS profile) and when was it built? Can you share its `UIDeviceFamily` or the build number?
2. Is the app published under an Apple account you control with iPad screenshots ready, or is that out of scope for the fork?
3. Do you want multiple windows/scenes (iPadOS windowing), or a single window only?
4. Which hardware shortcuts are worth doing in v1?
5. Is a three-column layout (list, chat, details) wanted, or the existing two-pane split only?

---

## B5. Phase 5: Rebrand Rakazo to Daily Bot

> **Design change from Part C (sync-safe rebrand):** do not edit `apps/mobile/app.json` or rewrite UI source strings. Identity (name, bundle ids, owner, EAS id, scheme alias, associated domains, permission strings) goes in a new `apps/mobile/daily-bot.config.ts` called from `app.config.ts`; the displayed name changes through one brand constant plus a build-time overlay, leaving translation sources and locale files identical to upstream. Where the steps below say "edit app.json" or "replace strings", read them as this overlay. Android is a sideloaded APK only; ignore Play Console steps.

(The request said "It's Another Thing ... Daily Bot"; I read that as: the product name changes from Rakazo to Daily Bot. Correct me if that is wrong.)

### 5.1 Footprint (measured with `git grep`, read-only)
- 2,639 of 4,319 tracked files contain "rakazo" (case-insensitive), about 15,800 occurrences. `@rakazo/*` workspace imports appear in 1,894 files. About 197 distinct `RAKAZO_*` env vars.
- Identifiers: iOS/Android `com.rakazo.app`, `com.rakazo.app.widgets`, `com.rakazo.app.notifications`; native modules `com.rakazo.notifications|pdfview|filedrop`; Expo `slug: rakazo`, `scheme: rakazo`, `owner: inbox-zero` (`apps/mobile/app.json`); Swift/Kotlin files and modules named `Rakazo*` (`apps/mobile/ios-widgets/RakazoWidgets.swift`, `ios-intents/RakazoIntents.swift`, `modules/rakazo-*`); storage/event keys like `rakazo.session`, `rakazo.spaceId`, `rakazo.inbox-width`, `rakazo-call`.
- Domains: `rakazo.com`, `app.rakazo.com` (~230 mentions) used in code, tests, docs, deep links/universal links (`associatedDomains` in `app.config.ts`).
- Visible brand: `apps/mobile/app.json` `name` and permission strings, `apps/web/index.html` `<title>`, ~44 strings per language in `apps/web/src/locales/*/messages.po` (14 locales) plus `apps/mobile/locales/es.json`, Electron app name (`apps/desktop`), marketing site `apps/www`, README (3 languages), GitHub issue templates, app icon `packages/ui-tokens/assets/Rakazo.icon`, bot "Rakazo" mentions in agent prompts.
- License is Apache 2.0 (`LICENSE`): rebranding and forking are allowed, but keep the license text and copyright/attribution notices and do not imply upstream endorsement; the Rakazo name/trademark is not licensed to you.

### 5.2 Recommended approach: two tiers, display name first
**Tier A: user-visible rebrand only (recommended; ~1-2 days).** Change what people see and leave internal identifiers (`@rakazo/*`, `RAKAZO_*`, module names, storage keys) alone, because renaming them touches ~2,600 files and makes every future upstream sync a conflict storm, which defeats the "keep main pristine, small hooks" rule.
- Centralize the name in one place first: a `BRAND` constant (new `packages/core/src/brand.ts`, e.g. `name: "Daily Bot"`) used by new code; replace visible literals via an override layer rather than rewriting upstream strings where possible. Lingui `.po` source strings are upstream-owned: instead of editing 14 catalogs, either (a) replace the English source strings in the few visible spots with `BRAND.name` interpolation, or (b) post-process catalogs in a branch-only build step. Option (b) keeps diffs out of upstream files but needs a script run in CI/build.
- Mobile (`app.json`): `name`, permission strings (mic/camera/photos/speech/local network), display name on home screen, widget/notification extension display names. Keep `slug`, `scheme`, `owner` initially; add a second URL scheme `dailybot` instead of replacing `rakazo` so existing deep links keep working.
- Web: `apps/web/index.html` title, PWA manifest, sign-in and onboarding copy, empty states, share/invite text.
- Desktop: Electron product name and window titles in `apps/desktop`.
- Marketing site `apps/www`: names, logo, copy; vendor names are allowed there.
- Assets: new app icon (iOS `.icon`, Android adaptive icons in `apps/mobile/assets`, favicon, splash, widget art, Electron icons, social/OG images). Colors: the app is monochrome with ink primary; "bots carry the only identity color", so rebrand mostly means logo/wordmark. If you want a brand color, change it in `@rakazo/ui-tokens` source (the one TypeScript source that generates `tokens.css`), never hardcode.
- Agent persona: check system prompts/instructions (`packages/adapters/src/run-instructions.ts`, bot defaults) that say "Rakazo", and the default bot names/seed data.
- Docs: README (3 languages), issue templates, `.env.example` comments. Keep a line crediting upstream (Apache 2.0 attribution).

**Tier B: full identifier rename (not recommended now).** Bundle id `com.dailybot.app`, extension ids, Swift/Kotlin module names, package scope `@dailybot/*`, env vars, storage keys, Docker image names, domains. Consequences: a new App Store/Play identity (new listing, existing installs and push tokens/keychain/app-group data are lost or need migration), new Apple provisioning for widgets/notifications/CallKit/PushKit, new universal-link domain and `apple-app-site-association`, entitlements, Sentry/EAS/OTA channels, and an automated codemod across ~2,600 files with no clean upstream sync afterward. Only do this if you will publish under your own Apple developer account anyway (see 5.4); even then, prefer changing only the bundle ids and keeping source-level names.

### 5.3 Changes by area
| Area | Tier A | Tier B only |
|---|---|---|
| `apps/mobile/app.json`, `app.config.ts` | name, permission strings, icons, add `dailybot` scheme | bundleIdentifier(s), slug, owner, associatedDomains |
| `apps/mobile/ios-*`, `modules/`, `plugins/` | display strings only | rename files/targets/classes/ids |
| `apps/web` | title, manifest, copy, icons | storage keys (needs migration) |
| `apps/desktop` | product name, icons, update feed | appId, updater (`infra/updater`) |
| `apps/www` | everything | domain |
| `packages/*` | brand constant | package scope, env vars |
| infra / CI (`.github/workflows`, `infra/compose`) | image labels/readmes | image names, registry |
| Locales | handle via BRAND or catalog post-process | n/a |

### 5.4 Risks and dependencies
- Merge conflicts: Tier A is small but touches `app.json`, `index.html`, locale files (high churn upstream). Prefer a branch-only post-process script plus a small number of direct edits; list them in a CONFLICTS note.
- Sync traps: upstream string changes in `.po` files will reintroduce "Rakazo" after each sync; add a CI check on the daily-bot branch that greps built output for "Rakazo".
- App Store/TestFlight: renaming display name is allowed in a normal update; changing bundle id is a new app. Apple review rejects apps that impersonate another brand; Rakazo is a different product, so keep the "based on Rakazo" attribution in About/README, not in the store listing.
- Push/CallKit/PushKit/App Intents and Live Activities depend on bundle and extension ids; do not touch in Tier A.
- Cloud-linked services (`owner: inbox-zero` on Expo, Sentry, app.rakazo.com API, update feed) belong to upstream. If you self-host, the app points at your own server (`server.tsx`), so check which hard-coded `rakazo.com` URLs remain (billing/paywall, links, sign-in domains).
- Trademark/legal: keep Apache-2.0 notices.

### 5.5 Effort
Tier A: 1-2 days for strings/assets plus designer time for the icon/wordmark. Tier B: 1-2 weeks including provisioning and migrations, plus ongoing sync pain.

### 5.6 Test plan
Grep checks (no "Rakazo" in built web bundle, `Info.plist`, Electron `package.json` product fields, locale outputs); existing unit tests that assert brand strings (grep `Rakazo` in `*.test.*`) updated through the constant; mobile Maestro screenshot flows (`.maestro/*.yaml` match on text such as "Sign up for Rakazo", so update them); visual check of icon on iOS, Android, desktop, web; deep link smoke test for old and new scheme.

### 5.7 Open questions
Answered: name Daily Bot; own Apple/Google accounts (bundle ids change); bundle prefix `cc.dailybooth.bot`; domain `bot.dailybooth.cc`. Remaining: (1) logo/wordmark and brand color (placeholder generated meanwhile); (2) how visible upstream attribution should be; (3) with the domain decided, the many upstream `rakazo.com` / `app.rakazo.com` URLs (billing, paywall, update feed, sign-in) must each be repointed or disabled; which of those services do you run yourself?; (4) whether to deploy `apps/www` on the domain.

---

## B6. Phase 6: Instruction and memory consolidation

(TASK.md calls this "Phase 5" in Addendum 3; I number it Phase 6 here because the rebrand already took Phase 5.)

Goal (Trevor's spec): every instruction, routine prompt and memory document holds one current version of each rule, in one place. Conflicts replace, refinements merge, duplicates are skipped, nothing contradictory is appended.

### 6.1 Relevant files and code paths (found)
**Memory**
- Tool defs: `packages/adapters/src/builtin-tools.ts` (~760: `remember` {content, old_text}, described as "Save one short new fact... pass old_text to change or drop"; ~772 `save_shared_memory` {path, content}, full replace). Semantic-memory tools `recall_memory`, `save_memory`, `forget_memory` are filtered in `packages/adapters/src/memory-tools.ts` (`selectMemoryTools`), implemented by providers (`honcho-memory-provider.ts`, `serenity-memory-provider.ts`, `memory-provider-factory.ts`).
- Handlers: `packages/adapters/src/run-tools-memory.ts` (`remember` ~67: one document per bot at `MEMORY_INDEX_PATH`, optimistic revision retry up to 3 on `MEMORY_REVISION_CONFLICT_ERROR`; `forget_memory` ~166; shared-memory handler beside it).
- Logic: `memory-tools.ts` `appendMemoryFact` (append unless an identical line exists) and `editMemory` (append, or replace/remove by `old_text` that must match exactly one entry; refuses growth past `BOT_MEMORY_MAX_BYTES`). **Cap: `BOT_MEMORY_MAX_BYTES = 4 * 1024` (`packages/contracts/src/domain.ts:804`)**, so once full, saves fail. Only exact-line duplicates are caught; there is no semantic conflict check. Memory read into prompts: `memory-context.ts`, history-compaction `recalledMemory` in `executor.ts`.
- Schema (`packages/db/prisma/schema.prisma`): `MemoryDocument` (~1359: spaceId, botId?, scope `isolated|shared`, path, content, `revision`) and `MemoryRevision` (~1379: documentId, revision, content, `sourceRunId`, `sourceThreadId`, createdAt). Revisions already store full content per save with the run/thread that made it; they do **not** store a "why" or an actor type. Scope helper: `packages/db/src/memory-config.ts`; `MemoryScopeSchema` in contracts.
**Bot instructions**
- `Bot.instructions` plus `Bot.instructionHistory` JSON (schema ~725-734; `InstructionVersionSchema` in `packages/contracts/src/domain.ts:95`: id, instructions, reason, createdAt). Writer `packages/db/src/bot-instructions.ts` `writeBotInstructions`: row lock, `expectedInstructions` optimistic check, keeps **20** versions, supports `versionId`/`undo`. So history, reason and undo already exist for instructions.
- Bot self-edit: `packages/adapters/src/run-tools-fleet.ts` `commitOwnInstructions` (~81) "writes this bot's instructions quietly; earlier versions stay restorable"; `own-bot-settings.ts` (read/paging, `prepareOwnBotSettings`); `set_child_instructions` (~237) needs owner approval. **Today a bot's own instruction edits apply without approval**, which the spec wants to change.
**Routines**
- `Routine.prompt` (schema ~1186) edited by `schedule_update` (`run-tools-tasks.ts:203` → `updateScheduleFromTool` in `schedule-tools.ts`), `schedule_create`, `create_child_routine`. **No revision history exists for routines.** Approval gate: `run-tool-gate.ts` (~240 `scheduleNamesNewSite`, mandatory-approval conditions); policy functions in `packages/core/src/action-approval.ts` (`toolRequiresApproval`, `resolveActionApproval`, rules UI in `apps/web/src/components/ApprovalRulesSettings.tsx`); effects ledger `ExternalEffect` (schema ~1160, used for approvals/idempotency); approval ask flow `approval-ask.ts`, `approval-effect.ts`.
- Run state today: routines keep `watchState` JSON (`Routine.watchState`, written by the checker in `routine-watch.ts`) and bots have `ScratchpadItem` (title/status/notes). There is no general per-bot/routine key-value state, so checkpoints go into memory text (the real problem in the email-bot example).
**UI**
- Web: bot settings and instruction history UI under `apps/web/src` (find via `instructionHistory`), approval cards in chat (look at how `external_effects` approvals render in thread components), routine editor. Mobile: `apps/mobile/app/bot-settings.tsx`, `routine.tsx`, `routines.tsx`, thread screen approval sheets. No diff component was found; one is needed (shared in `packages/ui-web` / `packages/chat-ui`, plus a native mobile rendering).

### 6.2 Proposed design
**A. Conflict-check service (provider-neutral, one place).** New `packages/adapters/src/rule-consolidation.ts` with:
- `classifyChange({ kind: "memory" | "instructions" | "routine", existing, proposed, siblingDocs })` returning `{ verdict: "new" | "replaces" | "refines" | "duplicate" | "unresolved", target?, merged, question? }`, implemented with an LLM call through the existing model-role mechanism (new role `consolidation`, cheap model, falls back to main; add to `ModelRoleSchema` like `approval`; see Phase 1/2 for the same pattern). Versioned rubric prompt (per AGENTS.md: LLM judge with an explicit, versioned rubric, calibrated against reviewed examples; deterministic assertions only for structure). Output is structured JSON validated with zod; a malformed or failed judge result = `unresolved`, never a silent append.
- `mergeInto(section)`: rewrites only the affected section, returning the full new document. Deterministic guards after the LLM: size within cap, no "supersedes/previously/formerly" phrases left as notes (checked by the rubric judge, plus a cheap structural check that the removed text is gone), unrelated sections byte-identical.
- Cross-document "one home per rule" check: the pass receives the other two homes' text (instructions, routine prompt, memory) so a duplicate elsewhere returns `duplicate` with a pointer; the bot links or skips.
**B. Memory tools become update-or-replace by topic.**
- `remember` (`run-tools-memory.ts`, `memory-tools.ts`): keep the schema backward compatible but add optional `topic`; handler runs `classifyChange` against the current document before `editMemory`. New fact → append; replaces/refines → rewritten section (no `old_text` needed from the model); duplicate → no-op with `{ ok: true, note: "already stored" }`; unresolved → return `{ question }` so the bot asks the user one short question (requirement 7). Keep `editMemory` as the low-level writer so the byte cap and revision-conflict retry keep working.
- Memory stays auto-applied (spec 4) but every save writes a `MemoryRevision`.
- `save_shared_memory`: same pass (full-replace is the dangerous one: LLM-diff the old and new and refuse silent deletion of unrelated sections).
- Prompt text: update the `remember` description and add a short memory-hygiene instruction (no logs, ids, checkpoints, one-off notes) via a new constant next to, not inside, existing instruction constants.
**C. Run-state store (checkpoints out of memory).**
- New tool `state_get` / `state_set` (key/value JSON, per bot or per routine, size-capped, e.g. 16 KB total and 2 KB per value) in a new `packages/adapters/src/run-tools-state.ts`, registered in `builtin-tools.ts` and `contracts/src/builtin-tools.ts`. Keys are namespaced `routine:<id>:<key>` or `bot:<key>`. Read-only to other bots. Not injected into prompts automatically (the routine reads what it needs) so size never grows the prompt.
- Guard: `remember` rejects or redirects content that looks like state (the LLM verdict `state` → "store this with state_set"). Existing `ScratchpadItem` stays for human-readable task notes.
**D. Propose → diff → approve for instructions and routines.**
- Bot-initiated changes to its own instructions (`commitOwnInstructions` path) and routine prompts (`schedule_update` with `prompt`, `create_child_routine`, `set_child_instructions`) stop applying immediately. They create a **pending change** record and a chat message/approval card showing before/after diff, reason, and Approve / Edit / Reject. Apply only on approval, with the existing optimistic `expectedInstructions` / revision check so a stale proposal fails safely (reuse `InstructionConflictError`).
- Reuse the approval ledger rather than a parallel system: model the proposal as an `ExternalEffect` with `kind: "bot.instructions.update"` / `"routine.prompt.update"` and request = {before, after, reason}, so run resumption, idempotency and the web/mobile approval card already work. Add the diff renderer to the existing approval card by kind.
- Unattended runs (routines, wakeups) cannot ask in the moment: queue the proposal for the user's next visit (notification), never apply. Respect `unattendedTriggerToolRequiresApproval` in `packages/core/src/action-approval.ts`.
- User-initiated edits in the settings UI are unchanged (the user is the approver) but are recorded in history with `actor: "user"`.
**E. Version history for routines; richer history everywhere.**
- Routines: new `routine_revisions` table (or a JSON `promptHistory` mirroring `instructionHistory`; a table is better because routine prompts grow). `RoutineRevision { id, routineId, revision, prompt, name?, crons?, actorType ("user"|"bot"|"consolidation"), actorBotId?, runId?, reason, createdAt }`. Writer `packages/db/src/routine-prompt.ts` modeled on `writeBotInstructions` (lock, expected-prompt check, undo). Keep last N (e.g. 50) with pruning.
- Memory: extend `MemoryRevision` with nullable `reason String?`, `actorType String?`, `actorBotId String?` (additive, safe). Add restore: new `restoreMemoryRevision` repo function that writes the old content as a new revision (history is append-only; "undo restores previous version exactactly").
- Instructions: extend `InstructionVersionSchema` with optional `actorType`, `runId` (zod optional, JSON column, no migration). Raise the 20-version cap or keep and rely on consolidation noting that older ones fall off (open question).
**F. Size budget and scheduled consolidation.**
- New background job `consolidate_bot_documents` using the existing job system (`packages/adapter-kit` job publisher; follow `routine-coalescing.ts`/`routine-backoff.ts` and the scheduled handlers in `background-job-handlers`). Triggers: (1) a save that lands above ~80% of the cap (`BOT_MEMORY_MAX_BYTES` / `BOT_INSTRUCTIONS_MAX_LENGTH` / routine prompt budget), (2) weekly per active bot.
- The job produces a **proposed cleanup** (merged text, dropped stale facts/logs, flagged contradictions) stored as a pending change, shown to the user as a diff, applied only on approval (spec 6). Never auto-applies, even for memory.
- Cross-process safety: claim via Postgres lease per bot (no global queue, per AGENTS.md concurrency rule).
**G. Contradiction questions.** Verdict `unresolved` yields one short question surfaced through the existing `ask_user` mechanism (`approval-ask.ts`), blocking only that write.

### 6.3 Client impact
- Web/Electron: diff component and approve/reject card in thread; history list with restore for instructions, routines, memory (extend the existing instruction-history UI; routines editor gets "History"). Settings badge for pending cleanups. Minimal copy per AGENTS.md: buttons "Apply", "Reject", titles "Instructions change", no explainer text.
- Mobile: native sheet for the diff (Expo UI / native sheet and alert, not custom pills), plus history in `routine.tsx` and `bot-settings.tsx`. Notification for queued proposals from unattended runs.
- Cross-surface: diff computed on the server (`packages/core/src/text-diff.ts`, line- or word-level) and sent as structured hunks so web and mobile render the same result.

### 6.4 DB/schema (all additive, rolling-deploy safe)
1. `routine_revisions` table (+ RLS policies following `20261024150000_model_roles`).
2. `MemoryRevision`: nullable `reason`, `actorType`, `actorBotId`.
3. `bot_state` table: `{ spaceId, botId, routineId?, key, value Json, updatedAt }`, unique on (botId, routineId-or-null, key), RLS, size caps enforced in code.
4. `pending_changes` (or ExternalEffect reuse; prefer reuse for propose/approve, add a small table only for scheduled consolidation proposals): `{ id, spaceId, botId, kind, targetId, before, after, reason, status, createdAt, resolvedAt }`.
5. No drops. Migration timestamps after `20261123120000_account_bot_avatar_set`. Check migration conflicts with upstream on sync (new files only).

### 6.5 Risks
- LLM judgment errors: a wrong "replaces" deletes a rule. Mitigations: auto-apply only for memory; instructions/routines need approval; every write is a revision; unrelated sections must stay byte-identical; judge failures never append silently.
- Cost and latency of an extra model call on every `remember` (use a small model, skip when the document is empty or the fact has no overlap via a cheap retrieval prefilter; batch several `remember` calls per run).
- Approval fatigue: a bot proposing small tweaks often. Rate-limit proposals, coalesce several into one diff per run.
- Unattended routines cannot ask: proposals queue indefinitely; add expiry.
- Behavior change: bots that today edit their own instructions freely will now wait for approval (intended; mention in release notes).
- Memory providers (Honcho/Serenity semantic memory) are opaque stores: conflict checks cover `MEMORY.md` documents; semantic memory needs forget/replace through provider verbs where available, otherwise out of scope in v1.
- Conflict risk on sync: `builtin-tools.ts`, `run-tools-memory.ts`, `run-tools-fleet.ts`, `run-tool-gate.ts`, `schema.prisma` are hot upstream files; keep hooks tiny and logic in new files.
- Race conditions between concurrent runs editing the same document: keep optimistic revision checks and the retry loop.
- Security-sensitive: proposals are authored by a possibly prompt-injected run. Diff must show the full change; approvals must be bound to the exact `after` text (hash), and tainted runs cannot auto-apply anything.

### 6.6 Effort
~4-5 weeks for one engineer:
conflict service + rubric + calibration set 5-6 d; memory tool rewrite 3 d; run-state store 2-3 d; propose/diff/approve incl. web + mobile UI 8-10 d; routine revisions + restore 3 d; consolidation job and cleanup flow 4-5 d; tests 4-5 d. Suggested split: 6a (state store + memory update-or-replace + revision reasons) ~2 weeks; 6b (approval flow + routine history) ~2 weeks; 6c (scheduled cleanup) ~1 week.

### 6.7 Test plan (mapped to acceptance tests)
Deterministic and offline: judge replaced by a scripted fake (like `scripted-voice.ts`), tests assert structured effects. A separate opt-in judge suite with the versioned rubric and reviewed examples measures classification quality (cost reported separately; judge errors count as unqualified, not passes).
1. **"alert me about X" then "stop alerting me about X":** scripted verdict `replaces`; assert memory contains only the latest preference and the old line exists only in `MemoryRevision` (query revisions). Unit on `editMemory` path + `run-tools-memory` handler; postgres test on revisions.
2. **Repeated rule already in routine:** verdict `duplicate` against routine prompt; assert no memory change, response says already stored, no new revision.
3. **Routine saving a checkpoint every run for a week:** simulate 7 daily runs using `state_set`; assert memory document byte-identical and `bot_state` value updated in place (size constant). Plus a guard test that a log-like `remember` is redirected.
4. **Bot proposes routine change:** assert a pending effect with diff exists, `Routine.prompt` unchanged until approve; approve applies once (idempotent), stale `expectedPrompt` rejects; reject leaves unchanged; unattended run only queues.
5. **Undo restores previous version exactly:** for instructions, routine prompt, memory: write A→B, undo, assert content byte-equal to A and history gains a revision (append-only for memory/routines).
Also: cap behavior (80% threshold enqueues one consolidation job, concurrent bots do not block each other), RLS tests for new tables, mobile/web component tests for the diff card, migration additive check. Do not run the desktop Playwright suite locally.

### 6.8 Open questions
1. Should memory preference updates really apply automatically even when the verdict is `replaces` against a long-standing rule, or only when confidence is high?
2. Instructions already allow a bot to rewrite its own instructions quietly today; is flipping that to approval-required acceptable for all bots (including in unattended runs)?
3. How many revisions to keep per document, and for how long?
4. Which model runs the consolidation judge (cheap main-provider model vs the `approval` role model)? Which languages must the rubric handle?
5. Semantic memory providers (Honcho/Serenity): in scope for conflict checks, or only the `MEMORY.md` documents in v1?
6. Where should shared (Space) memory writes require approval, given every bot reads it?
7. Is the state store per routine only, or also per bot, and should users see/edit it in the UI?
8. Is this feature meant to go to upstream (then follow their PR rules: description, copy rationale) or stay in the fork?

---

## B7. Phase 7: Platform improvements from real issues

(TASK.md Addendum 4 calls this "Phase 6"; renumbered Phase 7 here because instruction/memory consolidation is already Phase 6 above and the rebrand is Phase 5.) The logo and visual brand stay **placeholders** (name, domain and bundle prefix are decided); every user-facing string below is a working title.

Cross-references: item 3 (consolidation, run-state store) = **Phase 6**; item 5 (faster calls) = **Phases 1-2**. Not repeated here.

### 7.0 Suggested priority order
1. **Item 4 tool error visibility** (small, unblocks diagnosing everything else; ~3-4 d).
2. **Item 2 connector reliability** (limits + retry/backoff in the platform; ~1 wk). Removes retry rules from prompts immediately.
3. **Item 9 setup UX fixes** (independent small wins; memory-cap warning first; ~1 wk total). Memory cap raise pairs with Phase 6a.
4. **Item 6 routine settings** (mostly UI plus one "quiet" flag; ~3-4 d).
5. **Item 7 usage and budgets** (needs aggregation + alerts; ~1.5 wks).
6. **Item 8 safer connector defaults** (~1 wk).
7. **Item 1 native Gmail push** (biggest win but biggest build; ~3 wks; needs your own Google OAuth client and Cloud Pub/Sub). Do it after 2 and 4 so the new connector inherits limits and error logging, and after Phase 6a so routines have the state store.
Then Phase 6, then Phase 1/2 per the main order. Rationale for pulling item 1 last of this phase despite "biggest win": it is the only item that needs external setup (Google Cloud project, Pub/Sub, the server reachable at `bot.dailybooth.cc`). The domain now exists, so the blocker is hosting and Google setup, not the name. A cheap interim win: convert Mailey to a no-model `watch` routine now (see 7.1).

### 7.1 Item 1: Event-driven email instead of polling
**Decided context:** Mailey is a 15-minute timer routine, i.e. 96 full model runs a day today; the goal is a push that fires the routine only when mail arrives. The push endpoint lives on the decided domain, e.g. `https://bot.dailybooth.cc/api/v1/mail/push` (path is a placeholder; Pub/Sub push needs HTTPS with a valid certificate and the endpoint domain verified in Google Cloud Console). **Today (found):** no native Gmail integration. Gmail is reached through managed connectors (`packages/adapters/src/composio-connector.ts`, `pipedream-connector.ts`) or MCP (`mcp-connector.ts`). "When something changes" routines are polled by a checker: `RoutineWatchSchema` in `packages/contracts/src/routine-watch.ts` (kinds `files|command|tool`, `everyMinutes` default 15, min 5, `track` fields, fingerprint compare) run by `packages/adapters/src/routine-watch.ts`, state in `Routine.watchState`. Inbound triggers already exist for webhooks and GitHub: `apps/api/src/webhook.ts`, `github-webhook.ts`, `webhook-inbound.ts` (`deliverWebhookEvent`, `formatWebhookPrompt`, `Routine.webhookEnabled/githubEnabled`).
**Changes:**
- New provider-neutral contract `packages/contracts/src/inbound-events.ts` ("mail.received" with message ids, account ref, no vendor names) and an adapter-kit interface `PushSource { watch(account), stop(account), handleNotification(req) → events, listSince(cursor) }`.
- New adapter `packages/adapters/src/gmail-mail.ts` (the only place the vendor appears; dynamic `import()` only when configured; uses Google's REST API directly with the user's OAuth client): `users.watch` on a Pub/Sub topic, renew before the 7-day expiry (job), on notification call `users.history.list` from the stored `historyId` and emit only new message ids; on `historyId` too old (404) fall back to a bounded list and mark a `gap` event.
- Inbound route `apps/api/src/mail-push.ts` modeled on `webhook.ts` (verify the Pub/Sub OIDC token, bounded body, return fast, enqueue). Fires routines with trigger type `mail` carrying only message ids/headers as untrusted data (see `formatUntrustedDeliveryPayload`). Routine setting: "Run when new mail arrives" (new `RoutineSchema` field or `watch.kind = "event"` variant; additive).
- Interim/fallback with no code for push: convert Mailey's timer routine to a `watch` routine (`kind: "tool"`, read-only Gmail tool fingerprint every 15 min via `routine-watch.ts`), which already runs **no model** when nothing changed. This is a quick win while the native push is built. Also the history-API poll as a new `watch` kind.
- OAuth: reuse `ConnectionAuthProvider` (`adapter-kit/interfaces.ts:272`) and the account model in `connector-accounts.ts`; scopes `gmail.readonly` (+ `gmail.modify` only if organizing is wanted; start read-only).
**DB:** additive `mail_watch` table (accountRef, historyId, expiresAt, topic), RLS like other tenant tables. **Client:** routine editor toggle on web and mobile, connection flow in integrations (`apps/mobile/app/(settings)/integrations.tsx`, `integration-setup.tsx`, `apps/web/src/pages/IntegrationSetup.tsx`).
**Risks:** (domain is now decided, so a public endpoint is possible; it still requires the server to be reachable at `bot.dailybooth.cc` over HTTPS) Google OAuth verification for restricted Gmail scopes (a security assessment can be required for apps beyond test users; for a personal/self-hosted client in "testing" mode refresh tokens expire after 7 days unless published); public HTTPS endpoint needed for push (now `bot.dailybooth.cc`; confirm the server is reachable there); watch renewal failures silently stopping events (needs health surface); quota; prompt-injection through email content (treat as untrusted, keep tainted-run rules).
**Effort:** ~3 wks (adapter 1 wk, inbound + renewal job 4-5 d, routine trigger + UI 4 d, tests 3 d). **Tests:** offline conformance with recorded Gmail/PubSub fixtures; history gap fallback; duplicate/replayed notifications idempotent (`ExternalEffect`-style key per historyId); renewal job; routine receives only new ids; RLS. **Open questions:** Where is the server hosted behind `bot.dailybooth.cc`? Read-only or modify scope? Test-mode OAuth acceptable (7-day refresh-token expiry) or publish/verify?

### 7.2 Item 2: Platform-level connector reliability
**Today:** `ConnectorProvider.execute` (`adapter-kit/interfaces.ts:252`) streams events; per-provider code in `composio-connector.ts`, `pipedream-connector.ts`, `mcp-connector.ts` (some discovery backoff at ~477-562 and `408/429/5xx → "unreachable"` at ~153), `connector-http.ts`, `composio-batch.ts`. The only generic limiter found is model-side (`groq-request-budget.ts`). No per-connector concurrency or rate limit and no retry on tool calls; `isRetryableError` exists in `@rakazo/core` (used by ActivityList).
**Changes:**
- New `packages/adapters/src/connector-limiter.ts`: a wrapper `withConnectorLimits(provider, policy)` that enforces per-connector (kind + account) max concurrency and requests/second (token bucket), queues FIFO per key only (AGENTS.md: limit the specific resource, never a global slot), and retries `429`/`5xx`/timeouts with exponential backoff plus jitter honoring `Retry-After`, bounded attempts and total time, then surfaces a typed error (`rate_limited`, `timeout`, `auth`, `quota`) to the bot instead of a raw one. Only idempotent/read calls auto-retry; writes retry only with an idempotency key or when the failure happened before sending (reuse `ExternalEffect.idempotencyKey` semantics in `approval-effect.ts`).
- Cross-instance coordination: for multiple API instances, a Postgres lease/counter per (connector, account) for the rate window (AGENTS.md); in-process bucket first, DB lease only where a provider documents account-wide quotas (Gmail).
- Policy source: defaults in code per connector kind, overridable in connector settings (additive JSON on the connection/credential row); wired in the composition root where providers are built (find in `apps/api/src/app.ts`/`router.ts` setup; hook is one line per provider).
- Prompt hygiene: remove nothing automatically, but add the typed errors to tool results so bots stop writing retry rules.
**DB:** optional additive `connector_limits` JSON column; rate-window lease table only if multi-instance need is confirmed. **Client:** none in v1 (advanced limits UI later, progressive disclosure per AGENTS.md).
**Risks:** retries multiply side effects on writes; head-of-line blocking if limits too low; hidden latency (report waiting in the Activity panel, item 4); streaming `execute` makes mid-stream retry tricky (retry only before the first event). **Effort:** ~1 wk. **Tests:** deterministic fake provider returning 429 with `Retry-After`, timeouts, concurrency caps with fake timers; write-call no-retry unless safe; per-key isolation (one connector throttled does not slow another); cross-instance lease test (postgres). **Open questions:** default limits per connector kind? Should writes ever auto-retry? Surface wait time to the model?

### 7.3 Item 4: Tool error visibility
**Today:** failures log as a bare name ("connectors_execute_tool: error"). Tool gate/dispatch in `packages/adapters/src/run-tool-gate.ts`, `run-tools.ts`, executor; secret redaction via `redactSecrets` (`@rakazo/core`). UI: `apps/web/src/pages/ActivityList.tsx` (+ `activity-list-filters`, `RunActivityRow` in contracts, `activitySections`), `RoutineRunHistory.tsx`; API `apps/api/src/routes` (runs/activity).
**Changes:**
- Central hook in the single tool-dispatch point (find the wrapper around connector/builtin execution in `run-tools.ts`/executor; one call): `logToolFailure({ runId, botId, tool, kind, code, redactedMessage, durationMs })` using `getLogger()` and `redactSecrets(message, ctx.secrets)`; truncate to ~500 chars, strip URLs' query strings and tokens. Message text in the DB stays as is (it is encrypted); this adds a **separate redacted, non-encrypted error summary** on the tool-call record: new nullable `errorCode`, `errorSummary`, `durationMs` columns on whichever table stores tool calls/events (locate: run events / `ExternalEffect.result`). Typed codes from item 2 (`rate_limited`, `timeout`, `auth`, `quota`) make the summary meaningful.
- Per-bot **Activity** panel: extend `ActivityList` with a bot filter view (already has filters) showing recent runs, tool calls, errors and duration; add a tool-call drill-down per run (`RunActivityRow` gets `toolCalls[]`). Mobile: new `apps/mobile` screen via native list; reuse contracts. Minimal copy.
**Risks:** leaking secrets/PII in error strings (redaction tests required; allowlist of error fields instead of raw bodies), log volume, storage growth (retention e.g. 30 days). **Effort:** ~3-4 d logging + schema; panel +3-4 d. **Tests:** redaction (secrets in message, URL tokens), every failing tool path logs once with name+code, panel rendering with fixture rows, retention job. **Open questions:** where do you want logs visible (server logs only vs in-app)? Retention? Privacy stance on error text for managed/hosted use.

### 7.4 Item 6: Routine settings
**Today (already present):** `Routine` has `modelProvider`, `modelId`, `thinkingLevel` (null = bot's model; `RoutineSchema` in `domain.ts` ~520) and `notify`; `watch.loud`; run history UI `apps/web/src/pages/RoutineRunHistory.tsx`; executor reads the routine override. So **per-routine model/thinking mostly exists in the backend**; gaps are likely UI exposure on all surfaces, a cheap-model default, a "stay silent unless something to report" flag, and a success/failure history summary.
**Changes:**
- Silent switch: new `Routine.quietUnlessReport Boolean @default(false)` (additive). In `executor.ts`/run finalization (new helper `packages/adapters/src/routine-quiet.ts`): append a short routine instruction ("If there is nothing to report, end with the token NO_REPORT") and when the run's final text is exactly that sentinel, suppress notification and chat message, mark run `quiet` in history. Prefer a structured tool `routine_report(has_news, summary)` over a text sentinel for reliability; LLM-judge not needed since it is a structured contract.
- UI: routine editor shows model + thinking picker (reuse role pickers from `ModelRoleSettings.tsx` / mobile `models.tsx`), the quiet switch, and per-run success/failure/quiet badges with duration (web `RoutineRunHistory.tsx`, mobile `routine.tsx`/`routines.tsx`). Contracts: `CreateRoutineInput` + `schedule_create/update` tool args add `quietUnlessReport`, `modelId`, `thinkingLevel`.
- Cheap-model suggestion: when creating a routine, default to the `routine` model role if set (new role like `approval`; pattern in Phase 1B) else bot model.
**DB:** one additive boolean (and `Run.quiet` or status variant). **Risks:** a quiet routine that fails silently (failures must always notify); sentinel misuse; model choice affecting tool-use quality. **Effort:** ~3-4 d. **Tests:** quiet run suppresses notify and message, failures always notify, history shows states, tool arg validation. **Open questions:** one global "routine model" role or per routine only? Should failures notify immediately or batched?

### 7.5 Item 7: Usage and budgets
**Today:** `UsageRecord` (`packages/db/prisma/schema.prisma` ~1636: botId, runId, provider, model, token buckets, `costUsd`, `costSource`) written by `packages/db/src/usage.ts` `recordUsage`; API `usage.list` / `usage.summary` in `apps/api/src/routes/content.ts` (~115-146); provider usage parsers (`openrouter-usage.ts`, `pi-usage.ts`). UI exists in Billing/account settings (`BillingSettingsPanel.tsx`; confirm the usage view). Routine attribution is available via `runId → run.routineId`; `UsageRecord` has no routineId column (join through runs).
**Changes:**
- Aggregation queries per bot and per routine (daily/monthly) in `packages/db/src/usage-summary.ts`; extend `usage.summary` contract with `groupBy: bot|routine|model`, `period`.
- Budgets: new `UsageBudget { spaceId, userId, scope (account|bot|routine), scopeId?, period (day|month), tokenLimit?, costLimitUsd?, warnAt (e.g. 80%), action (alert|fallback|pause) }`. Evaluator job after `recordUsage` (cheap increment check) raises alerts via existing notification path and enforces action: `alert` → notification, `fallback` → switch to the fallback model, `pause` → hold new runs with a clear message.
- Free-tier awareness: provider caps are provider-specific; model it as a generic budget the user (or a catalog field) sets, e.g. "10M tokens/day", not a vendor-named setting. Automatic fallback: reuse model backups (`ModelBackupChoice`, `packages/contracts/src/model-backups.ts`, model roles ordering) so when usage crosses X% of the daily budget the executor selects the next backup / a cheaper role model (hook in `selectConfiguredModel`, `model-roles.ts`).
- UI: usage page with per-bot/routine bars, budget editor, alert banner; web `BillingSettingsPanel`/new `UsagePanel`, mobile settings screen with native controls. Minimal copy.
**DB:** additive `usage_budgets`, optional `Run`-keyed index. **Risks:** counting accuracy across providers (cost null for some; use tokens as primary), race conditions near the limit (soft limit), surprising fallbacks (always notify), stale caches. **Effort:** ~1.5 wks. **Tests:** aggregation correctness with fixture records, threshold crossing fires one alert only, fallback selection deterministic, paused state message, RLS. **Open questions:** token or dollar budgets first? Hard-stop or soft? Who is alerted (owner only)? Free-tier cap source: user-entered or from provider headers?

### 7.6 Item 8: Safer defaults for connectors
**Today:** approval policy engine `packages/core/src/action-approval.ts` (`toolRequiresApproval`, `connectorToolRequiresApproval(toolName, readOnly)`, rule resolution), rules store + UI (`ApprovalRulesSettings.tsx`, `apps/api/src/routes/account.ts` `approvalRules.*`), connector install: `installed-connectors.ts`, `connector-registry`, `connector-safety.ts`, setup UIs listed in 7.1. Connector tools can declare read-only (`declaredReadOnlyFor`).
**Changes:**
- On install, compute suggested rules from tool metadata (read/list/search/label/archive → `always_allow`; send/delete/pay/settings → `require_approval`) in `packages/core/src/connector-approval-presets.ts`; show as a pre-checked list in the install flow, saved through the existing `approvalRules.set` API. Heuristic classification uses declared read-only hints first, then names; ambiguous tools default to ask.
- Per-bot limit in the install flow: a bot multi-select writing the connector's bot scoping (find where tool exposure per bot is stored; if absent, additive `ConnectorBotAccess { connectionId, botId }` table) and enforced in tool discovery (`installed-connectors.ts`).
- UI: web `IntegrationSetup.tsx`, mobile `integration-setup.tsx`: one step "Allow reading, ask before changing" with a toggle and a bot picker; default on.
**Risks:** wrong classification marking a destructive tool as allowed (fail closed; only allow with explicit read-only hint or known verbs); breaking existing connectors' behavior (apply to new installs only); per-bot scoping interacting with Spaces/teams. **Effort:** ~1 wk. **Tests:** classification table tests per verb, new install produces expected rules, existing installs untouched, scoped bot cannot see the connector's tools, approval still required for sends. **Open questions:** apply presets to existing installs via a one-time prompt? Per-bot scoping at connection or tool level?

### 7.7 Item 9: Setup UX fixes
1. **MCP form always shows OAuth fields; File toggle obvious; presets.** `apps/web/src/pages/McpServersOverlay.tsx` (`needsOAuthClient` ~82 hides fields until health is `MCP_OAUTH_CLIENT_REQUIRED`; `oauthEnvReference` ~63). Change: always render Authorization server and Scopes (collapsed "OAuth" group, open by default when the URL transport is HTTP); make the env-var "File" toggle a labeled control instead of an icon; add a presets list (new `packages/contracts/src/mcp-presets.ts`, data only: name, command/url, args, env keys, auth hints). Mobile equivalent screen if present under `apps/mobile/app/(settings)/`. Effort ~2-3 d. Tests: component tests for fields visible without client id, preset fills form, file toggle labeled.
2. **Refresh app settings after a server restart without full reload (STDIO option missing).** Capabilities/settings are fetched once; add refetch on reconnect/focus and when the server instance id/boot time changes (a `serverBootId` in the capabilities payload from `apps/api/src/routes/context.ts`/`shared.ts`; client in `apps/web/src/lib/rpc.ts`/query keys: invalidate on change; mobile same on foreground). Effort ~1 d. Tests: boot id change triggers refetch.
3. **"Use space default" must not clear thinking level.** Locate the bot model editor (`apps/web` bot model UI, `apps/mobile/app/bot-model.tsx`, update path `packages/db/src/bot-update.ts`, selection in `selectConfiguredModel`: today `thinkingLevel` is dropped when the override is dropped/`null`). Change: choosing the default clears only provider/model, keeps the thinking level unless the user changes it (or applies it to the default model per the "main model's effort belongs to that model" comment in `model-roles.ts`; decide semantics). Effort ~0.5-1 d. Tests: update with model=null preserves thinkingLevel; unit on `bot-update.test.ts` and `model-selection.test.ts`.
4. **Add a model not in the built-in catalog.** Catalog: `packages/adapters/src/pi-live-catalog.ts`, `pi-catalog-availability.ts`, `model-catalog-bump.yml` workflow (upstream refreshes it), pickers (`ModelSettingsOverlay.tsx`, mobile `model-picker.tsx`). Change: a "Custom model id" entry in the picker that validates against the provider connection (call a cheap test request through the shared connection settings; no provider-specific env vars per AGENTS.md) and stores it as a normal role choice with default capabilities (context window/vision unknown → conservative), shown as unverified. Effort ~2-3 d. Tests: custom id accepted with a fake connection, capability defaults, not sent through catalog-only checks (`modelSupportsRole`).
5. **Memory cap raise or warn.** `BOT_MEMORY_MAX_BYTES = 4 * 1024` (`packages/contracts/src/domain.ts:804`), enforced in `editMemory`; the tool description hardcodes it. Change: (a) raise to e.g. 16 KB (watch token cost: it is injected each run; ties into Phase 6 consolidation), (b) warn the bot at 80% (return `{ ok, warning: "memory 85% full" }` from `remember`) and the user in memory settings (`MemorySettingsOverlay.tsx`). Raising is a one-constant change but a prompt-size cost for every run, so pair with Phase 6. Effort ~0.5 d. Tests: `memory-tools.test.ts` boundary cases, warning threshold.

### 7.8 Cross-cutting
- **DB (all additive):** `mail_watch`, `usage_budgets`, `connector_limits` (or JSON), `Routine.quietUnlessReport`, tool-call error columns, optional `ConnectorBotAccess`. Timestamps after the newest upstream migration; no drops, rolling-deploy safe.
- **Vendor-name rule:** Gmail/Google/Pub/Sub names only inside `gmail-mail.ts` and its tests; contracts say "mail".
- **Placeholders:** any new copy uses the working product name through the brand constant from Phase 5 (`packages/core/src/brand.ts`); no logo/domain decisions. Pub/Sub push endpoint and OAuth redirect hosts are configuration placeholders until a domain exists.
- **Sync conflict hotspots added:** `McpServersOverlay.tsx`, `ActivityList.tsx`, `RoutineRunHistory.tsx`, `domain.ts`, `run-tool-gate.ts`/`run-tools.ts`, `action-approval.ts`, `connector registry/installed-connectors.ts`. New logic lives in new files (`connector-limiter.ts`, `gmail-mail.ts`, `routine-quiet.ts`, `usage-summary.ts`, `connector-approval-presets.ts`, `mcp-presets.ts`).
- **Effort total:** ~8-9 weeks sequential; items 4, 2, 9 (~2.5 wks) deliver most of the day-to-day pain relief.

### 7.9 Open questions (Phase 7)
1. Mailey: cron routine or `watch` routine today? (Decides how much item 1 saves.)
2. Where is the server hosted behind `bot.dailybooth.cc`, so Google can reach the Pub/Sub push endpoint? (Interim: convert Mailey to a no-model `watch` routine.)
3. Default connector limits and whether writes may ever auto-retry.
4. Where should error detail be visible: in-app Activity only, or server logs too, and for how long?
5. Budget unit (tokens vs dollars) and hard vs soft stop; what should happen at the cap.
6. New "routine model" role, or per-routine override only?
7. New memory cap value, and whether to raise it before Phase 6 ships.

## B8. Phase 8: Cross-space messaging between a user's own bots

Source: TASK.md Addendum (Phase 8). Checked read-only against `upstream/main` at `b89cac3a`.

### 8.0 Upstream check (what is and is not there)
- **Not built upstream.** `messageBot` in `packages/adapters/src/bot-messages.ts` still looks up candidates with `spaceId: run.spaceId` (lines ~100-107). `bot-messages.ts` and `packages/db/src/cross-space-communication.ts` are byte-identical between our base `4044a65d` and upstream, so there is no conflict yet.
- **Your diagnosis is confirmed.** `crossSpaceCommunicationAllowed` is called only from `agent-connections.ts`, `apps/api/src/messaging-inbound.ts` and `apps/api/src/routes/messaging.ts` (all chat-app paths). `message_bot` never calls it. `docs/spaces.md` line 24 already claims bots can talk across spaces with the toggle on, so the docs are wrong today.
- **The pattern we need already exists.** `messageConnectedAgent` in `agent-connections.ts` wraps delivery in `runAsSystem("deliver a message to a connected agent in another Space", ...)`, locks both threads in sorted order, then calls `crossSpaceCommunicationAllowed(tx, sender.id, target.id)` (it locks both bot rows `FOR NO KEY UPDATE`, so a toggle-off update blocks behind it), then writes the target-side task, run and event with the **target's** `spaceId`. Phase 8 reuses that shape inside `messageBot`; it does not invent a new one.
- **Default is on for new bots upstream (#2977), DECIDED: off in the fork.** Trevor wants the existing toggle (no new toggle), off by default, and delivery only when **both** bots have it on. Upstream changed the default in four hot files (schema, `domain.ts`, `repos.ts`, both UIs), so we do not revert them: the bot-creation path passes `crossSpaceCommunication: false` from a fork constant (see C2, design 4). Existing bots are untouched.
- **#1346** (closed upstream as "spaces are isolation boundaries") is the opposite design decision. Treat this as fork-only; do not plan to upstream it.

### 8.1 Where the code has to change (all at `messageBot`, read at upstream)
1. **Lookup** (`bot-messages.ts` ~100): keep the same-space query first. Only if it finds nothing, run a second query as the same `userId`, `archivedAt: null`, `spaceId: { not: run.spaceId }`, and `crossSpaceCommunication: true`, selecting space name. Only count toggle-on bots, and only when the sender's own toggle is on, so a blocked bot is never named in an ambiguity error. `resolveBotAddress` (core) returns `undefined` for both "not found" and "two matches", so add a small helper that distinguishes them (new file, not an edit to `core`). Ambiguity returns an error listing "name (space)" and asking for `bot_id`.
2. **Space context.** Run the cross-space lookup and the delivery transaction under `runAsSystem("deliver a message to another bot of the same user in another Space", ...)`, exactly like agent connections. The same-space path stays as it is today.
3. **Delivery transaction.** After the existing sorted thread locks, call `crossSpaceCommunicationAllowed`; on false return the same "no bot found with that id or name". Then the target-side writes need the target's space: `task.create`, `run.create`, and the inbound `appendEventInTransaction` use `target.spaceId` (today all six uses are `run.spaceId`, lines ~184-276). The `stillAddressable` re-check (line ~202) must look the target up by id and user in its own space. Sender-side writes (echo message, sender event, `senderStillRunning`) stay in the sender's space. This is a handful of one-token changes, not a refactor.
4. **Encryption.** The inbound message goes through `createThreadMessageInTransaction` with the target thread id, which is what agent connections do today. **Verify at build time** that it picks the key from the thread's space and not from ambient context; the test "decrypted in the target space" covers it.
5. **Replies.** `returnBotMessageOutcome` (line ~375) checks the requester with `spaceId: run.spaceId`, then calls `messageBot`, which will now find the peer cross-space. Change only that requester lookup to the same two-step rule. Hop limit (`nextBotMessageHop`) and `returnsToSender` logic stay unchanged. Manual `intent: "result"` replies work through the same lookup.
6. **Roster / discovery.** `executor.ts` ~1710 builds the teammate list from the current space only. When the run's bot has the toggle on, add a second query (other spaces, same user, toggle on, not archived, has a thread, capped by `BOT_DIRECTORY_LIMIT`) and render a separate block "Bots in your other spaces" with name, space name and description, using `formatBotRosterLines` for the escaping. New file `packages/adapters/src/cross-space-bots.ts` holds the query, the lookup helper and the renderer; `executor.ts` gets a one-line hook. Also add one sentence to the `message_bot` description in `builtin-tools.ts` (~1686).
7. **Turning it off.** No new code: the existing row lock plus `crossSpaceCommunicationAllowed` inside the transaction gives "no delivery after the toggle-off commits". Add the race test from the addendum.
8. **Docs.** `docs/spaces.md` (line ~24), `docs/groups.md` (line ~32), and check `docs/bots-and-chats.md` (line ~52) for the toggle wording. State exactly: your own bots across your spaces via `message_bot`, plus chat-app agent connections to other people's bots.

Untouched by design: agent connections, groups and `group-handoff.ts` (it also calls `resolveBotAddress`), same-space behaviour, and anything across users.

### 8.2 Files (and upstream-sync exposure)
- Modify: `packages/adapters/src/bot-messages.ts` (**medium conflict risk**, touched by few upstream PRs so far), `packages/adapters/src/executor.ts` (**hot file**, one-line hook), `packages/adapters/src/builtin-tools.ts` (one sentence), three docs.
- New: `packages/adapters/src/cross-space-bots.ts`, its test, and new Postgres test cases beside `cross-space-communication.test.ts` and `bot-messages.test.ts`.
- No schema change, no contracts change, no UI change, no native build.

### 8.3 Effort
About 3-4 engineer-days: lookup and delivery 1.5, replies and roster 1, tests (unit + Postgres) 1-1.5, docs 0.25. Risk is in the tests and the encryption verification, not the code volume.

### 8.4 Test plan
Maps one-to-one to the addendum list: same-space unchanged; two spaces both on (target thread shows the decrypted message, task and run carry the target space id); either off gives "no bot found" and writes nothing; toggle-off racing an in-flight delivery (use two transactions, as `cross-space-communication.test.ts` does); other user's same-named bot never found; ambiguity lists both spaces, `bot_id` works; reply reaches the sender across spaces and the hop limit still stops loops; roster shows peers only when both toggles are on. Add: a blocked bot is not named in the ambiguity error; a same-space name match wins over a cross-space one.

### 8.5 Risks
- **Prompt-injection reach.** A bot that reads untrusted web or email content can now steer a message to a bot in another space, which may have different tools and connectors. The message is only text and the target still runs its own approvals, but the blast radius grows. Mitigations: tool-call approvals are unchanged, and the sender sees a "(space)" label in its echo (optional, small). The fork default is off, so this only applies to bots you switch on.
- **Spaces vs organizations (explained for Trevor).** In upstream a Space always belongs to an *Organization* (`Space.organizationId`). Since #3211 a person can own several organizations and switch between them from the account menu; each has exactly one member (its owner) and its own billing. Most people have exactly one, created at sign-up, and everything they think of as "spaces" lives inside it. So unless you created a second organization, this question does not apply. Recommendation: require the sender's and target's spaces to share an `organizationId` (one extra condition in the lookup), so a second organization can never leak into the first. Cost: nothing for the single-organization case.
- **Metadata exposure.** The roster shows other spaces' bot names and descriptions to the sender. Confirm these are not encrypted per space; if they are, read them under `runAsSystem` and decrypt with the right key, or show names only.
- **Rolling deploy.** No schema change, so the old and new release behave compatibly.

### 8.6 Open questions
See `TREVOR_TODO.md` section 6b.

---

# Part C: Staying in sync with upstream, and running the server

## C0. Plain-English summary for Trevor (read this first)

**The situation.** Your project is a copy ("fork") of Rakazo. The Rakazo team changes theirs constantly: about 1,800 changes in the last 30 days, roughly 60 a day, and 55 since the copy you have. You want their new features without losing your own changes. There is one way to make that painless: **keep your changes small and in your own files**. Everything below follows from that.

**Three words.**
- *Merge* = "bring their new changes into my branch, keep my history as it is." Safe; you can always see exactly what happened.
- *Rebase* = "replay my changes on top of their latest, rewriting my history." Neater to read, but it rewrites history you've already pushed, and with changes arriving this fast it forces you to re-fix the same conflict over and over.
- *Conflict* = both sides changed the same lines of the same file. A person (or Codex) must choose. Two changes to different lines of the same file are *not* a conflict; git joins them silently.

**What I recommend.**
1. **Merge, don't rebase.** Merge upstream into `daily-bot` once a day (or at least twice a week). A conflict fixed once stays fixed (git remembers, via `rerere`); with rebase you'd fix it again at every step. Never rewrite history on `daily-bot`.
2. **Little and often.** A one-day merge is usually 40-60 commits and a handful of files. A one-month gap is a day of work. Daily keeps each merge to roughly 15-30 minutes, mostly Codex running the checklist and you doing nothing.
3. **Your changes go in new files.** Where your code must touch an upstream file, it is one or two lines that call into your file. Upstream files stay almost identical to theirs, so most merges have nothing to conflict with.
4. **Codex does the sync, you approve.** Codex runs the procedure in C3 and reports; you say "go" before it pushes. It never force-pushes.
5. **No GitHub Actions needed.** A small script run by hand, or by a scheduled job on your Mac or server, does the fetch-and-test (C4).

**Where conflicts will still happen** (and why that's fine): the handful of files upstream edits every day and that we must hook into. There are about eight (C2). Expect a small conflict every week or two, usually 1-5 lines.

**Decisions I need from you** are in `TREVOR_TODO.md` section 0.

## C1. How we structure our changes (rules for every phase)

1. **New files first.** Logic lives in new files named for the feature (`cross-space-bots.ts`, `call-turn.ts`, `brand.ts`). Upstream can never conflict with a file it doesn't have.
2. **Thin hooks.** In an existing file, add at most a few lines: an import and a call. No reformatting, no moved code, no renamed symbols, no "while I'm here" cleanups. Formatting changes in a hot file are the single biggest cause of avoidable conflicts.
3. **Hook once per file, in a stable spot.** Put the hook at an anchor upstream rarely touches (a function boundary, an array of registered items), not in the middle of a 400-line function.
4. **Config over edits.** Fork behavior that is a setting (cross-space default off, brand name, call model) is a constant in one fork file read by the hook, not an edit of upstream defaults.
5. **Additive schema in separate files.** New tables and columns only. Our Prisma models go in a second schema file (C2, item 5) so `schema.prisma`, which changes ~3 times a day, stays identical to upstream. Migration folder names carry a fork marker (`..._dailybot_*`) and are always timestamped after upstream's newest.
6. **Never hand-edit generated files.** Locale files (`apps/web/src/locales/*/messages.po`, `apps/mobile/lib/locales/*.ts`) change on nearly every upstream commit and `pnpm-lock.yaml` ~80 times in 30 days. We do not edit them by hand. After a merge we regenerate them with upstream's own commands and keep upstream's version when they conflict.
7. **Tests that guard the hooks.** For each hook, one small test that fails loudly if upstream moves or removes the anchor ("seam test"), so a bad merge shows up in CI-style checks, not in production.
8. **Avoid:** renaming `@rakazo/*` packages or `RAKAZO_*` variables (touches ~2,600 files and every future upstream file), reordering imports, editing docs wording we don't need to, and copying an upstream file into a new one (it silently stops getting upstream fixes).

## C2. Hot files and how each phase touches them

Counts are upstream commits touching the file in the last 30 days (`git log --since=2026-10-04 upstream/main`).

| File | Changes / 30 d | Our phases | Plan |
|---|---:|---|---|
| `packages/adapters/src/executor.ts` | 153 | 1, 2, 8 | **Highest risk.** One hook for the call turn (calls into `call-turn.ts`), one for the cross-space roster. Nothing else. |
| `packages/db/prisma/schema.prisma` | 103 | 6, 7 (and 2 if `call_sessions`) | Do not edit. Use a second schema file (item 5 below). |
| `apps/web/src/locales/*/messages.po`, `apps/mobile/lib/locales/*.ts` | 100-240 each | 3, 5, any copy | Never hand-edit; regenerate; keep upstream's on conflict. |
| `packages/contracts/src/domain.ts` | 119 | 6 (memory cap), 7 | Put new constants in new `packages/contracts/src/dailybot.ts`; the cap change is one line, or an override read from our file. |
| `apps/api/src/app.ts`, `router.ts`, `contracts/rpc.ts` | 114, 106, 91 | 2, 6, 7 | Register new routes with one line each from a new `dailybot-routes.ts`. |
| `apps/mobile/app/thread.tsx` | 125 | 2, 3 | Avoid; mount call and dictation from new components. |
| `packages/adapters/src/builtin-tools.ts` | 67 | 6, 8 | One-sentence description edits only; new tools go in new files and register with one line. |
| `apps/mobile/components/thread-composer.tsx` | 15 | 3 | One hook for the mic button, which renders a new component. |
| `apps/mobile/app.json` | 21 | 3, 4, 5 | **Do not edit.** Brand and bundle ids go in an overlay (item 6 below). |
| `packages/core/src/action-approval.ts` | 33 | 6, 7 | Hook into one function; new policy in a new file. |
| `apps/web/src/pages/McpServersOverlay.tsx` | 21 | 7 | Presets in a new file, one import. |
| `call-session.ts` (mobile 18, web 13), `apps/api/src/voice.ts` (14) | 13-18 | 1, 2 | Phase 1 changes should be in new files that the existing call code calls; edit existing lines only where unavoidable. |
| `packages/adapters/src/bot-messages.ts` | 5 | 8 | Moderate edits OK; rarely changes upstream. |
| `model-roles.ts` (contracts, adapters) | 4 each | 1, 2, 6, 7 | Add all new roles in one small commit (see A3). |

### Phase designs that change because of this (4 changes)
1. **Phase 5 (rebrand) must not rewrite source strings.** Rewriting "Rakazo" in UI text would change translation keys and conflict in every locale file on every sync. Instead: change only the *displayed* name through one brand constant plus an overlay applied at build time (for web: replace the display name in the compiled catalogs; for mobile: a tiny text-wrapper hook), and leave source strings and locale files identical to upstream. Codex should measure the options in the first sprint; if the build-time replacement proves unreliable, fall back to editing only the English source strings and accepting small `.po` conflicts.
2. **Mobile identity goes in an overlay, not in `app.json`.** `apps/mobile/app.config.ts` already post-processes `app.json` (it runs as a function over the config). Add one new file, `apps/mobile/daily-bot.config.ts`, with name, slug, scheme alias, owner, EAS project id, `cc.dailybooth.bot` bundle ids (app, widgets, notifications), associated domains, and permission strings, and call it from `app.config.ts` with one line. `app.json` stays byte-identical to upstream and never conflicts. Check at build time that the widget/notification extension ids in `app.json`'s plugin block are rewritten by the overlay too.
3. **Schema in a second file (Phases 6, 7, maybe 2).** Prisma 7 reads every `.prisma` file in a folder. Change `packages/db/prisma.config.ts` (rarely edited upstream) from `schema: "prisma/schema.prisma"` to `schema: "prisma"`, and put our models in `packages/db/prisma/dailybot.prisma`. Relations to upstream models (`Bot`, `Routine`, `MemoryDocument`) need a back-reference field on the upstream model, which *is* an edit to `schema.prisma`; avoid it by using plain ID columns with no Prisma relation, plus an index (loses automatic cascade, so add cleanup in code). Decide per table. Verify the two-file layout builds before committing to it.
4. **Phase 8's "default off" is a hook, not a revert.** Upstream turned the toggle on by default in the schema, `domain.ts`, `repos.ts` and both UIs (#2977). Reverting those would touch four hot files. Instead, in the one place a bot is created (`repos.ts`), pass `crossSpaceCommunication` from a fork constant (`false`). Verify there is only one creation path.

Additional mitigations:
- Phase 1/2: keep call logic in `call-turn.ts` / `call-model.ts`; the executor hook delegates immediately.
- Phase 6: memory-update and consolidation logic in new files; the hooks in `run-tools-memory.ts` / `run-tools-fleet.ts` are one call each (both change rarely: 3 and 11 times in 30 days).
- Phase 7: `connector-limiter.ts` wraps connectors from a registration point, not inside each connector.

## C3. The sync procedure (Codex runs this; about 15-30 minutes when quiet)

One-time setup: `git config rerere.enabled true` (git remembers how you resolved a conflict and reuses it), `git config merge.conflictstyle zdiff3`. Keep `origin` = your fork, `upstream` = Rakazo (push disabled, already set).

Each sync:
1. **Clean start.** `git status` must be empty on `daily-bot`; stop if not.
2. **Fetch.** `git fetch upstream`. Show `git log --oneline daily-bot..upstream/main | wc -l` and the list of files in that range that our hooks touch (the table in C2).
3. **Work on a throwaway branch.** `git switch -c sync/YYYY-MM-DD daily-bot`, then `git merge upstream/main`. If the merge is clean, go to step 5.
4. **Conflicts, in this order.**
   - Generated files (`*.po`, `lib/locales/*.ts`, `pnpm-lock.yaml`): take upstream's (`git checkout --theirs <file>`), then regenerate with the repo's own commands (`pnpm install`, the i18n extract script). Never hand-merge.
   - Our hook lines: keep both sides; re-read that the hook still sits at its anchor.
   - Anything bigger than ~20 lines in one file: stop, summarize, and ask you. Do not guess.
5. **Verify.** `pnpm install`, typecheck, lint, unit tests (`pnpm test`, **not** the desktop Playwright suite, which steals focus on a Mac), the seam tests from C1 rule 7, and Prisma generate plus `prisma validate` on the two-file schema. For migrations, apply all of them to a scratch Postgres and confirm the old release's tests still pass (the repo's rolling-deploy rule).
6. **Native changes?** If the merged range touches `apps/mobile/app.json`, `package.json` native dependencies, `plugins/`, or the Expo SDK, flag "needs a new native build" in the report.
7. **Land it.** If all green, `git switch daily-bot && git merge --ff-only sync/YYYY-MM-DD`, then (with your OK) `git push origin daily-bot`. Delete the sync branch. **Never** `--force`, never touch `main` except `git merge --ff-only upstream/main` to keep the mirror (only when you ask).
8. **Report.** Three lines: commits pulled, conflicts (files and size), anything needing your attention (new settings, new env vars, new native build, features worth turning on).

**Cadence:** daily when you are actively building, otherwise twice a week; always before starting a new phase and before cutting a build. **Time budget:** 15 minutes typical, 60 with a real conflict. If a sync has been skipped for more than two weeks, do it as a planned task, not as a side effect.

**Release-day rule.** Don't sync in the middle of an in-flight phase branch; finish or rebase-free merge it first. Long-running phase work happens on `feature/*` branches merged into `daily-bot`, and each of those branches merges `daily-bot` (not upstream) in to stay current.

## C4. Automating it without GitHub Actions (Actions stay disabled)

- **A script on your Mac or server** (`scripts/dailybot-sync-check`, a new file): fetches upstream, performs the trial merge on a throwaway branch/worktree, runs install, typecheck and unit tests, then aborts and prints "clean / N conflicts in [files] / tests failed". It never changes `daily-bot` or pushes. Run it from `cron`/`launchd` once a day.
- **Notification:** the script writes a one-screen summary to a file and can send a push or email through whatever you already have; Codex can wire this later. Keep it optional.
- **Actual merge and push stay human-approved** (steps 7-8).
- **Server builds (C6)** don't need Actions either: `docker build` on the server or on your Mac.

## C5. When to upstream a change instead of carrying it

Carry in the fork by default. Offer a change upstream only when **all** of these hold: it is self-contained and small; it fits their `AGENTS.md` rules (provider-neutral, minimal copy, no vendor names outside adapters); it is useful to others; and carrying it costs us conflicts. Good candidates: the setup-fix items in Phase 7 (adding a model not in the catalog was already fixed upstream), error visibility, generic bugs we hit. **Not** candidates: rebrand, Daily Bot identity, Phase 8 cross-space messaging (upstream closed #1346 as a design decision), your keys and hosting. If upstream ships something equivalent to one of our phases (they just did #2745, the role pattern), **drop our version** and adopt theirs; check `git log upstream/main` for it before each phase starts. If they accept an upstreamed change, delete our copy at the next sync.

## C6. Rebrand and bundle ids without conflicts

See C2 designs 1-2. In short: source strings and `app.json` stay identical to upstream; the Daily Bot name, bundle ids, scheme alias, owner, EAS id and associated domains live in one overlay file; icons and splash are replaced as asset files (binary files upstream rarely changes); the Electron product name (if used) is set in one new config. After any sync the check is: grep the built web bundle and the generated `Info.plist` for "Rakazo".

## C7. What the server needs (for a first-time self-hoster)

**Is it "just a Docker container"? Almost, but not quite.** It is a small group of containers started together by one file (Docker Compose), plus a front door that gives you HTTPS. You run one command; you don't manage each part. Read from `docs/self-host.md`, `docs/self-host-production.md` and `infra/compose/` in upstream:

| Piece | What it is | Required? |
|---|---|---|
| `postgres` | The database. Everything (bots, chats, memory) is stored here. Not exposed to the internet. | Yes |
| `migrate` | Runs once at start to update the database layout. | Yes (automatic) |
| `api` | The server the apps talk to. | Yes |
| `worker` | Background jobs: routines, scheduled work, deliveries. Same image as `api`. | Yes |
| `web` | Serves the web app and proxies `/api` and `/rpc`. Listens on port 5173. | Yes |
| `supervisor` + `computer` | Starts the per-bot "agent computer" containers (a browser and shell for each bot). Needs access to the Docker socket on the server. | Optional. Without it bots work but have no computer. Alternative: a hosted computer provider (E2B and others) with an API key. |
| Caddy (front door) | Gets and renews the HTTPS certificate for `bot.dailybooth.cc` and passes traffic to `web`. | Yes for a public server. A tunnel can replace it. |

There is **no Redis** in the stack; Postgres does the job queue (Graphile Worker).

**Important for a fork:** the official install pulls ready-made images from Rakazo's registry (`ghcr.io/elie222/rakazo/app`). Those contain *Rakazo's* code, not yours. Your server must run an image built from the `daily-bot` branch. The simplest path is the source-checkout route: clone `daily-bot` onto the server and run `docker compose -f infra/compose/docker-compose.yml up --build`, so the server builds the image itself (no registry and no GitHub Actions). Updating = `git pull`, `docker compose up --build -d`. If you later want faster deploys, build the image on your Mac and copy it over; not needed now.

**Outside services (what the app calls out to):**

| Service | Used for | Required? | Key / where |
|---|---|---|---|
| A model provider (OpenRouter, or your own connection: OpenAI, Anthropic, etc.) | The bots' brains. | **Yes**, at least one | `OPENROUTER_API_KEY` in `.env`, or add a connection inside the app after sign-up |
| Expo push service | Phone notifications (messages, calls). Free. | Needed for push to your phone | An Expo account (you have one); `EXPO_ACCESS_TOKEN` only if the Expo project has "enhanced push security" on |
| Apple push (APNs VoIP key) | Incoming-call ringing on a locked iPhone. | Optional | `.p8` key, key id, team id, bundle id `cc.dailybooth.bot` in `.env` (names in the docs: `APNS_VOIP_*`) |
| Apple developer + TestFlight | Getting the app on your iPhone/iPad. | For the iOS app | Done by Codex (see TREVOR_TODO) |
| Speech (voice calls, dictation fallback) | Transcribe and read-aloud. | Optional; Phase 1/2 use OpenAI | OpenAI key |
| Gmail push via Google Pub/Sub | New-mail wake-ups (Phase 7.1). | Optional, later | Google Cloud project, domain verification |
| Composio / Pipedream | Ready-made connectors (Gmail, Calendar, etc.). | Optional | API key |
| Email sending (sign-up/reset emails) | Only if you enable email sign-in or verification. | Optional; skip for a private server | SMTP or provider settings; keep sign-up allowlisted to you |
| Object storage (S3-style) | Large uploads. | Optional; a local volume works | Only if you want it |
| Stripe / billing | Paid plans. | **No**, leave off for a personal server | |
| Error reporting / analytics | Diagnostics. | Optional, off by default | |

**What a fork must replace or switch off.** The official Rakazo app talks to Rakazo's own hosted services (their server address, their Expo project, their update feed for the desktop app, paid-plan checks). In your build: the app's server address points at `bot.dailybooth.cc` (set as `EXPO_PUBLIC_API_URL` for EAS builds; the in-app "Use a custom server" setting is the fallback); the Expo project and push credentials are yours; billing stays off; the Electron desktop update feed (only if you ship desktop) is yours or disabled. Anything not replaced keeps pointing at upstream.

**Keys you will end up with (never committed to git):** the random secrets the installer generates (`BETTER_AUTH_SECRET`, `ENCRYPTION_KEY` (**back it up; losing it makes stored credentials unreadable**), Postgres passwords, supervisor token); one model key; later an OpenAI key (voice), Google client secret (Gmail), APNs `.p8`, Expo token.

**What DNS and the network need.** One record: `bot.dailybooth.cc` → the server's public IP (A for IPv4, AAAA for IPv6; the register's DNS page). Open ports 80 and 443 (plus UDP 443 for HTTP/3). Do not open 5173, 3100 or Postgres' port. Caddy gets the certificate automatically once DNS resolves. If the server is at home behind a router, either forward 80/443, or use a Cloudflare Tunnel (no open ports; Cloudflare then sits in front).

**Recommended setup.** A small Ubuntu VPS (2 vCPU / 4 GB is plenty to start; 8 GB if you enable agent computers), Docker + Compose, the production compose file with Caddy, `daily-bot` checked out on it, registration limited to your account, `.env` kept outside the repo and backed up with the database. A home server is possible but push notifications, Gmail push and App Review need it to stay up and reachable, so a VPS is less fuss. App Review's demo account is simply a second login on this same server.

**Backups.** Back up the `pgdata` volume and `.env` (see `docs/self-host-backups.md`). Without both, the data cannot be restored.

**Android.** No Play Store. Codex builds an APK through EAS (profile `android-apk`) or locally and you sideload it; no Play Console, no upload key.

## C8. Open questions
All open questions are in `TREVOR_TODO.md`, each with a suggested answer.
