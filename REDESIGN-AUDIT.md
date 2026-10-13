# REDESIGN-AUDIT.md — ApplyPilot AI (2026-10-13)

## Competitors researched
- **Teal (tealhq.com)** — job tracker + resume builder; kanban board, per-job detail drawer, keyword highlighting, guided onboarding goals, LinkedIn review tool. Visual: clean light UI, dense but organized board, left nav, blue accent.
- **Huntr** — kanban columns (saved/applied/interview/offer), job cards with company logo, salary, follow-up badges, dashboard stats, metrics view.
- **Jobwell / Notion trackers** — five-column boards, card color coding, custom properties (days active, action required), dashboard views (board + table + reminders).
- **JobTrackr (open-source Next.js clone)** — dashboard with summary stats + recent apps + follow-up reminders; analytics tab with funnel chart and 30-day timeline.

## Visual gaps vs competitors
1. **No persistent app chrome.** Tabs sit in the page flow under a big header; Teal/Huntr have a fixed left rail with brand + nav. The app feels like a document, not software.
2. **Kanban columns are flat and undifferentiated.** All five columns identical gray boxes; competitors use stage-colored headers, counts, and card affordances that signal status at a glance.
3. **Cards look like form rows, not job records.** No visual hierarchy — company name same weight as metadata; missing Huntr-style affordances (days-waiting badge buried, no follow-up urgency treatment).
4. **"Flight deck" identity is only a tagline.** Navy/brass exists but the stats tab is generic stat boxes; nothing reads as instruments, radar, or departure boards.
5. **Typography is flat.** One sans weight ramp; competitors pair strong display headlines with tabular mono for numbers/dates/countdowns.
6. **Empty states are bare.** "No applications here yet" text with no next-action; Teal guides first actions.
7. **Header wastes vertical space** — full-width tagline + pill above tabs; compresses the working area.

## Functional/flow gaps vs competitors
1. **No seed/demo data.** Every competitor offers a sample board or import; first paint is five empty columns.
2. **No board density control.** Teal lets users toggle board/table; here the kanban is the only view.
3. **Follow-up radar exists in stats but not surfaced on the board.** Huntr flags stale cards in-column; here the nudge list lives a tab away.
4. **Cover-letter output is a plain `<pre>` block** — Teal's letter/builder feels like a document editor with keyword highlighting; ours shows a match score gauge only in the header.
5. **No per-column summary** (avg days in stage per column, not just the stats tab).

## What this redesign does
- **App-shell transformation:** fixed dark-navy left rail (brand, vertical nav tabs, local pill, live stage counts) + main workspace — same IDs/classes, pure structure move + CSS.
- **Departure-board identity:** gate-sign column headers with split-flap mono counts; application cards as boarding passes (perforated divider, ticket number, days-waiting badge as "hold time"); stats as instrument gauges.
- **Editorial cover-letter view:** document-style letter sheet with keyword-highlighted score breakdown.
- **Designed empty states** with next-action copy.
- **Functional:** (a) "Load demo board" one-click seed in the board tools (localStorage-safe, new keys + confirm), (b) stale follow-up badges rendered on board cards (not just stats tab), (c) per-column average-days footer.
- No regressions: all IDs/classes preserved; smoke + e2e extended for the new flows.
