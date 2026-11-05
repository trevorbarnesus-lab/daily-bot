# Instruction and memory consolidation (Phase 6; "Phase 5" in the original addendum)

> Verbatim from Trevor's original spec (TASK.md, Addendum 3, Nov 4 1:52 PM). Do not edit; put design notes in PLAN.md.

### Problem
Bots can change their own instructions, routines and memory (MEMORY.md, shared memory) when the user gives feedback. Today every change is appended. When the user later contradicts or refines an earlier instruction, the old one stays. Over time this produces: contradictory rules ("monitoring is paused" next to "monitoring is active"); the same rule duplicated across instructions, routine and memory, often with different wording; logs and one-off notes stored as permanent memory, until the memory cap is hit and saves fail; longer prompts every run, which costs tokens and makes the model more likely to miss rules.
Real example: an email bot's memory said both "do not start monitoring until Trevor says" and "Trevor said to start; ignore the paused wording", plus message-ID logs from every check. Its routine grew to ~1,000 words of patches.

### Goal
Every instruction, routine and memory document should hold one current version of each rule, in one place. A new instruction that conflicts with an old one replaces it. One that refines an old one merges with it. Nothing contradictory is ever appended.

### Required behavior
1. Conflict check on every write. Before a bot saves a change to its instructions, a routine prompt or memory, compare the new content with what's already stored (an LLM pass is fine). Classify it as: new rule, replaces an existing rule, refines/merges with an existing rule, or duplicates one.
2. Replace or merge, never stack. Rewrite the affected section so the result reads as a single clean version. Remove the superseded text. No "this supersedes the earlier rule" notes left in the document.
3. One home per rule. Bot instructions: role, permissions, hard limits. Routine prompt: the steps for that routine. Memory: user preferences and durable facts. Run state (checkpoints, last-seen IDs): a separate key/value state store, not memory text. If a write duplicates a rule that already lives elsewhere, link to it or skip it.
4. User approval for instruction and routine changes. A bot may propose changes to its own instructions or routines, but they apply only after the user approves a before/after diff in chat. Memory preference updates can apply automatically, but are still conflict-checked and merged.
5. Version history. Keep every revision with who or what changed it and why, so any change can be undone. (Rakazo already has a memory_revisions table. Extend the same idea to bot instructions and routines.)
6. Size budget and cleanup. When a document nears its size limit, or on a schedule (e.g. weekly), run a consolidation pass: merge duplicates, drop stale facts and logs, flag contradictions. Show the user the proposed cleanup before applying it.
7. Visible contradictions. If the bot finds a conflict it can't resolve confidently, it asks the user one short question instead of guessing.

### Where it touches Rakazo
- The memory tools (e.g. `remember`) should become update-or-replace by topic, not append-only.
- Bot instruction and routine edits from inside a chat go through a propose -> diff -> approve flow.
- Add a run-state store per bot/routine for checkpoints, so they stay out of memory text.

### Acceptance tests
- User says "alert me about X", then later "stop alerting me about X". Stored memory contains only the latest preference, with no trace of the old one except in revision history.
- User repeats a rule that already exists in the routine. No duplicate is added.
- A routine that saves a checkpoint every run for a week leaves memory unchanged in size.
- A bot proposing a routine change shows a diff and does nothing until approved.
- Undoing a change restores the previous version exactly.
