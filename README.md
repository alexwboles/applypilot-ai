# ✈️ ApplyPilot AI

**The job-seeker's copilot.** Track every application in a visual pipeline, generate tailored cover letters in 3 tones from any job description, get follow-up nudges before opportunities go cold, and watch your response rate — all running 100% locally in your browser.

## The problem

Job hunting falls apart in spreadsheets: you forget who you applied to, cover letters take 45 minutes each, follow-ups never happen, and you have no idea if your 3% response rate is normal. ApplyPilot AI fixes the loop (note: [HireWise AI](https://github.com/alexwboles/hirewise-ai) is the employer side — this is the candidate side):

1. **Pipeline board** — wishlist → applied → interviewing → offer / rejected, with one-click stage moves
2. **Application details** — contacts, listing links, salary ranges, notes, and the full job description per application
3. **Cover letter writer** — paste a job description + your background → tailored letter in Professional, Warm, or Bold tone, with a keyword-match score showing how well you fit
4. **Follow-up nudges** — applications sitting in "applied" for 7+ days with no response get flagged
5. **Stats** — response rate (interviewing + offers ÷ applied), offer count, rejection count
6. **Optional AI polish** — paste your own OpenAI API key for a rewritten opening line (never required)

## How to run

No build step, no server, no account. Just open `index.html` in any browser — or serve it statically:

```bash
npx serve .        # or: python3 -m http.server 8080
```

Your data lives in `localStorage` under `applypilot.v1`. Nothing ever leaves your device.

## How the letter writer works

`extractKeywords()` scans the job description against a 45-skill bank (`js/letterbank.js`). `matchScore()` measures how many of those keywords also appear in your background text. `generateCoverLetter()` assembles a deterministic letter: tone-specific opener → value-prop paragraph built around your top matched keywords → tone-specific closer. No network, no randomness you can't reproduce — always proofread before sending.

## Tests

```bash
bash test/smoke.sh   # 12 checks: files, syntax, tone bank, letter generation, funnel math
bash test/e2e.sh     # 7 flows: follow-up nudges, keyword extraction, match scoring, tone distinctness, edge cases
```

## Pricing vision (future)

- **Free** — unlimited applications, cover letters, stats
- **Pro ($8/mo)** — application deadline reminders, interview prep question generator per role, salary negotiation scripts
- **Coach ($29/mo)** — for career coaches: client workspaces, shared pipelines, resume review checklists
