# Daily Bot fork

Daily Bot is a small patch set on top of [Rakazo](https://github.com/elie222/rakazo). This file governs upstream sync, production compatibility, and release verification.

## Upstream sync

Rebase the fork commits regularly onto `upstream/main`. Keep changes in new files or small, clearly marked edits where practical. Avoid unrelated refactors, renames, and file moves. Prepare and verify the rebase on a local branch before changing the published branch, and coordinate any update that would rewrite its history with the maintainer. Record the exact upstream base for each release.

## Production compatibility

- Production keeps its existing PostgreSQL database, storage volumes, and `.env`. The switch changes only the app and computer image names and tags through the existing Compose settings.
- Test against a database migrated by the latest upstream release. Avoid schema changes. If a migration is unavoidable, tell the maintainer before adding it. Use a unique fork-specific name and verify its order and absence of collisions against upstream. Add only nullable columns or new tables with defaults. Preserve existing columns, types, and rows. Verify that the upstream rollback images work against the resulting schema.
- Preserve `ENCRYPTION_KEY`, per-space encryption, and credential storage. Reuse existing code paths so stored chats, memory, and connector credentials remain readable.
- Preserve existing `.env` behavior. Any new setting must be optional, have a safe default, and be listed in the change ledger below.
- Develop on the MacBook Pro with Docker in OrbStack and throwaway data. Get the maintainer's approval before copying any database between development and production.

## Images and production switch

Build the app and computer images with the upstream Dockerfiles and Compose layout. Publish both to GHCR through GitHub Actions with matching, versioned tags for `linux/amd64`. Verify that the production Docker host can run both images before switching. Review inherited workflows before enabling Actions for the fork publisher.

Use the existing upstream update process. Back up the database, tag the currently running upstream images for rollback, pull the fork images, start the existing stack, and verify it. The relevant upstream Compose settings are `RAKAZO_IMAGE`, `RAKAZO_IMAGE_TAG`, `RAKAZO_COMPUTER_IMAGE`, and `RAKAZO_COMPUTER_IMAGE_TAG`. Roll back by restoring the upstream image references and restarting against the same database and volumes. Prove this rollback before a production switch.

## Release report

Before each production switch, give the maintainer:

- The exact upstream base SHA and release, the verified version running in production, and confirmation that production is on that version or older.
- Every fork migration, with its name and confirmation that it is additive and compatible with the rollback images.
- Every new `.env` setting, its default, and when it is used.
- The build, upgrade, smoke-test, and rollback results. Start from an isolated copy of a production-like database migrated and populated by upstream with synthetic data. Verify access to existing bots, chats, memory, routines, settings, and encrypted connector credentials. Exercise the fork features, then restart the exact upstream images planned for rollback on the database left by the fork and repeat the compatibility checks. If production runs an older release, also rehearse the full upgrade from that release so its intervening upstream migrations are covered.

## Change ledger

Record each landed fork change with its purpose, files, migrations, new settings, and rollback instructions. This ledger starts from upstream `4044a65db8cb98ebd65c42a70b2c26c17cbd825c`, the base of the existing documentation commits. The base is a repository fact. The production version still needs to be verified before a switch.

| Change | Files | Migrations | New settings | Rollback |
| --- | --- | --- | --- | --- |
| Initial project handoff and public branding | `AGENTS.md`, `README.md`, and `docs/daily-bot/` | None | None | Revert the documentation commits if needed. |
| Production compatibility policy | `FORK.md`, `AGENTS.md`, and the guidance in `docs/daily-bot/` | None | None | Revert the documentation patch if the maintainer supersedes this policy. |
| Sign-in redirect | `apps/web/src/App.tsx`, `apps/web/src/App.test.tsx`, `apps/web/e2e/auth-lifecycle.spec.ts` | None | None | Revert the redirect patch to restore Rakazo's default landing page. |
| Public product name | Web page metadata and translated copy, desktop setup and menus, mobile display labels and permissions, and customer-facing messages in the API and auth package | None | None | Revert the branding commit and rebuild the app images or clients. |
| Cross-space messaging | `packages/adapters/src/{cross-space-bots,bot-messages,executor}.ts`, `packages/db/src/repos.ts`, and bot/space docs | None | None | Turn off either bot’s checkbox to close the route for that pair. Upstream images can still read both chats. |
| MCP setup on the website | `apps/web/src/pages/McpServersOverlay.tsx` | None | None | Revert the patch and rebuild the app image. |
| Preserve bot thinking when switching to the space model on the website | `apps/web/src/pages/{model-settings/space-bots-model,shell/bot-panel}.tsx` | None | None | Revert the patch and rebuild the app image. |
| Thinking on call turns | `packages/adapters/src/executor.ts` | None | None | Revert the patch to use the chat thinking level on future calls. |
| Categorize tool errors in server logs | `packages/adapters/src/tool-completion-audit.ts` | None | None | Revert the patch to remove the category from future log entries. |
| Manual fork image publisher | `.github/workflows/publish-daily-bot-images.yml` | None | None | Disable the workflow. Existing images can still be pulled by tag. |
| OpenAI Realtime calls on the web | `apps/api/src/realtime-call.ts`, `apps/web/src/lib/{call-session,realtime-call,realtime-call-preference}.ts`, Voice and bot settings, and the OpenAI adapter | None | Uses existing `PHONE_CALLS_ENABLED` and OpenAI voice credentials | Select the bot's chat model for the account or bot, or roll back the app image. Transcripts are standard chat messages. |
| Delegate live call requests to the regular bot | `apps/api/src/realtime-chat-handoff.ts`, live call routes, OpenAI adapter, and the run approval gate | None | None | Roll back the app image. Delegated tasks and transcripts remain regular chat records. |
| Limit voice to OpenAI | Voice settings and bot Advanced panel, `apps/api/src/{routes/account,voice,realtime-call,ai-consent}.ts`, `packages/db/src/voice-credentials.ts`, and the OpenAI voice adapter | None | None | Roll back the app image to make previously saved voice providers available again. |
| Shorter live call replies and fresh chat checks | `apps/api/src/{realtime-call,realtime-chat-check,realtime-chat-handoff}.ts` and the OpenAI Realtime adapter | None | None | Revert the call instruction and chat check patches and rebuild the app image. |
| Call pickup, transcript, and reply timing | `packages/core/src/voice-chat-groups.ts`, web call transport and call cards, `apps/web/src/pages/Shell.tsx`, live call context, hang-up route, handoff, and the OpenAI Realtime adapter | None | None | Roll back the app image. Both speakers' saved transcript messages remain readable by upstream. |
| Call tool delivery | `apps/api/src/{realtime-chat-handoff,realtime-call}.ts`, realtime adapter, `packages/core/src/call-nonce.ts`, `packages/adapters/src/{run-turn,run-progress,run-tool-gate,run-tools-messaging}.ts`, `packages/db/src/events.ts` | None | None | Roll back the app image. Spoken results use an optional encrypted completion-event payload field; upstream ignores it. Tasks, tool activity and transcripts retain their stored formats. |
| Current call tool discovery | `apps/api/src/realtime-call.ts`, `packages/adapters/src/openai-realtime-call.ts`, and focused call tests | None | None | Roll back the app image. Only session instructions and the ephemeral provider function name change; saved chats, tasks and settings keep their formats. |
| Update existing call task delivery | `apps/api/src/{realtime-task-delivery,realtime-chat-handoff,realtime-call}.ts`, realtime adapter, `packages/db/src/events.ts`, and focused delivery tests | None | None | Roll back the app image. Delivery uses the existing fork run nonce and ordinary encrypted messages/events; upstream can still read the records. |
| Blank call task IDs | `apps/api/src/realtime-chat-handoff.ts`, its tests, and `packages/adapters/src/openai-realtime-call.ts` | None | None | Roll back the app image. Only voice function dispatch, failure notices and safe status logging change; tasks, chat, credentials and settings retain their formats. |

## Fork features to track

- **Cross-space bot messaging.** Delivery works between the same user's bots in the same organization. Both bots must have **Allow cross-space bot communication** on. New bots start with the permission off. Existing bots keep their saved permission. [Cross-space messaging spec](docs/daily-bot/specs/08-cross-space-bot-messaging.md)
- **Sign-in redirect.** Signed-out visitors opening the app at `/` go to `/sign-in`. The direct `/sign-up` route remains available under the existing server policy.

## Calls on the web

In account **Settings → Voice**, save an OpenAI key with Realtime access. Then
choose **OpenAI Realtime 2.1 Mini** or **OpenAI Realtime 2.1** under **Live call model**.
The model choice is saved in this browser for the signed-in account. In a bot's **Advanced**
tab, its **Live call model** can inherit Voice settings, use its normal chat model for calls,
or select its own Realtime model. The override also stays in this browser. With the existing
`PHONE_CALLS_ENABLED` feature enabled, these choices apply only during calls. The API opens the
WebRTC session with the saved key and gives OpenAI the bot's instructions, Markdown memory,
available chat summary, and a bounded window of recent chat. Call transcripts are stored in
the same encrypted chat. Requests for work or a written reply go to the bot's regular model in
that chat. The live model receives a queued status, any request for input or approval, and the
result while the call is open. Consequential actions from a live call require approval in chat.
Delegated work can continue after hang-up. Live calls have a ten-minute limit.
Voice replies default to brief spoken answers. Task queueing produces no extra generated voice
reply. A task still pending after four seconds gets one short progress notice. Completion waits
for current playback. Work requested in chat gets an isolated spoken confirmation that omits
the written body. All tool-backed call requests use the regular bot's existing executor, tools,
activity stream and permissions. The default delivery is voice: the result goes back to the call,
with tool activity and artifacts visible in chat but no duplicate written answer or streamed prose.
Requested chat posts and substantial written work (drafts, documents, code or long instructions)
use chat delivery instead. Queueing is internal and requires no separate handoff consent.
The voice model directly reads current chat; it no longer runs a separate search/fetch pipeline.
Public web lookups search first and fetch exact result URLs. The main bot is instructed to
keep straightforward spoken lookups to two focused searches and two source reads, stating
any verification limit instead of expanding into exhaustive research. A guessed new destination is sent
back to the model for source discovery before any site-approval card. Saved deny/approval rules,
bot-disabled tools, SSRF protection and approval for consequential actions still apply. Explicit
approval rules on read-only builtins are no longer skipped by the read-only effect fast path.
Spoken results are retained in the existing encrypted `run.completed` event payload, atomically
with completion. The actual spoken reply remains in the collapsed call transcript. Completed
voice work does not send a duplicate completion notification. No migrations, new settings or
changes to encryption handling are required.
Outgoing live calls ring until connected, then the bot greets the caller using the account's
saved display name. A blank name gets a neutral greeting. Incoming calls keep their supplied
opening. Semantic turn detection with low eagerness and near-field noise reduction gives callers
more time to finish speaking. Both speakers' saved words appear in one collapsed transcript
card per call, even when written messages arrive during it. Expanding it labels both speakers.
Greeting-only calls also retain their transcript and recorded duration. The desktop call window
positions itself beside the open side panel and follows panel resizing. Opening Voice settings
from the call minimizes it into the existing return bar.
A read-only live-call tool checks the
current chat when asked about pasted content. It makes up to four reads over three seconds if
nothing new has arrived, returns the saved text or an explicit pending result, and stops on hang-up.
The **Standard call (OpenAI speech)** choice uses the bot's chat model with OpenAI transcription and speech.
Daily Bot uses OpenAI for hosted voice. Previously saved credentials and settings for other voice
providers stay in the database for rollback. A saved OpenAI voice takes effect if the previous
provider is unavailable. Scripted installs can still run the offline call fixtures.

Ordinary spoken call turns request thinking off when the catalog lists that mode for
the model. Regular chat and call-end summaries use their usual model settings. The legacy call mode uses speech-to-text and text-to-speech.

The manual **Publish Daily Bot images** workflow builds both upstream Dockerfiles
for `linux/amd64`, runs the upstream app image credential scan, and publishes
`ghcr.io/trevorbarnesus-lab/daily-bot/app` and `ghcr.io/trevorbarnesus-lab/daily-bot/computer`
with the same `sha-<commit>` tag. Run it from `daily-bot` after the maintainer has
reviewed enabling Actions on the fork. Use the matching tag for both production images.

### Call tool delivery verification

The focused API, adapter, core and database unit checks and call transport regressions passed
(614 checks), along with two PostgreSQL completion tests. The database tests verify that a
spoken result commits with completion while only tool activity is posted in chat. Actual
Realtime Mini sessions delegated a public-information question for spoken delivery and a
fictional email draft for chat delivery, using the running main-model executor and real web
provider. The lookup ran four web tools without an approval pause or a written answer; the
draft posted one written reply and received a short spoken confirmation. These checks used
text input to the voice session and simulated playback completion; they do not verify live
microphone turn detection or subjective audio quality. The local update preserved the existing
synthetic account, bot, chat, memory, routine, settings and decryptable vault fixture. No
production data was used or moved.

### Current call capability rules

The voice function is named `use_bot_tools` and explicitly advertises web lookups, connected
app reads and permitted actions. Current call rules follow saved context, so earlier assistant
claims do not define current capabilities. Requests for current facts must use the tool or ask
for an essential missing detail; lack of access must come from a real tool result. This applies
to tool requests generally, with no weather-specific handler. Saved history and memory stay
available. No migrations, settings or secret-handling changes are added.

Verification for this correction: the 12 focused call/context/handoff checks, API type check and
`linux/amd64` image build passed. Recorded speech was sent through Chromium's WebRTC audio
track after the normal greeting, using the reported bot's saved context. The reported question
asked for the essential missing city; natural news and calendar requests invoked voice delivery,
and an email-draft request invoked chat delivery. A complete recorded forecast question used
three actual web tools through the normal executor, returned a spoken answer and posted zero
written answer messages. Calendar/draft routing checks stopped before executing account actions;
the complete executor check used only public information in a temporary bot, then cleaned it up.

### Existing task delivery and duplicate protection

Queued call work returns a task ID. Delivery-only follow-ups use `send_task_to_chat` with that
same ID, including requests to continue after hang-up and repeated confirmations. This path
cannot enqueue work. A task ID passed to the regular work tool also reuses the existing task.
Different new requests still create their own tasks; there is no text-similarity deduplication.

The server checks ownership, bot, thread and originating call. It persists chat delivery by
changing the existing fork voice nonce to its chat counterpart. A thread lock shared with
completion makes that decision atomic: a worker already running in voice mode reads the saved
choice before publishing. If the voice task already finished, the stored encrypted result is
added once to its existing activity message, or a normal message is created if none exists.
Repeated or concurrent requests find the existing answer. The original task, source request,
permissions and result remain intact, and the delivery change survives call closure. Task
results are not regenerated to change delivery. No schema, environment or encryption changes.

Verification includes 421 focused API/adapter/database checks, nine PostgreSQL tests covering
repeated redirects, a worker's stale delivery mode, completion races, late delivery with and
without an activity message, scope isolation, and earlier progress notes. A recorded WebRTC call requested written
work, asked to continue after hang-up, then repeated the confirmation. It retained one task,
performed one delivery update and posted one controlled result after the call closed. That
fixture held work open deliberately; it did not fetch or validate a real sports schedule.

A second recorded call began with voice delivery, changed the existing task to chat, repeated
the hang-up confirmation and then closed. The worker finished using its original voice-mode
snapshot; the saved choice still produced one chat result after hang-up. The delivery tool
called silently and the application confirmed only after the change committed.


## Blank call task IDs

A recorded call through the actual call route reproduced the lookup refusal: the voice model
emitted `use_bot_tools` with `delivery: "voice"` and `task_id: ""`. The bridge interpreted
that empty optional argument as a request about existing work, returned `unknown_task`, and
started a response with tools disabled. No lookup ran, and the voice model invented an
explanation that live information was unavailable.

Empty, whitespace-only and null task IDs now follow the normal new-work path. Only a
nonblank task ID selects existing work, and existing-task delivery still reuses its original
run. The public new-work function accepts only delivery; `send_task_to_chat` remains the
separate function for changing an existing result's destination. Compatibility handling
still recognizes actual task IDs supplied to the work function.

Unknown existing-task status checks, missing-transcript and queue failures use an isolated retry notice,
instead of generating an explanation from old conversation history. Safe status logs
record queued, reused and rejected handoffs without transcripts, audio or credentials.
No schema, settings, model selection, permissions or encryption changes are included.

Regression tests replay the observed blank-ID shape with both delivery modes, whitespace
and null values, alongside the existing task reuse and duplicate-delivery tests. Recorded
WebRTC tests use temporary development fixtures and the actual route, including greeting,
saved speech, main-model tools and spoken/written delivery. Successful routing does not
by itself verify retrieved facts or subjective audio quality.


Validation for this patch: 23 focused call/check tests, 640 executor tests and nine
PostgreSQL delivery/completion tests passed. The `linux/amd64` app image built successfully.
Two recorded weather calls through the actual route completed one tool run each and posted
no written answer; one replay explicitly injected the previously failing empty task ID.
A recorded request to post in chat also replayed the empty ID and produced one written
result. The local preview then passed the existing upstream-populated synthetic fixture
checks for sign-in, settings, bots, chats, memory, routines and credential decryption.

The API typecheck passed. A broader adapters-package typecheck reports an existing tuple
indexing error in `executor-readonly-approval.test.ts`; that unchanged test is outside this
patch. Source retrieval quality and production readiness are not certified by these checks.
