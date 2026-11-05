# TODO: Trevor's checklist

> [FORK.md](../../FORK.md) supersedes the merge-based sync, VPS setup, and Actions decisions in this checklist.

**Update Nov 4, 2026, 8:02 PM ET:** Trevor accepted **all** suggestions below (merge-not-rebase + daily practice-merge script, small Ubuntu VPS, organizations check, etc.). Checked boxes = decided. Open boxes are now *tasks* (Codex tasks or Trevor's own: create the VPS, point DNS, model key, backups), each tracked as a GitHub issue; see README.md.

You already have an Apple Developer account and a Google developer account, so those are treated as done. Below are only the steps still needed inside them, plus decisions. Each item: **what**, **why**, **blocks**, **recommendation**. Detail lives in `PLAN.md`.

**How to answer:** every open item has a **Suggestion:** with a one-line reason. Reply "go with the suggestions" or name the items you want changed; decisions can be revisited later.

**Who does what (Nov 4, 7:20 PM):** Codex builds and does the Apple, App Store Connect and Expo setup; you only supply logins/2FA when asked, point DNS, and provide the server. Google Play is skipped. The list below is ordered accordingly.

**Decided (Nov 4):** app name Daily Bot; bundle ids `cc.dailybooth.bot`, `cc.dailybooth.bot.widgets`, `cc.dailybooth.bot.notifications` (never `com.trevor.*`); domain `bot.dailybooth.cc` (DNS can be routed); Mailey is a 15-minute timer to be replaced by Gmail push; upstream fetched read-only (nothing merged). **Still placeholder:** logo and visual brand.

## 0. Staying in sync with upstream (read `PLAN.md` Part C0 first: plain-English summary)
- [x] **Merge, not rebase, `upstream` into `daily-bot`.** *Why:* conflicts fixed once stay fixed, and history you've pushed is never rewritten. **Suggestion:** yes, merge. **Decided Nov 4: suggestion accepted.**
- [x] **How often.** **Suggestion:** daily while building, twice a week otherwise, always before a new phase or build; ~15 minutes each, mostly Codex. **Decided Nov 4: suggestion accepted.**
- [x] **Who syncs.** **Suggestion:** Codex runs the checklist and reports; you reply "go" before anything is pushed. Codex never force-pushes. **Decided Nov 4: suggestion accepted.**
- [x] **Automated check without GitHub Actions.** A script on your Mac or server tries the merge on a throwaway branch each day and tells you "clean / conflicts in X / tests failed"; it never changes your branch. **Suggestion:** yes, set it up in Wave 0. **Decided Nov 4: suggestion accepted.**
- [x] **Keep source strings and `app.json` identical to upstream** (the rebrand becomes an overlay and a display-name constant, not a rewrite). Cost: the "Daily Bot" name is applied by a build step instead of editing every string. **Suggestion:** yes; it is what keeps every sync from hitting ~100 translation files. **Decided Nov 4: suggestion accepted.**
- [x] **Second schema file for our database tables** (so `schema.prisma`, which changes ~3 times a day upstream, stays identical). **Suggestion:** yes, if Codex's first check shows it builds; otherwise add our tables in one block at a stable spot. **Decided Nov 4: suggestion accepted.**
- [x] **Offer finished, self-contained fixes upstream?** **Suggestion:** later and only for generic fixes; never rebrand or cross-space messaging (fork-only, decided). **Decided Nov 4: suggestion accepted.**

## 1. Codex does these (you only give logins / 2FA when asked)
Order is the build order (Wave 0). Codex asks you when it needs something.
- [x] ~~Bundle ids~~ `cc.dailybooth.bot`, `.widgets`, `.notifications`.
- [x] ~~Domain~~ `bot.dailybooth.cc`. [x] ~~Name~~ Daily Bot. [x] ~~Mailey~~ 15-min timer to be replaced by Gmail push. [x] ~~Fetch upstream~~ done read-only.
- [ ] **Sync `daily-bot` with `upstream/main`** (55 commits, v0.7.0) using the Part C3 procedure. *Blocks:* every phase. **Suggestion:** yes, approve; it is the first task.
- [ ] **Apple Developer portal (Codex):** App IDs for the three bundle ids; Associated Domains, Push Notifications, Time Sensitive and Communication Notifications, App Groups, Siri/App Intents as upstream uses; create the App Group.
- [ ] **APNs key (Codex):** create the push key (.p8) and store it outside git (needed for call ringing on your own build).
- [ ] **App Store Connect (Codex):** create the app record for the bundle id and TestFlight internal testing.
- [ ] **Expo / EAS (Codex):** you have an Expo account but no project; Codex creates the EAS project and links the Apple credentials. Upstream's owner and project id can't be reused.
- [ ] **Placeholder logo (Codex):** text wordmark plus a simple monochrome glyph from one SVG when the time comes. Not a blocker.
- [ ] **Privacy policy and support pages (Codex):** at `https://bot.dailybooth.cc/privacy` and `/support` once hosting is set.
- [ ] **Associated-domain files (Codex):** `/.well-known/apple-app-site-association` for universal links; Android `assetlinks.json` is only needed if universal links on the APK matter. **Suggestion:** do the Apple one; skip Android.
- [ ] **Android (Codex):** build an APK for sideloading (EAS `android-apk` profile). **Google Play is out of scope: no Play Console, no upload key.**
- [ ] **Google Cloud for Gmail push (Codex, later):** enable Gmail API and Pub/Sub, OAuth client with redirect on `bot.dailybooth.cc`, consent screen, **verify the domain** in Google Cloud, topic with `gmail-api-push@system.gserviceaccount.com` as publisher, push subscription with OIDC to `https://bot.dailybooth.cc/api/v1/mail/push` (placeholder path). You approve logins/2FA.

## 1b. What only you can do
- [ ] **Point DNS** for `bot.dailybooth.cc` at the server's public IP (one A record, plus AAAA if you have IPv6) at wherever you registered the domain. *Blocks:* universal links, privacy page, Gmail push, App Review. **Suggestion:** do it as soon as the server exists; it takes minutes, and Caddy gets the certificate by itself.
- [ ] **Provide the server** (see `PLAN.md` C7). **Suggestion:** a small Ubuntu VPS (2 vCPU / 4 GB, 8 GB if bots get agent computers) running Docker; a home server works but is flakier for push and Gmail.
- [x] **Confirm the server picture** from C7: it is *not* one container but a small Docker Compose group (database, API, worker, web, optional agent-computer supervisor) behind a Caddy HTTPS front door, and it must run an image built from `daily-bot`, not the official Rakazo one. **Suggestion:** accept this; Codex builds and updates it with `docker compose up --build` on the server, no registry or GitHub Actions needed. **Decided Nov 4: suggestion accepted.**
- [ ] **A model key**, at least one (OpenRouter, or your own provider connection). **Suggestion:** one OpenRouter key to start; it unlocks every provider.
- [x] **Which Rakazo-hosted services to switch off or replace** (their server address, Expo project, desktop update feed, billing). **Suggestion:** point the apps at your domain, use your own Expo project, leave billing off, and skip the desktop update feed unless you ship Electron. **Decided Nov 4: suggestion accepted.**
- [x] **Deploy the marketing site (`apps/www`)?** **Suggestion:** no, not required. **Decided Nov 4: suggestion accepted.**
- [x] **App Review demo server and login.** It is simply a second account on this same server. **Suggestion:** defer until you want a public App Store release; internal TestFlight needs no review. **Decided Nov 4: suggestion accepted.**
- [x] **Enable only one registered user (yours)** on the server. **Suggestion:** yes, keep sign-up allowlisted to you. **Decided Nov 4: suggestion accepted.**
- [ ] **Back up `.env` and the database volume**, especially `ENCRYPTION_KEY` (losing it makes stored credentials unreadable). **Suggestion:** store `.env` in your password manager and set a nightly database backup; Codex can script it.

## 2. Phase 5 / 4: rebrand and iPad
- [x] **Scope of rebrand.** **Suggestion:** display name, icons, copy, bundle ids only; keep `@rakazo/*`, `RAKAZO_*`, module names, because renaming ~2,600 files would make every upstream sync a conflict. **Decided Nov 4: suggestion accepted.**
- [x] **Deep links:** with the domain decided, use universal links on `bot.dailybooth.cc` plus the `dailybot` scheme as a fallback (keep `rakazo` as alias). Confirm OK. **Suggestion:** yes; universal links are the standard and the scheme covers auth returns. **Decided Nov 4: suggestion accepted.**
- [x] **Multiple iPad windows?** **Suggestion:** single window for now; multi-window needs scene work for little gain. **Decided Nov 4: suggestion accepted.**
- [x] **iPad keyboard shortcuts:** Return-to-send only, or more (Cmd-N, Cmd-F)? **Suggestion:** Return-to-send first; the rest can follow once you use it on iPad. **Decided Nov 4: suggestion accepted.**
- [x] **Credit to upstream** wording in About/README (Apache 2.0 requires keeping the license and notices). **Suggestion:** one line in About and README ("Based on Rakazo, Apache 2.0") with the license file kept; it is legally required and cheap. **Decided Nov 4: suggestion accepted.**

## 3. Phase 3: dictation
- [x] **Engine:** on-device first with server fallback, or server-only? **Suggestion:** on-device first with server fallback; the dictation parts are already in the repo and it is free and fast. **Decided Nov 4: suggestion accepted.**
- [x] **How far "keep recording" goes:** within the thread, across screens, or while the app is backgrounded? **Suggestion:** within the thread for v1; background recording adds permission and review risk. **Decided Nov 4: suggestion accepted.**
- [x] **Mic button position:** replaces Send when the input is empty, or separate? **Suggestion:** replaces Send when empty; matches iOS Messages and saves space. **Decided Nov 4: suggestion accepted.**
- [x] **Auto-send?** **Suggestion:** never, only fills the input; misheard text must not send itself. **Decided Nov 4: suggestion accepted.**

## 4. Phases 1 and 2: calls
- [x] Add direct voice web lookups, spoken answers from the regular bot, and one delayed progress notice.
- [x] Ring on pickup, greet by the saved account name, consolidate the transcript, and avoid overlapping task updates.
- [x] Shorten live call replies and check content pasted during a call, with a brief wait for new messages.
- [x] Limit voice settings and server use to OpenAI while preserving saved connections for rollback.
- [x] **Do reply text deltas already stream to clients?** (I'll check when building; affects Phase 1 size.) **Suggestion:** nothing to decide; I check the code first. **Decided Nov 4: suggestion accepted.**
- [x] **Call model and thinking default** (Phase 1). **Suggestion:** same model, thinking off, then tune; thinking is the biggest latency cost. **Decided Nov 4: suggestion accepted.**
- [x] **Which tools stay on call turns?** **Suggestion:** end_call, memory read, time/calendar read, a handoff tool; no shell/computer/file, since fewer tools means faster turns. **Decided Nov 4: suggestion accepted.**
- [ ] **OpenAI API key with Realtime access** and a billing limit. *Blocks:* 2. *Why:* realtime audio is much pricier than the current pipeline. **Suggestion:** create one key with a hard monthly limit only when Phase 2 starts; not needed before then.
- [x] **Spend caps:** max call length and per-call/daily cap. **Suggestion:** 10 min, per-call cap, daily alert; stops a stuck call from running up cost. **Decided Nov 4: suggestion accepted.**
- [x] **Mobile transport:** native WebRTC (needs a dev-client rebuild, no OTA) or backend WebSocket relay (no new native module, slower, heavier backend)? **Suggestion:** native WebRTC; best latency is the whole point of Phase 2. **Decided Nov 4: suggestion accepted.**
- [x] **Tool safety in realtime:** read-only tools only, or more? **Suggestion:** read-only tools only, with anything needing approval deferred to a background handoff run, because speech can be misheard. **Decided Nov 4: suggestion accepted.**
- [x] **Second realtime provider** to validate the neutral interface before merge? **Suggestion:** not required for v1; adds weeks for no immediate benefit. **Decided Nov 4: suggestion accepted.**
- [x] **Per-bot call model** or account role only? **Suggestion:** account role first; one setting is simpler and a per-bot override can come later. **Decided Nov 4: suggestion accepted.**

## 5. Phase 6: consolidation
- [x] **Approval for bots' own instruction edits:** confirm it's OK that this now requires your approval (today it applies silently). **Suggestion:** yes; a bot silently rewriting its own rules is the failure we are fixing. **Decided Nov 4: suggestion accepted.**
- [x] **Memory updates:** auto-apply always, or only when the check is confident? **Suggestion:** auto-apply when confident, otherwise ask one question; keeps memory clean without nagging. **Decided Nov 4: suggestion accepted.**
- [x] **Revision retention:** how many versions per document and for how long? **Suggestion:** 50 per document, kept 1 year; enough to undo, small storage. **Decided Nov 4: suggestion accepted.**
- [x] **Judge model** for conflict checks: cheap main-provider model or the approval-role model? **Suggestion:** cheap main-provider model; it runs often and needs no special trust. **Decided Nov 4: suggestion accepted.**
- [x] **Semantic memory providers** (Honcho/Serenity): include in v1 or only `MEMORY.md` documents? **Suggestion:** `MEMORY.md` only; keeps v1 small. **Decided Nov 4: suggestion accepted.**
- [x] **Shared (Space) memory writes:** require approval? **Suggestion:** yes; other bots and people read it. **Decided Nov 4: suggestion accepted.**
- [x] **Upstream or fork-only?** **Suggestion:** fork-only; upstream's PR rules and review cycle would slow you down, and you can offer pieces later. **Decided Nov 4: suggestion accepted.**

## 6. Phase 7: platform improvements
- [x] ~~Mailey~~ **Decided:** it is a 15-minute timer; replace with Gmail push. **Suggestion (interim):** switch it to a no-model `watch` routine now so quiet checks cost no model run while push is built.
- [ ] **Google Cloud project** (Codex does the steps, you approve logins; same list as section 1): enable the Gmail API and Pub/Sub; create an OAuth client (web) with redirect URI on `bot.dailybooth.cc`; configure the consent screen; **verify ownership of `bot.dailybooth.cc`** in Google Cloud (required before Pub/Sub will push to it); create a Pub/Sub topic, grant `gmail-api-push@system.gserviceaccount.com` publisher rights, and create a push subscription to `https://bot.dailybooth.cc/api/v1/mail/push` (path is a placeholder) with OIDC authentication. *Blocks:* Gmail push. **Suggestion:** do it once the server is reachable (1b); the steps are mine to list when you get there.
- [x] **OAuth publishing status.** In "testing" mode refresh tokens expire after 7 days; restricted Gmail scopes need verification to publish. **Suggestion:** read-only scope, "testing" mode for yourself; verification is only needed if others will use it. **Decided Nov 4: suggestion accepted.**
- [ ] **Server reachable at the domain over HTTPS** (needed for Pub/Sub push); see 1b. **Suggestion:** build push directly now that the domain exists, with a history-API poll as fallback when the endpoint is down.
- [x] **Gmail scope:** read-only or modify? **Suggestion:** read-only; least risk until you need the bot to organize mail. **Decided Nov 4: suggestion accepted.**
- [x] **Connector limits:** default requests/sec and concurrency per connector; may write calls ever auto-retry? **Suggestion:** reads only; a retried write can duplicate effects. **Decided Nov 4: suggestion accepted.**
- [x] **Error visibility:** in-app Activity panel only, or server logs too; retention? **Suggestion:** Activity panel plus server logs, kept 30 days; the panel is where you'll look and logs help debugging. **Decided Nov 4: suggestion accepted.**
- [x] **Budgets:** tokens or dollars first, hard stop or soft, who is alerted? **Suggestion:** tokens first, soft cap with an alert to you and a fallback to a cheaper model; tokens are exact, dollars need price tables. **Decided Nov 4: suggestion accepted.**
- [x] **A "routine model" role** or per-routine override only? **Suggestion:** add the role; routines run unattended and rarely need your best model. **Decided Nov 4: suggestion accepted.**
- [x] **New memory cap** **Suggestion:** 16 KB with a warning at 80%, shipped with Phase 6; raising it earlier costs tokens every run. **Decided Nov 4: suggestion accepted.**
- [x] **Apply safer connector presets to existing installs?** **Suggestion:** new installs only, plus a one-time prompt; silent changes to existing connectors would surprise you. **Decided Nov 4: suggestion accepted.**

## 6b. Phase 8: cross-space messaging between your own bots
- [x] ~~Toggle default~~ **Decided: OFF by default** for new bots in the fork, using the existing "Allow cross-space bot communication" toggle. Delivery requires both bots to have it on. Existing saved permissions are preserved.
- [x] **Organizations: what they are and what to do.** In Rakazo, every Space lives inside an *Organization*. Since upstream #3211 you can create more than one organization (account menu, "switch organization"), each with its own billing; each has one member, its owner. Most people have exactly one, created when they signed up, and everything they call spaces lives in it. **You almost certainly have just one.** To check: open the account menu on web and look for an organization switcher with more than one entry. **Suggestion:** require both bots' spaces to be in the same organization (costs nothing if you have one, and prevents a second organization from ever mixing in). **Decided Nov 4: suggestion accepted.**
- [x] ~~Label~~ **Decided: yes, minimal.** A small "(Space name)" tag styled like the existing "message from <bot name>" display. Low visual priority.
- [x] ~~Fork-only~~ **Decided: yes.**
- [x] **Prompt-injection exposure.** A bot that reads untrusted content could ask another space's bot to act; approvals still apply in the target. **Suggestion:** accept; with the toggle off by default you opt in per bot. **Decided Nov 4: suggestion accepted.**

- [x] **Existing task delivery (Nov 5).** Persist changes to where a pending result goes, reuse the original task, and post once across repeated requests, hang-up and completion races.
- [x] **Natural spoken tool discovery (Nov 5).** Make the current web/app/action bridge explicit and verify ordinary spoken questions through WebRTC, including missing-detail clarification.
- [x] **Shared call tool delivery (Nov 5).** Voice results by default for every tool handoff; chat for requested posts and substantial written work. Reuse normal tool activity and permissions, discover public sources before fetching, and retain spoken results without duplicate written replies.

- [x] **Blank call task IDs (Nov 5).** Normalize blank optional IDs, keep new work separate from existing-task delivery, and return truthful bridge failure notices.

## 7. Keys to keep out of git (public repo)
- [ ] OpenAI key, Google OAuth client secret, APNs `.p8`, Expo token, `.env`. **Suggestion:** a `.env` outside the repo plus your password manager; Codex confirms `.env*` is git-ignored on day one.

## 8. Upstream findings that change your decisions
- Upstream already has a keyboard-shortcuts list for web/desktop and iOS pasted-image support; iPad hardware shortcuts and everything in Phases 2, 6 and 7 (except what's listed in `PLAN.md` A9) are not built upstream. Since upstream is active (55 commits in this window), consider offering to send finished, self-contained pieces upstream later; not needed now.
