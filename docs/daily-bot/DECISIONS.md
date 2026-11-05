# Decisions log

Current production compatibility, rebase, and image publishing decisions are recorded in [FORK.md](../../FORK.md). Earlier decisions below remain for reference.

All times America/New_York. Newest last. Revisit any decision by adding a new dated entry.

## 2026-11-04
- **~2:21 PM** App name **Daily Bot**. Domain **bot.dailybooth.cc** (hosting, universal links, privacy page, Gmail push endpoint).
- **~2:21 PM** Bundle ids **cc.dailybooth.bot**, **cc.dailybooth.bot.widgets**, **cc.dailybooth.bot.notifications**. Never use Trevor's name (no `com.trevor.*`).
- **~2:21 PM** Mailey is a 15-minute timer; goal is Gmail push (event-driven).
- **~2:21 PM** Apple Developer and Google developer accounts already exist.
- **Earlier** Repo stays public. `main` = clean upstream mirror; all work on `daily-bot`. GitHub Actions disabled. Nothing upstream without Trevor's OK.
- **6:53 PM** Phase 8 (cross-space messaging between a user's own bots) added; spec in specs/08.
- **7:17 PM** Phase 8: cross-space toggle **OFF by default**; reuse the existing toggle; delivery only when **both** bots are on. Small cross-space label. **Fork-only.**
- **7:17 PM** Staying in sync with fast-moving upstream is a top requirement from day one.
- **7:20 PM** **Codex does the building and all setup**: Apple Developer portal (App IDs, App Group, APNs key), App Store Connect, EAS project (Trevor has an Expo account), placeholder logo, privacy and support pages. Codex asks Trevor only for logins/2FA.
- **7:20 PM** **Google Play skipped**; Android = APK only.
- **7:20 PM** Trevor self-hosts the server (also for App Review demo later).
- **8:02 PM** Trevor accepted **all** suggestions in TODO.md, including:
  - **Merge, not rebase**, upstream into `daily-bot`; daily while building, twice weekly otherwise; Codex runs it, Trevor says "go" before push; never force-push.
  - **Daily practice-merge script** (no GitHub Actions) set up in Wave 0; `rerere` on.
  - Source strings and `app.json` stay identical to upstream (rebrand as an overlay); separate schema file for our tables if it builds.
  - **Small Ubuntu VPS** (2 vCPU / 4 GB, 8 GB with agent computers), Docker Compose stack behind Caddy, image built from `daily-bot`. Trevor creates the VM and DNS; one OpenRouter key to start; sign-up allowlisted to Trevor; back up `.env` (esp. `ENCRYPTION_KEY`) and DB nightly.
  - Rebrand scope: display name, icons, copy, bundle ids only; keep internal `rakazo` identifiers. Universal links + `dailybot` scheme (keep `rakazo` alias). Credit line "Based on Rakazo, Apache 2.0".
  - iPad: single window; Return-to-send first.
  - Dictation: on-device first with server fallback; keep recording within the thread; mic replaces Send when empty; never auto-send.
  - Calls: same model with thinking off; slim call tool set; realtime key with hard monthly limit only when Phase 2 starts; 10-min max, per-call cap, daily alert; native WebRTC; read-only tools in realtime; no second provider for v1; account role first.
  - Consolidation: bots' own instruction edits need Trevor's approval; memory auto-applies when confident else asks; 50 revisions/1 year; cheap judge model; MEMORY.md only; Space memory writes need approval; fork-only.
  - Platform: Mailey interim no-model `watch` routine; Gmail read-only, OAuth "testing" mode; build push now with history poll fallback; only reads auto-retry; Activity panel + logs 30 days; token budgets, soft cap + alert + cheaper fallback; add "routine" model role; memory cap 16 KB with 80% warning (with Phase 6); safer presets for new installs plus one-time prompt.
  - Phase 8: both bots' spaces must be in the **same organization**; prompt-injection exposure accepted (opt-in per bot).
  - Skip deploying `apps/www`; App Review demo account deferred until a public release; Apple associated-domain file yes, Android assetlinks skip.
- **8:02 PM** Project managed on GitHub: this docs folder, `AGENTS.md` pointer, one issue per work item, pinned roadmap issue.
- **Codex models:** Luna for tiny tasks, Terra 6.1 for mid work, Sol 6.1 for advanced work. **Never Astra.**

- **Cross-space messaging.** Use the saved permission on both bots as the switch.
  Existing bot settings are preserved, and new Daily Bot bots start with the permission off.
- **Live web calls.** Use the OpenAI key already saved under Voice. Choose the live model in
  account Voice settings and optionally override it in a bot's Advanced settings. Both choices
  apply in this browser. The transcript stays in the bot's chat.
- **Live call handoffs.** Give the regular bot the saved spoken request in the same chat.
  Relay the task's progress and result to the voice session. Consequential actions require
  approval in chat, where the task can continue after hang-up.
- **Voice providers.** Offer OpenAI for speech, transcription, and live calls. Preserve older
  connections for rollback and consider additional providers when requested.
- **Live call replies.** Default to brief answers and short task confirmations. Read posted
  content aloud when asked. Use a read-only tool to check newly pasted chat content, with a
  short bounded wait for text that is still arriving.
- **Call pickup and transcript.** Ring on outgoing calls and greet using the account profile.
  Keep one transcript card per call with both speakers labeled. Written work stays in chat.
  Queueing a task adds no generated voice reply, and completion waits for current playback.
- **Call window placement.** Keep the desktop call beside the open side panel and follow its
  resized width. Minimize the call when its Voice settings button opens settings.
- **Voice lookups and delivery.** Use the normal bot executor for tool-backed questions,
  respecting bot settings and approval rules. Separate written-work confirmations from spoken
  answers. Give one progress notice after four seconds and isolate completion notices from
  written results.

- **Call tool delivery (Nov 5).** The same rule applies across all tool handoffs: voice is the
  default for questions and action confirmations; requested chat posts and substantial written
  work go to chat. Use one normal executor pipeline for tool activity, permission checks and
  results. Do not narrate internal handoffs or read written drafts aloud by default. Public
  lookups discover sources through search instead of asking approval for guessed destinations.
  Keep explicit rules and consequential-action approvals. Store spoken results in encrypted
  completion events without a second written reply. No schema or settings changes.

- **Current voice capabilities (Nov 5).** Name the voice bridge for tools rather than chat-only
  delegation. State its web, account and action capabilities explicitly after saved context.
  For current information, use tools or ask for essential missing details before making an
  access claim. Verify natural recorded speech through the browser call transport, including
  the greeting, alongside direct tool/executor tests.

- **Existing task delivery (Nov 5).** Reuse the queued task ID when changing delivery or
  confirming that work continues after hang-up. Persist the choice and serialize it with
  completion. Posting an already finished voice result uses its saved answer once, without
  rerunning the work. Keep new independent requests separate and retain the original source.

- **Blank call task IDs (Nov 5).** Treat empty optional task IDs as new work; only an actual
  task ID selects existing work. Keep delivery changes on their dedicated function. Use
  isolated retry notices for bridge failures so they cannot become invented access claims.
  Preserve the existing models, transcript flow, tool permissions and task deduplication.
