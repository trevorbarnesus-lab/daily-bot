# Cross-space messaging between a user's own bots (Phase 8)

> Verbatim from Trevor's original spec (TASK.md, Nov 4 6:53 PM ET). Do not edit; put design notes in PLAN.md.

# Fork feature: let a user's own bots message each other across spaces

## Problem
In Rakazo, each bot has an "Allow cross-space bot communication" toggle (Settings → Permissions). docs/spaces.md and docs/groups.md say it lets a bot reach bots in the user's other spaces. In practice it doesn't:

- `message_bot` (packages/adapters/src/bot-messages.ts, around lines 99–107) only looks up bots where `spaceId: run.spaceId`. A bot in another space returns "no bot found with that id or name", even with an exact bot ID and the toggle on for both bots.
- The toggle only gates "agent connections" (packages/adapters/src/agent-connections.ts). Those are for reaching *another person's* bot by its owner's chat-app address, such as a phone number or Telegram ID. They only work for bots linked to a chat app, and `messaging_identities` is unique per (provider, address), so one owner can't link two of their own bots on the same app. A user's own bots in different spaces therefore have no way to talk.

Example: Mira (Personal space) needs to ask Storm (Home Lab space) about the weather. Both have the toggle on. Mira gets "no bot found".

Upstream PR #1346 tried a similar change and was closed as a design decision ("Spaces are meant to be isolation boundaries"). This fork deliberately goes the other way, but only when the user turns the toggle on for both bots.

## What to build
Let `message_bot` reach the same user's bots in other spaces when both bots have `crossSpaceCommunication = true`.

1. **Lookup.** In bot-messages.ts, keep looking in the current space first. If no match is found there, look across all of the same user's non-archived bots (`userId: run.userId`, `archivedAt: null`) in other spaces. A same-space match always wins.
   - If a name matches bots in more than one other space, return an error listing the matches with their space names, and ask for `bot_id`. Never guess.
2. **Permission check.** Before any cross-space delivery, call `crossSpaceCommunicationAllowed(tx, sender.id, target.id)` from packages/db/src/cross-space-communication.ts inside the delivery transaction. It locks both bot rows and returns true only when both bots have the toggle on (or they share a space). If it fails, return the same "no bot found with that id or name" error, so blocked bots aren't revealed.
3. **Space context and encryption.** Spaces have row-level security and per-space content encryption. A lookup or write running in the sender's space context will return nothing or fail.
   - Run the cross-space lookup and delivery the way agent-connections.ts does: `runAsSystem(...)` with a clear reason string, and the shared bot-message delivery code.
   - Write the delivered message into the target bot's thread under the **target's** space, so it's encrypted with the target space's key.
   - Never write content from one space into another space's rows.
4. **Replies.** The target's reply (intent "result" or "status") must reach the sender across spaces, using the same checks. Keep the existing hop limit (`nextBotMessageHop`) and loop protection unchanged.
5. **Discovery.** A bot should be able to find its cross-space peers. When the toggle is on for the sender, add the user's other toggle-on bots to the bot's roster or tool description, each with its name, space name and "How other bots see it" description. Hide bots whose toggle is off.
6. **Turning it off.** Switching the toggle off on either bot must immediately stop new deliveries in both directions. The locking in step 2 handles races. Messages already delivered stay where they are.
7. **Docs.** Update docs/spaces.md and docs/groups.md to say exactly what the toggle allows: same-user bots across spaces via message_bot, plus the existing chat-app agent connections to other people's bots.

## Constraints
- Keep the change small and in as few files as possible. This fork rebases on a fast-moving upstream (about one release a day), so avoid refactors.
- Don't touch agent connections, groups, or same-space messaging, apart from the shared lookup.
- Never cross users: only the same `userId`.

## Tests
Add unit and Postgres tests next to the existing ones (bot-messages tests, cross-space-communication.test.ts):
- Same space: unchanged behavior.
- Different spaces, both toggles on: delivered. The message lands in the target's thread, readable and decrypted in the target space.
- Different spaces, either toggle off: "no bot found", nothing written.
- Toggle turned off while a delivery is in flight: no delivery after the toggle-off commits.
- Different user's bot with the same name: never found.
- Name matching bots in two other spaces: ambiguity error listing both; bot_id works.
- A reply from the target reaches the sender across spaces; the hop limit still stops loops.
- The roster shows cross-space peers only when both toggles are on.

## Done when
On a running instance, Mira (Personal) can message_bot Storm (Home Lab) by name and get Storm's reply back in Mira's chat. Turning either toggle off blocks it with "no bot found". All existing tests pass.

## Decisions (Nov 4, 2026)
- Toggle OFF by default in the fork; existing toggle; both bots must be on.
- Both bots' spaces must be in the same organization.
- Small "(Space name)" cross-space label.
- Fork-only; never upstream.
