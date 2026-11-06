# Daily Bot

**In development**

Daily Bot is a personal, self-hosted fork of [Rakazo](https://github.com/elie222/rakazo), an open-source AI assistant for running persistent bots. I’m building it for day-to-day use, with a focus on faster voice conversations, a better experience on iPhone and iPad, and more control over what my bots remember and do.

## Current development build

The backend and website include all upstream changes through `17405c85a` (November 5, 2026, US Eastern), plus:

- Daily Bot branding and a sign-in landing page.
- Messaging between your own bots across spaces in the same organization, using each bot’s existing **Allow cross-space bot communication** permission.
- OpenAI realtime web calls with account defaults and per-bot model overrides, shared chat context and memory, ringing, greetings, and one expandable transcript for both speakers.
- Tool requests handled by the main bot, with spoken answers during calls and written work in chat. Pending work can continue after hang-up; delivery changes reuse the original task to avoid duplicate posts.
- Easier MCP setup, preserved bot thinking settings when switching to the space model, and clearer tool diagnostics in server logs.

This is a development build, tested locally with Docker and throwaway data. There is no Daily Bot production release yet. The [fork ledger](./FORK.md) records changes, compatibility rules, verification and rollback instructions. The fork adds no migrations or required environment settings of its own. The latest full upstream sync imports six unchanged upstream migrations; upgrade and rollback results are recorded in the ledger.

## Still on the roadmap

| Area | Planned work |
| --- | --- |
| Voice calls | More voice integrations when requested and tested, plus native app support. |
| iPhone and iPad | Composer dictation, better iPad layouts and keyboard support, and a Daily Bot build for TestFlight. |
| Memory and routines | Clearer memory updates, reviewable bot instruction changes, and routine history with undo. |
| Reliability and controls | Connector hardening, usage limits, and event-driven Gmail routines. |

## Follow development

- [Roadmap and build order](https://github.com/trevorbarnesus-lab/daily-bot/issues/24)
- [Project notes](https://github.com/trevorbarnesus-lab/daily-bot/tree/daily-bot/docs/daily-bot)

Daily Bot development happens on `daily-bot`. The `main` branch serves as the upstream mirror.

## Development notes

Upstream’s optional `RAKAZO_DEV_RUN_WITH` lets `pnpm dev` run inside a secrets manager command; unset keeps the existing setup. Configuration and production safeguards are in [FORK.md](./FORK.md). See also the upstream [audit log guide](./docs/self-host-audit-log.md).

## Credits and license

Based on [Rakazo](https://github.com/elie222/rakazo). Licensed under the [Apache License 2.0](./LICENSE).
