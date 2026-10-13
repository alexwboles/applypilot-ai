/* ApplyPilot AI — core logic: pipeline stats, follow-up nudges,
   keyword extraction, match scoring, cover-letter generation. Pure functions. */
"use strict";

function parseISO(s) {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, m - 1, d);
}
function toISO(dt) {
  const p = n => String(n).padStart(2, "0");
  return dt.getFullYear() + "-" + p(dt.getMonth() + 1) + "-" + p(dt.getDate());
}
function todayISO() { return toISO(new Date()); }
function daysBetween(aISO, bISO) {
  return Math.round((parseISO(bISO) - parseISO(aISO)) / 86400000);
}

/** Count applications per pipeline stage. */
function stageStats(apps) {
  const counts = {};
  for (const a of apps || []) counts[a.stage] = (counts[a.stage] || 0) + 1;
  return counts;
}

/** Funnel stats: applied, response rate (interviewing+offer / applied-ish), offer rate. */
function funnelStats(apps) {
  const list = apps || [];
  const active = list.filter(a => ["applied", "interviewing", "offer", "rejected"].includes(a.stage));
  const responded = list.filter(a => ["interviewing", "offer"].includes(a.stage)).length;
  const offers = list.filter(a => a.stage === "offer").length;
  return {
    total: list.length,
    active: active.length,
    responseRate: active.length ? Math.round((responded / active.length) * 100) : 0,
    offers,
    rejected: list.filter(a => a.stage === "rejected").length
  };
}

/**
 * Follow-up nudges: applications stuck in "applied" with no response for
 * >= FOLLOWUP_AFTER_DAYS and no followUpDone flag. Sorted oldest first.
 */
function followUpNudges(apps, followupDays, fromISO) {
  const now = fromISO || todayISO();
  return (apps || [])
    .filter(a => a.stage === "applied" && !a.followUpDone && a.dateApplied)
    .map(a => ({ app: a, waiting: daysBetween(a.dateApplied, now) }))
    .filter(x => x.waiting >= (followupDays || 7))
    .sort((a, b) => b.waiting - a.waiting)
    .map(x => ({
      app: x.app,
      waiting: x.waiting,
      nudge: `It's been ${x.waiting} days since you applied to ${x.app.company} — send a polite follow-up email.`
    }));
}

/** Extract known skill keywords from a job description (case-insensitive). */
function extractKeywords(jobDesc, skillBank) {
  const text = " " + String(jobDesc || "").toLowerCase() + " ";
  const found = [];
  for (const kw of skillBank || []) {
    if (text.includes(kw.toLowerCase())) found.push(kw);
  }
  return [...new Set(found)];
}

/**
 * Match score 0–100: % of job keywords also mentioned in the background text,
 * blended with a small bonus for longer backgrounds (detail signals effort).
 */
function matchScore(jobKeywords, background) {
  if (!jobKeywords || !jobKeywords.length) return 0;
  const bg = String(background || "").toLowerCase();
  const hits = jobKeywords.filter(k => bg.includes(k.toLowerCase())).length;
  let score = Math.round((hits / jobKeywords.length) * 100);
  if (bg.trim().split(/\s+/).length >= 40) score = Math.min(100, score + 5);
  return score;
}

/**
 * Generate a cover letter. Deterministic template assembly (no network).
 * opts: { name, role, company, tone, background, jobDesc, skillBank, valueProps, tones }
 */
