# Daily Bot (Trevor's fork of Rakazo)

Daily Bot is a personal, self-hosted fork of [Rakazo](https://github.com/elie222/rakazo) (Apache 2.0). Planned work includes faster and realtime voice calls, built-in iOS dictation, better iPad support, a Daily Bot rebrand, memory and routine improvements, and messaging between your own bots across spaces.

## How the fork works (plain English)
- `main` = an untouched copy of Rakazo. Never commit to it.
- `daily-bot` = our branch. All our changes live here (or on `feature/*` branches merged into it).
- We regularly rebase the fork changes onto `upstream/main`. [Production compatibility and release rules](../../FORK.md)
- Our code goes in new files with tiny hooks into Rakazo's files, so updates rarely conflict.

## How to start (Codex)
1. Read [AGENTS.md](AGENTS.md) (rules), then this README.
2. Open the pinned **Daily Bot roadmap** issue and take the first open issue in order.
3. Details for each phase are in [PLAN.md](PLAN.md); Trevor's original wording is in [specs/](specs/).

## Where things are
| File | What |
|---|---|
| [FORK.md](../../FORK.md) | Production compatibility, upstream sync, image releases, and the change ledger |
| [AGENTS.md](AGENTS.md) | Rules for coding agents on this fork |
| [PLAN.md](PLAN.md) | Full unified plan: phases, build order (A4), designs (Part B), sync + server (Part C) |
| [TODO.md](TODO.md) | Trevor's checklist; decided items are checked |
| [DECISIONS.md](DECISIONS.md) | Every decision so far, dated |
| [SYNC.md](SYNC.md) | Historical notes from the original merge-based plan |
| [specs/](specs/) | Verbatim original specs |

## Current status (Nov 5, 2026)
- The local development branch is rebased onto Rakazo `abf3c08145a05cba92a912d6c24fdfb5f569d0e0`. Its first app change sends signed-out visitors opening the web app to sign in.
- Both `linux/amd64` images built in OrbStack. A local upgrade from Rakazo v0.8.0 to the fork and a rollback to v0.8.0 preserved the same synthetic account settings, bot, chat, memory, routine, and decryptable vault credential in the same database. The rehearsal used the built-in scripted runtime for test messages.
- The sign-in unit tests, web type check, and two focused Chromium tests passed. The local rehearsal does not establish compatibility with the production server's specific version and data.
- Development uses OrbStack with throwaway data. Production will switch images on the existing Docker installation and keep its database, volumes, and settings.
- The local backend and website pass adds same-owner cross-space messaging, easier MCP setup, and keeps a bot's thinking level
  when switching it to the space model. It also requests less thinking on supported
  call models and categorizes tool failures in server logs. See [FORK.md](../../FORK.md)
  for the change ledger. The fork adds no database migrations in this pass.
- The backend and website image passed a fresh OrbStack rehearsal from Rakazo v0.8.0 to
  Daily Bot and back. Both images opened the same synthetic account, bot, chat, memory,
  routine, settings and encrypted vault credential. The separate PostgreSQL tests
  verified cross-space delivery, replies, encryption and permission checks.
- OpenAI Realtime web calls save both sides of the conversation in the bot's chat.
  The regular bot handles delegated work in that chat and sends updates back to the call.
  Simulated calls verified the handoff, chat approval, and hang-up behavior.
- Voice settings offer one OpenAI key field. The bot's Advanced Voice section holds its call model override.
- Live call instructions favor short spoken replies. A read-only tool checks newly pasted chat
  text and briefly retries if it has not arrived.
- Calls ring, open with a greeting based on the account's display name, and keep both speakers
  in one expandable transcript. Task completion updates wait until current playback finishes.
- Current call capability rules explicitly expose web and app tools, independently of old
  assistant replies in the saved history. Natural recorded speech is checked through WebRTC.
- Delivery-only call follow-ups reuse the original task, including after hang-up. Repeated
  delivery requests and completion races post one result without rerunning the work.
- All live-call tool requests use the normal bot executor. Ordinary results return by voice,
  with tool activity in chat and no duplicate written answer. Requested chat posts and longer
  drafts remain written work with a brief spoken confirmation. Public lookups search for their
  sources first; explicit permissions and approval for consequential actions remain in effect.


## Key facts
- Domain: `bot.dailybooth.cc`. Bundle ids: `cc.dailybooth.bot`, `.widgets`, `.notifications`.
- iOS via TestFlight (own Apple + Expo accounts); Android = sideloaded APK only (no Google Play).
- The release plan calls for publishing the fork images to GHCR through GitHub Actions. Never put secrets in this public repo.

## Links
- Issues: https://github.com/trevorbarnesus-lab/daily-bot/issues
- Upstream: https://github.com/elie222/rakazo
- Production release guide is in [FORK.md](../../FORK.md).
