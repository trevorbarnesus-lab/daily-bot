# Instructions for coding agents on the Daily Bot fork

Read [FORK.md](../../FORK.md), then this file, README.md, and the issue you are working on. FORK.md governs upstream sync, data compatibility, image publishing, and production switches. It takes precedence where an older plan or issue conflicts. The upstream root `AGENTS.md` still applies to code style, tests, and architecture.

## Branches and git
- Work only on `daily-bot` or on `feature/<issue#>-<slug>` branches made from it.
- **Never commit to `main`.** The only allowed change to `main` is `git merge --ff-only upstream/main` to keep the mirror current, and only when Trevor asks.
- Rebase the fork patch set onto `upstream/main` on a local branch. Coordinate with Trevor before rewriting published history.
- Reference the issue number in every commit message (e.g. `Phase 8: cross-space lookup (#12)`).

## Keep upstream syncs painless
- Put new logic in **new files**; touch upstream files only with thin, clearly-commented hooks.
- Don't refactor or reformat upstream code. Keep source strings and `apps/mobile/app.json` identical to upstream (rebrand is an overlay; see PLAN.md C6).
- Avoid schema changes. Follow the migration and rollback rules in FORK.md and tell Trevor before adding a migration.

## Ask Trevor first
- Before pushing to `daily-bot`, deploying, changing credentials or keys, or anything public (App Store, TestFlight external, DNS, publishing).
- Before anything goes to upstream. **Never open issues or PRs on elie222/rakazo.** With `gh`, always pass `-R trevorbarnesus-lab/daily-bot`.
- When setup needs a login or 2FA, ask Trevor; never store passwords in the repo.

## Hard rules
- Publish the fork's app and computer images through GitHub Actions as specified in FORK.md. Review inherited workflows before enabling Actions.
- This repo is **public**: never commit secrets, `.env`, `.p8` keys, tokens or personal data. Confirm `.env*` is git-ignored.
- Codex models: Luna for tiny tasks, Terra 6.1 for mid work, Sol 6.1 for advanced work. **Never Astra.** Each issue suggests one.

## Keeping track
- Record every fork change in FORK.md. Update README status, add decisions to DECISIONS.md, and tick TODO.md as work lands.
- Comment on the issue as work progresses; close it (and tick the roadmap issue) when the work lands on `daily-bot`.
- Explain things to Trevor in plain words; this is his first fork.
