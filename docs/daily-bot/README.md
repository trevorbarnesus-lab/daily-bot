# Daily Bot (Trevor's fork of Rakazo)

Daily Bot is a personal, self-hosted fork of [Rakazo](https://github.com/elie222/rakazo) (Apache 2.0). It keeps everything Rakazo does and adds: faster and realtime voice calls, built-in iOS dictation, iPad support, a "Daily Bot" rebrand, instruction/memory consolidation, platform reliability fixes, and messaging between your own bots across spaces.

## How the fork works (plain English)
- `main` = an untouched copy of Rakazo. Never commit to it.
- `daily-bot` = our branch. All our changes live here (or on `feature/*` branches merged into it).
- We pull Rakazo's updates by **merging** `upstream/main` into `daily-bot` often (see [SYNC.md](SYNC.md)).
- Our code goes in new files with tiny hooks into Rakazo's files, so updates rarely conflict.

## How to start (Codex)
1. Read [AGENTS.md](AGENTS.md) (rules), then this README.
2. Open the pinned **Daily Bot roadmap** issue and take the first open issue in order.
3. Details for each phase are in [PLAN.md](PLAN.md); Trevor's original wording is in [specs/](specs/).

## Where things are
| File | What |
|---|---|
| [AGENTS.md](AGENTS.md) | Rules for coding agents on this fork |
| [PLAN.md](PLAN.md) | Full unified plan: phases, build order (A4), designs (Part B), sync + server (Part C) |
| [TODO.md](TODO.md) | Trevor's checklist; decided items are checked |
| [DECISIONS.md](DECISIONS.md) | Every decision so far, dated |
| [SYNC.md](SYNC.md) | Upstream sync strategy and step-by-step procedure |
| [specs/](specs/) | Verbatim original specs |

## Current status (Nov 4, 2026)
- Planning done; all of Trevor's open questions answered ("go with the suggestions").
- `daily-bot` is at Rakazo `4044a65d` plus these docs; not yet synced with newer upstream.
- No app code has been changed yet. First task: Wave 0 upstream sync.
- Trevor is creating the Ubuntu VPS and pointing DNS for `bot.dailybooth.cc`.

## Key facts
- Domain: `bot.dailybooth.cc`. Bundle ids: `cc.dailybooth.bot`, `.widgets`, `.notifications`.
- iOS via TestFlight (own Apple + Expo accounts); Android = sideloaded APK only (no Google Play).
- GitHub Actions are disabled on purpose. Never put secrets in this public repo.

## Links
- Issues: https://github.com/trevorbarnesus-lab/daily-bot/issues
- Upstream: https://github.com/elie222/rakazo
- Server guide: [PLAN.md C7](PLAN.md#c7-what-the-server-needs-for-a-first-time-self-hoster)
