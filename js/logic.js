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

if (typeof module !== "undefined" && module.exports) {
  module.exports = { parseISO, toISO, todayISO, daysBetween, stageStats, funnelStats,
    followUpNudges, extractKeywords, matchScore, generateCoverLetter };
}
