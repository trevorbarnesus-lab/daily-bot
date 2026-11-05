# Platform improvements from real issues (Phase 7; "Phase 6" in the original addendum)

> Verbatim from Trevor's original spec (TASK.md, Addendum 4, Nov 4 1:56 PM). Do not edit; put design notes in PLAN.md.

### 1. Event-driven email instead of polling (biggest win)
Problem: Mailey polls Gmail every 15 minutes. That's 96 runs a day, each re-reading its rules, with checkpoint bookkeeping and quota errors.
Add: a native Gmail integration on the regular Gmail API (your own OAuth client, no preview program). Use Gmail push notifications (watch + Pub/Sub) or the history API, so a routine fires "on new email" with only the new message IDs. No search windows, no checkpoints, no missed-mail logic in prompts.

### 2. Platform-level connector reliability
Problem: the Gmail connector fired dozens of requests at once and hit Google's rate limits, and the bot had to write its own retry rules into its prompt.
Add: per-connector limits on concurrent calls and requests per second, plus automatic retry with backoff on rate-limit and timeout errors, handled by the platform before the bot sees an error. Bots should never need retry rules in their instructions.

### 3. Instruction & memory consolidation
(See the separate "Instruction & memory consolidation" item.) New instructions replace or merge with old ones, never stack. Run state such as checkpoints goes in a per-routine key/value store, not memory text.

### 4. Tool error visibility
Problem: logs only showed "connectors_execute_tool: error". Message text is encrypted, so the real error (quota? timeout? auth?) couldn't be seen.
Add: log the tool name and a redacted error message for every failed tool call. Show a per-bot "Activity" panel with recent runs, tool calls, errors and duration.

### 5. Faster calls
Problem: each voice call turn takes 6-10 s (speech-to-text -> model -> text-to-speech).
Add: an optional realtime speech-to-speech model for calls (see the drafted feature request). As a quick win, stream the reply into text-to-speech sentence by sentence, and allow a separate fast model or thinking level for calls.

### 6. Routine settings
Problem: routines use the bot's main model and thinking level, and quiet-unless-important behavior has to be written into the prompt.
Add per routine: model and thinking level (cheap model for routine checks); a "stay silent unless there's something to report" switch; run history with success/failure.

### 7. Usage and budgets
Problem: you nearly hit the 10M free daily tokens without warning.
Add: token and cost usage per bot and per routine; daily/monthly budgets with alerts; automatic fallback to a cheaper model when a free-tier cap is close.

### 8. Safer defaults for connectors
Add: when a connector is installed, suggest approval rules. Reading and organizing are allowed; send, delete, pay and settings changes ask first. Allow limiting each connector to specific bots right in the install flow.

### 9. Setup UX fixes we ran into
- MCP server form: always show the OAuth fields (Authorization server, Scopes) instead of hiding them until a client ID is typed. Make the env var "File" toggle obvious. Add presets for common servers.
- Refresh app settings after a server restart without a full page reload (the STDIO option was missing until a reload).
- "Use space default" for a bot's model should not silently clear its thinking level.
- Make it easy to add a model that isn't in the built-in catalog yet (e.g. a newly released one).
- Raise the 4 KB memory cap, or warn before it's full.