function generateCoverLetter(opts) {
  const o = opts || {};
  const tone = (o.tones || {})[o.tone] || (o.tones || {}).professional || { openers: [""], closers: [""] };
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const fill = s => String(s).replace("{role}", o.role || "the role").replace("{company}", o.company || "your company");
  const keywords = extractKeywords(o.jobDesc, o.skillBank).slice(0, 3);
  const bg = String(o.background || "").trim().split(/(?<=[.!?])\s+/)[0] || "my professional background";
  const paras = [fill(pick(tone.openers))];
  if (keywords.length) {
    const frames = o.valueProps || ["My experience with {kw} is directly relevant: {bg}."];
    const kwList = keywords.join(", ");
    paras.push(frames[0].replace("{kw}", kwList).replace("{bg}", bg));
    if (keywords.length > 1 && frames[1]) {
      paras.push(frames[1].replace("{kw}", keywords.slice(1).join(", ")).replace("{bg}", bg));
    }
  } else if (bg) {
    paras.push("My background — " + bg + " — has given me the skills to contribute from day one.");
  }
  paras.push(fill(pick(tone.closers)));
  const sig = o.name ? `\n\nSincerely,\n${o.name}` : "";
  return { letter: paras.join("\n\n") + sig, keywords, score: matchScore(keywords, o.background) };
}

/**
 * Upcoming deadlines: applications with a deadline date set, optionally
 * including overdue ones. Sorted soonest first.
 * Each item: { app, daysLeft (negative = overdue), overdue }.
 */
