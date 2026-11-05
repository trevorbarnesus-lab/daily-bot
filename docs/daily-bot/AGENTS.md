# Instructions for coding agents on the Daily Bot fork

Read this before doing anything. Then read README.md and the issue you are working on. The upstream root `AGENTS.md` still applies to code style, tests and architecture.

## Branches and git
- Work only on `daily-bot` or on `feature/<issue#>-<slug>` branches made from it.
- **Never commit to `main`.** The only allowed change to `main` is `git merge --ff-only upstream/main` to keep the mirror current, and only when Trevor asks.
- Bring in Rakazo updates by **merging** `upstream/main` (never rebase `daily-bot`). Follow SYNC.md exactly.
- **Never force-push. Never rewrite pushed history.**
- Reference the issue number in every commit message (e.g. `Phase 8: cross-space lookup (#12)`).

## Keep upstream syncs painless
- Put new logic in **new files**; touch upstream files only with thin, clearly-commented hooks.
- Don't refactor or reformat upstream code. Keep source strings and `apps/mobile/app.json` identical to upstream (rebrand is an overlay; see PLAN.md C6).
- Additive DB changes only (rolling-deploy safe), in our own schema file where possible.

## Ask Trevor first
- Before pushing to `daily-bot`, deploying, changing credentials or keys, or anything public (App Store, TestFlight external, DNS, publishing).
- Before anything goes to upstream. **Never open issues or PRs on elie222/rakazo.** With `gh`, always pass `-R trevorbarnesus-lab/daily-bot`.
- When setup needs a login or 2FA, ask Trevor; never store passwords in the repo.

## Hard rules
- GitHub Actions stay **disabled**. Don't enable them or add workflows that would run.
- This repo is **public**: never commit secrets, `.env`, `.p8` keys, tokens or personal data. Confirm `.env*` is git-ignored.
- Codex models: Luna for tiny tasks, Terra 6.1 for mid work, Sol 6.1 for advanced work. **Never Astra.** Each issue suggests one.

## Keeping track
- Keep `docs/daily-bot/` current: update README status, add decisions to DECISIONS.md, tick TODO.md.
- Comment on the issue as work progresses; close it (and tick the roadmap issue) when the work lands on `daily-bot`.
- Explain things to Trevor in plain words; this is his first fork.
