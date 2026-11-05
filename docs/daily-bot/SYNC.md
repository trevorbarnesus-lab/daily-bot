# Staying in sync with upstream Rakazo

> Historical merge-based runbook. Follow [FORK.md](../../FORK.md) for the current rebase policy and production release checks.

Decided Nov 4, 2026: **merge, never rebase**; daily practice-merge script; Codex runs the procedure and Trevor says "go" before any push. Source: PLAN.md Part C (C0-C6). Server guide is PLAN.md C7.

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