function upcomingDeadlines(apps, daysAhead, fromISO) {
  const now = fromISO || todayISO();
  const ahead = daysAhead == null ? 30 : daysAhead;
  return (apps || [])
    .filter(a => a.deadline && /^\d{4}-\d{2}-\d{2}$/.test(a.deadline))
    .map(a => {
      const daysLeft = daysBetween(now, a.deadline);
      return { app: a, daysLeft, overdue: daysLeft < 0 };
    })
    .filter(x => x.overdue || x.daysLeft <= ahead)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/**
 * Post-interview thank-you note. Deterministic template assembly (no network).
 * opts: { name, interviewer, company, role, tone, thankyou }.
 * Returns { note, tone }.
 */
function generateThankYou(opts) {
  const o = opts || {};
  const bank = o.thankyou || {};
  const toneKey = bank.openers && bank.openers[o.tone] ? o.tone : "professional";
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const fill = s => String(s)
    .replace("{role}", o.role || "the role")
    .replace("{company}", o.company || "your company")
    .replace("{interviewer}", (o.interviewer || "").trim() || "there");
  const openers = (bank.openers && bank.openers[toneKey]) || [""];
  const bodies = bank.bodies || [""];
  const closers = (bank.closers && bank.closers[toneKey]) || [""];
  const who = (o.interviewer || "").trim();
  const greet = who ? "Dear " + who + "," : "Hello,";
  const sig = o.name ? "\n\nBest regards,\n" + o.name : "";
  return {
    note: greet + "\n\n" + fill(pick(openers)) + "\n\n" + fill(pick(bodies)) + "\n\n" + fill(pick(closers)) + sig,
    tone: toneKey
  };
}

/**
 * Upcoming interviews: applications with interviewAt set ("YYYY-MM-DDTHH:mm").
 * Each item: { app, at (Date), hoursLeft (negative = overdue), overdue }.
 * Sorted soonest first; `nowMs` is injectable for tests.
 */
function upcomingInterviews(apps, daysAhead, nowMs) {
  const now = nowMs != null ? nowMs : Date.now();
  const ahead = daysAhead == null ? 14 : daysAhead;
  return (apps || [])
    .filter(a => a.interviewAt && !isNaN(new Date(a.interviewAt).getTime()))
    .map(a => {
      const at = new Date(a.interviewAt);
      const hoursLeft = (at.getTime() - now) / 3600000;
      return { app: a, at, hoursLeft, overdue: hoursLeft < 0 };
    })
    .filter(x => x.overdue || x.hoursLeft <= ahead * 24)
    .sort((a, b) => a.hoursLeft - b.hoursLeft);
}

/** Human countdown: "in 2d 5h", "in 3h", "in 20m", or "overdue". */
function fmtCountdown(hoursLeft) {
  if (hoursLeft == null || isNaN(hoursLeft)) return "—";
  if (hoursLeft < 0) return "overdue";
  const d = Math.floor(hoursLeft / 24), h = Math.floor(hoursLeft % 24);
  if (d > 0) return "in " + d + "d " + h + "h";
  if (hoursLeft >= 1) return "in " + Math.floor(hoursLeft) + "h";
  return "in " + Math.max(1, Math.round(hoursLeft * 60)) + "m";
}

/** Append a timestamped entry to an application's activity timeline. */
function logActivity(app, text, tsISO) {
  if (!app || !String(text || "").trim()) return app;
  app.activity = app.activity || [];
  app.activity.push({ ts: tsISO || new Date().toISOString(), text: String(text).trim() });
  return app;
}

/**
 * Parse a salary range string into { min, max, mid } (annual USD).
 * Handles "$90k–$110k", "$90k-$110k", "$120,000", "95000", "$95/hr" (hourly × 2080).
 * Returns null when nothing parseable is found.
 */
function parseSalary(text) {
  const s = String(text || "").toLowerCase().replace(/,/g, "");
  const hourly = /\/\s*(hr|hour)/.test(s);
  const vals = (s.match(/\d+(?:\.\d+)?\s*k?/g) || [])
    .map(m => {
      const k = /k\s*$/.test(m);
      const n = parseFloat(m);
      if (!n || n <= 0) return 0;
      return k ? n * 1000 : n;
    })
    .filter(n => n > 0);
  if (!vals.length) return null;
  const min = Math.min(...vals), max = Math.max(...vals);
  const factor = hourly ? 2080 : 1;
  return {
    min: Math.round(min * factor),
    max: Math.round(max * factor),
    mid: Math.round(((min + max) / 2) * factor),
    hourly
  };
}

/**
 * Salary stats over offer-stage applications with parseable salary ranges.
 * Returns { count, avgMid, min, max } — all 0 when no data.
 */
function offerStats(apps) {
  const mids = (apps || [])
    .filter(a => a.stage === "offer")
    .map(a => parseSalary(a.salary))
    .filter(Boolean)
    .map(s => s.mid);
  if (!mids.length) return { count: 0, avgMid: 0, min: 0, max: 0 };
  return {
    count: mids.length,
    avgMid: Math.round(mids.reduce((s, n) => s + n, 0) / mids.length),
    min: Math.min(...mids),
    max: Math.max(...mids)
  };
}

/**
 * Weekly application cadence: applications dated within the last 7 days
 * (inclusive) against a weekly target.
 * Returns { count, target, pct, met }.
 */
function weekStats(apps, target, fromISO) {
  const now = fromISO || todayISO();
  const weekAgo = toISO(new Date(parseISO(now).getTime() - 6 * 86400000));
  const count = (apps || []).filter(a =>
    a.dateApplied && a.dateApplied >= weekAgo && a.dateApplied <= now).length;
  const t = Math.max(0, target || 0);
  return {
    count,
    target: t,
    pct: t ? Math.min(100, Math.round((count / t) * 100)) : 0,
    met: t > 0 && count >= t
  };
}

/**
 * Average days applications spend in each pipeline stage, derived from the
 * "Moved to <label>" entries in activity timelines: time in a stage runs from
 * its move-in day to the next move (or today for the current stage).
 * labelToStage maps display labels back to stage slugs (defaults to lowercase).
 * Returns { <stage>: avgDays }.
 */
function stageDurations(apps, fromISO, labelToStage) {
  const now = fromISO || todayISO();
  const map = labelToStage || {};
  const slug = label => {
    const l = String(label || "").trim();
    return map[l] || l.toLowerCase();
  };
  const totals = {}, counts = {};
  (apps || []).forEach(a => {
    const events = [];
    (a.activity || []).forEach(x => {
      const m = /^Moved to (.+)$/.exec(String(x.text || "").trim());
      const day = String(x.ts || "").slice(0, 10);
      if (m && /^\d{4}-\d{2}-\d{2}$/.test(day)) events.push({ day, stage: slug(m[1]) });
    });
    events.sort((x, y) => (x.day < y.day ? -1 : x.day > y.day ? 1 : 0));
    for (let i = 0; i < events.length; i++) {
      const end = i + 1 < events.length ? events[i + 1].day : now;
      const days = Math.max(0, daysBetween(events[i].day, end));
      totals[events[i].stage] = (totals[events[i].stage] || 0) + days;
      counts[events[i].stage] = (counts[events[i].stage] || 0) + 1;
    }
  });
  const avg = {};
  Object.keys(totals).forEach(s => { avg[s] = Math.round((totals[s] / counts[s]) * 10) / 10; });
  return avg;
}

function csvCell(v) {
  const s = String(v == null ? "" : v).replace(/\r?\n/g, " ");
  return /[",]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** Export the pipeline as CSV: one row per application. */
function appsToCSV(apps) {
  const rows = [["company", "role", "stage", "date_applied", "deadline",
    "contact", "link", "salary", "salary_mid", "follow_up_sent", "notes"]];
  (apps || []).forEach(a => {
    const sal = parseSalary(a.salary);
    rows.push([
      a.company || "", a.role || "", a.stage || "", a.dateApplied || "",
      a.deadline || "", a.contact || "", a.link || "", a.salary || "",
      sal ? String(sal.mid) : "", a.followUpDone ? "yes" : "no", a.notes || ""
    ]);
  });
  return rows.map(r => r.map(csvCell).join(",")).join("\n");
}

/** Match apps against a search query (company, role, contact, notes). */
function searchApps(apps, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return apps || [];
  return (apps || []).filter(a =>
    [a.company, a.role, a.contact, a.notes].some(
      f => String(f || "").toLowerCase().includes(q)));
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { parseISO, toISO, todayISO, daysBetween, stageStats, funnelStats,
    followUpNudges, extractKeywords, matchScore, generateCoverLetter,
    generateThankYou, upcomingInterviews, fmtCountdown, logActivity,
    upcomingDeadlines, appsToCSV, searchApps, demoBoard,
    parseSalary, offerStats, weekStats, stageDurations };
}

/* Demo board seed — one click loads a realistic sample pipeline. */
function demoBoard() {
  const daysAgo = n => toISO(new Date(Date.now() - n * 864e5));
  const mk = (company, role, stage, appliedDaysAgo, opts) => {
    const app = Object.assign({
      id: "demo-" + String(company).toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 8),
      company, role, stage,
      dateApplied: daysAgo(appliedDaysAgo),
      deadline: "", contact: "", link: "", salary: "",
      notes: "", jobDesc: "", followUpDone: false, interviewAt: "", activity: []
    }, opts || {});
    logActivity(app, "Moved to " + stage, daysAgo(appliedDaysAgo) + "T09:00:00");
    return app;
  };
  return [
    mk("Northwind Retail", "Senior Customer Support Lead", "applied", 9, {
      salary: "$88k–$102k", contact: "Priya Nair",
      notes: "Met the team at a virtual info session; asked about escalation workflow." }),
    mk("Bluefin Logistics", "Operations Analyst", "applied", 12, { salary: "$95k–$110k" }),
    mk("Harbor & Finch", "Support Engineer", "interviewing", 16, {
      contact: "Marcus Webb",
      interviewAt: toISO(new Date(Date.now() + 2 * 864e5)).slice(0, 16),
      notes: "Round 2 — system design chat with the platform team." }),
    mk("Copperline Foods", "Line Supervisor", "wishlist", 0, { notes: "Posting closes Friday — tailor letter with food-safety keywords." }),
    mk("Aster Analytics", "Data QA Specialist", "offer", 21, {
      salary: "$105k–$118k", notes: "Offer letter received — deciding by end of week." }),
    mk("Vantage Telecom", "Field Technician", "rejected", 30, { notes: "No response after final round — asked for feedback, none received." })
  ];
}
