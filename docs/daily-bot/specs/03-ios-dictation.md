# Built-in voice dictation on iOS (Phase 3)

> Verbatim from Trevor's original spec (TASK.md, Addendum 1, Nov 4 3:22 AM). Do not edit; put design notes in PLAN.md.

The iOS app has no built-in voice dictation, only the keyboard mic. That stops when you move around the app, and it is worse than the built-in dictation in ChatGPT or Claude. Plan a built-in dictation button in the mobile composer: tap to record, transcribe (reuse /api/voice/transcribe or stream it), insert the text into the input, keep recording while the user scrolls or moves around the app, and handle permissions, errors, and a visual state. Note web and desktop impact (lower priority). Same plan sections as the other phases. Still read-only.
