/* ApplyPilot AI — UI glue. Data in localStorage under applypilot.v1. */
"use strict";
const LS_KEY = "applypilot.v1";

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || blank(); }
  catch (e) { return blank(); }
}
function blank() { return { apps: [], profile: { name: "", background: "" } }; }
function save(s) { localStorage.setItem(LS_KEY, JSON.stringify(s)); }
function uid() { return "a" + Date.now().toString(36) + Math.floor(Math.random() * 999); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

let S = load();
let boardQuery = "";
function persist() { save(S); render(); }
function switchTab(name) {
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id === "panel-" + name));
}

/* ---------- pipeline board ---------- */
const STAGE_ICONS = {
  wishlist: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  applied: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>',
  interviewing: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  offer: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v6a5 5 0 0 1-10 0z"/><path d="M7 6H4a2 2 0 0 0 0 4h3"/><path d="M17 6h3a2 2 0 0 1 0 4h-3"/></svg>',
  rejected: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6"/><path d="M9 9l6 6"/></svg>'
};
function renderBoard() {
  const box = document.getElementById("board");
  const visible = searchApps(S.apps, boardQuery);
  const ivById = {};
  upcomingInterviews(S.apps, 14).forEach(x => { ivById[x.app.id] = x; });
  box.innerHTML = STAGES.map(st => {
    const list = visible.filter(a => a.stage === st);
    const total = (S.apps || []).filter(a => a.stage === st).length;
    const countLabel = boardQuery ? `${list.length} of ${total}` : `${total}`;
    return `<div class="col" data-stage="${st}">
      <h3><span class="stage-ic">${STAGE_ICONS[st] || ""}</span>${STAGE_LABELS[st]} <span class="count">${countLabel}</span></h3>
      ${list.map(a => {
        const initial = esc((a.company || "?").trim().charAt(0).toUpperCase());
        const waiting = a.stage === "applied" && a.dateApplied
          ? ` · <span class="wait">${daysBetween(a.dateApplied, todayISO())}d waiting</span>` : "";
        const due = a.deadline
          ? ` · <span class="due">due ${esc(a.deadline)}</span>` : "";
        const iv = ivById[a.id];
        const ivBadge = iv
          ? ` · <span class="due${iv.overdue ? " overdue" : ""}">interview ${esc(fmtCountdown(iv.hoursLeft))}</span>` : "";
        return `
        <div class="acard">
          <div class="strip-main">
            <span class="avatar" aria-hidden="true">${initial}</span>
            <div class="strip-id">
              <b>${esc(a.company)}</b>
              <div class="muted small">${esc(a.role)}</div>
            </div>
          </div>
          <div class="strip-meta muted small">Applied ${esc(a.dateApplied || "—")}${waiting}${due}${ivBadge}${a.salary ? ` · ${esc(a.salary)}` : ""}</div>
          <div class="rowbtns">
            ${STAGES.filter(s => s !== a.stage).map(s =>
              `<button class="btn tiny" onclick="moveApp('${a.id}','${s}')" title="Move to ${STAGE_LABELS[s]}">→ ${STAGE_LABELS[s]}</button>`).join("")}
          </div>
          <button class="btn tiny ghost" onclick="editApp('${a.id}')">Details</button>
        </div>`; }).join("") || `<p class="muted small col-empty">${boardQuery ? "No matches for this search." : "No applications here yet."}</p>`}
    </div>`;
  }).join("");
}
function moveApp(id, stage) {
  const a = S.apps.find(x => x.id === id); if (!a) return;
  a.stage = stage;
  logActivity(a, "Moved to " + (STAGE_LABELS[stage] || stage));
  persist();
}
function delApp() {
  const id = document.getElementById("dId").value;
  S.apps = S.apps.filter(x => x.id !== id);
  document.getElementById("detailBox").style.display = "none";
  persist();
}
function dupApp(id) {
  const a = S.apps.find(x => x.id === id); if (!a) return;
  const copy = {
    id: uid(),
    company: a.company, role: a.role,
    stage: "wishlist",
    dateApplied: todayISO(),
    deadline: a.deadline || "",
    contact: a.contact || "", link: a.link || "", salary: a.salary || "",
    notes: a.notes || "", jobDesc: a.jobDesc || "", followUpDone: false,
    interviewAt: "", activity: []
  };
  logActivity(copy, "Moved to " + (STAGE_LABELS.wishlist || "wishlist"));
  logActivity(copy, "Duplicated from " + (a.company || "another application"));
  S.apps.push(copy);
  document.getElementById("detailBox").style.display = "none";
  persist();
}
function exportCsv() {
  const csv = appsToCSV(S.apps);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "applypilot-applications.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------- add / edit ---------- */
function addApp(e) {
  e.preventDefault();
  const company = document.getElementById("fCompany").value.trim();
  const role = document.getElementById("fRole").value.trim();
  if (!company || !role) return;
  const stage = document.getElementById("fStage").value;
  const app = {
    id: uid(), company, role,
    stage,
    dateApplied: document.getElementById("fDate").value || todayISO(),
    deadline: document.getElementById("fDeadline").value || "",
    contact: document.getElementById("fContact").value.trim(),
    link: document.getElementById("fLink").value.trim(),
    salary: document.getElementById("fSalary").value.trim(),
    notes: document.getElementById("fNotes").value.trim(),
    jobDesc: "", followUpDone: false, interviewAt: "", activity: []
  };
  logActivity(app, "Moved to " + (STAGE_LABELS[stage] || stage));
  S.apps.push(app);
  e.target.reset();
  document.getElementById("fDate").value = todayISO();
  persist();
}
function editApp(id) {
  const a = S.apps.find(x => x.id === id); if (!a) return;
  const box = document.getElementById("detailBox");
  box.style.display = "block";
  box.innerHTML = `
    <h3>${esc(a.company)} — ${esc(a.role)}</h3>
    <input type="hidden" id="dId" value="${a.id}">
    <div class="form">
      <label>Contact <input id="dContact" value="${esc(a.contact || "")}" placeholder="Hiring manager, email…"></label>
      <label>Listing link <input id="dLink" value="${esc(a.link || "")}"></label>
      <label>Salary range <input id="dSalary" value="${esc(a.salary || "")}" placeholder="$90k–$110k"></label>
      <label>Next deadline <input id="dDeadline" type="date" value="${esc(a.deadline || "")}"></label>
      <label>Interview date &amp; time <input id="dInterview" type="datetime-local" value="${esc(a.interviewAt || "")}"></label>
      <label>Job description (paste — powers the cover letter + keyword match)
        <textarea id="dJobDesc" placeholder="Paste the job posting here…">${esc(a.jobDesc || "")}</textarea></label>
      <label>Notes <textarea id="dNotes" placeholder="Interview dates, impressions…">${esc(a.notes || "")}</textarea></label>
      <label class="check"><input type="checkbox" id="dFollow" ${a.followUpDone ? "checked" : ""}> Follow-up sent</label>
      <h4 class="tl-head">Activity timeline</h4>
      <ul class="timeline">${(a.activity || []).slice().reverse().map(x =>
        `<li><span class="tl-ts">${esc(String(x.ts || "").slice(0, 16).replace("T", " "))}</span> ${esc(x.text)}</li>`).join("") ||
        `<li class="muted small">No activity yet — stage moves are logged automatically.</li>`}</ul>
      <div class="form inline">
        <input id="dNote" placeholder="Add a note — e.g. talked to Sarah, asked for portfolio" aria-label="Add an activity note">
        <button class="btn small" onclick="addNote()">Add note</button>
      </div>
      <div class="rowbtns">
        <button class="btn small" onclick="saveDetail()">Save</button>
        <button class="btn small" onclick="useForLetter('${a.id}')">Write cover letter</button>
        <button class="btn small ghost" onclick="dupApp('${a.id}')">Duplicate</button>
        <button class="btn danger small" onclick="delApp()">Delete</button>
      </div>
    </div>`;
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function addNote() {
  const id = document.getElementById("dId").value;
  const a = S.apps.find(x => x.id === id); if (!a) return;
  const note = document.getElementById("dNote").value.trim();
  if (!note) return;
  logActivity(a, note);
  save(S);
  editApp(id);
}
function saveDetail() {
  const id = document.getElementById("dId").value;
  const a = S.apps.find(x => x.id === id); if (!a) return;
  a.contact = document.getElementById("dContact").value.trim();
  a.link = document.getElementById("dLink").value.trim();
  a.salary = document.getElementById("dSalary").value.trim();
  a.deadline = document.getElementById("dDeadline").value || "";
  a.interviewAt = document.getElementById("dInterview").value || "";
  a.jobDesc = document.getElementById("dJobDesc").value;
  a.notes = document.getElementById("dNotes").value;
  a.followUpDone = document.getElementById("dFollow").checked;
  persist();
  document.getElementById("detailBox").style.display = "none";
}

/* ---------- cover letter ---------- */
function useForLetter(id) {
  const a = S.apps.find(x => x.id === id); if (!a) return;
  document.getElementById("lCompany").value = a.company;
  document.getElementById("lRole").value = a.role;
  document.getElementById("lJobDesc").value = a.jobDesc || "";
  document.getElementById("detailBox").style.display = "none";
  switchTab("letter");
  document.getElementById("panel-letter").scrollIntoView();
}
function genLetter(e) {
  e.preventDefault();
  S.profile.name = document.getElementById("pName").value.trim();
  S.profile.background = document.getElementById("pBg").value.trim();
  save(S);
  const r = generateCoverLetter({
    name: S.profile.name,
    role: document.getElementById("lRole").value.trim(),
    company: document.getElementById("lCompany").value.trim(),
    tone: document.getElementById("lTone").value,
    background: S.profile.background,
    jobDesc: document.getElementById("lJobDesc").value,
    skillBank: SKILL_KEYWORDS, valueProps: VALUE_PROPS, tones: TONES
  });
  const out = document.getElementById("letterOut");
  document.getElementById("letterEmpty").style.display = "none";
  out.style.display = "block";
  out.innerHTML = `
    <div class="letter-head">
      <div class="gauge" style="--g:${r.score}" role="img" aria-label="Keyword match ${r.score} percent"><span>${r.score}%</span></div>
      <div>
        <h3>Your cover letter</h3>
        <p class="muted small">${r.keywords.length ? `Keyword match — detected: ${r.keywords.map(esc).join(", ")}` : "No known skill keywords found in the posting — the letter uses your background only."}</p>
      </div>
      <div class="stat"><div class="stat-num">${r.keywords.length}</div><div class="stat-lab">Skills detected</div></div>
    </div>
    <pre class="letter">${esc(r.letter)}</pre>
    <button class="btn small" onclick="copyLetter()">Copy letter</button>`;
}
function copyLetter() {
  const t = document.querySelector("#letterOut .letter").innerText;
  navigator.clipboard.writeText(t).then(() => alert("Cover letter copied!"));
}

/* ---------- post-interview thank-you note ---------- */
function genThanks(e) {
  e.preventDefault();
  S.profile.name = document.getElementById("pName").value.trim();
  save(S);
  const r = generateThankYou({
    name: S.profile.name,
    interviewer: document.getElementById("tInterviewer").value.trim(),
    company: document.getElementById("tCompany").value.trim(),
    role: document.getElementById("tRole").value.trim(),
    tone: document.getElementById("tTone").value,
    thankyou: THANKYOU
  });
  const out = document.getElementById("thanksOut");
  out.style.display = "block";
  out.innerHTML = `
    <pre class="letter">${esc(r.note)}</pre>
    <button class="btn small" onclick="copyThanks()">Copy thank-you note</button>`;
  out.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function copyThanks() {
  const t = document.querySelector("#thanksOut .letter").innerText;
  navigator.clipboard.writeText(t).then(() => alert("Thank-you note copied!"));
}

/* ---------- stats + nudges ---------- */
function moneyK(n) {
  return n >= 1000 ? "$" + Math.round(n / 1000) + "k" : "$" + n;
}
function renderStats() {
  const f = funnelStats(S.apps);
  const nudges = followUpNudges(S.apps, FOLLOWUP_AFTER_DAYS, todayISO());
  const perStage = stageStats(S.apps);
  const deadlines = upcomingDeadlines(S.apps, 30, todayISO());
  const interviews = upcomingInterviews(S.apps, 14);
  const weeklyTarget = Math.max(0, parseInt(S.profile.weeklyTarget, 10) || 0);
  const wk = weekStats(S.apps, weeklyTarget, todayISO());
  const labelToStage = {};
  Object.entries(STAGE_LABELS).forEach(([slug, label]) => { labelToStage[label] = slug; });
  const durations = stageDurations(S.apps, todayISO(), labelToStage);
  const offers = offerStats(S.apps);
  const maxStage = Math.max(1, ...STAGES.map(s => perStage[s] || 0));
  const funnel = STAGES.map(s => {
    const n = perStage[s] || 0;
    const w = Math.max(n > 0 ? 6 : 0, Math.round((n / maxStage) * 100));
    return `<div class="funnel-row"><span class="funnel-lab">${STAGE_LABELS[s]}</span><div class="funnel-track"><i class="funnel-fill st-${s}" style="width:${w}%"></i></div><b class="funnel-num">${n}</b></div>`;
  }).join("");
  const deadlineRows = deadlines.length
    ? `<div class="funnel card"><h3>Upcoming deadlines</h3><ul class="deadlines">${
        deadlines.map(d => `<li class="${d.overdue ? "overdue" : ""}"><b>${esc(d.app.company)}</b> — ${esc(d.app.role)}: <span>${d.overdue ? "overdue by " + Math.abs(d.daysLeft) + "d" : "in " + d.daysLeft + "d"}</span> <em>${esc(d.app.deadline)}</em></li>`).join("")
      }</ul></div>`
    : `<div class="funnel card"><h3>Upcoming deadlines</h3><p class="muted small">No deadlines set. Add one on any application — interview dates, decision windows, offer expirations.</p></div>`;
  document.getElementById("statsBox").innerHTML = `
    ${nudges.length ? `<div class="nudge"><b>${nudges.length} follow-up${nudges.length > 1 ? "s" : ""} due:</b><ul>${nudges.slice(0, 5).map(n => `<li>${esc(n.nudge)}</li>`).join("")}</ul></div>` : `<div class="nudge good"><b>Follow-up radar clear.</b> No follow-ups overdue. Nice.</div>`}
    ${deadlineRows}
    ${interviews.length
      ? `<div class="funnel card"><h3>Upcoming interviews</h3><ul class="deadlines">${
          interviews.map(x => `<li class="${x.overdue ? "overdue" : ""}"><b>${esc(x.app.company)}</b> — ${esc(x.app.role)}: <span>${x.overdue ? "overdue" : fmtCountdown(x.hoursLeft)}</span> <em>${esc(String(x.app.interviewAt).replace("T", " "))}</em></li>`).join("")
        }</ul></div>`
      : `<div class="funnel card"><h3>Upcoming interviews</h3><p class="muted small">No interviews scheduled. Set one on any application — open Details and pick a date &amp; time.</p></div>`}
    <div class="statcards">
      <div class="stat"><div class="stat-num">${f.total}</div><div class="stat-lab">Applications</div></div>
      <div class="stat"><div class="stat-num">${f.responseRate}%</div><div class="stat-lab">Response rate</div></div>
      <div class="stat"><div class="stat-num">${f.offers}</div><div class="stat-lab">Offers</div></div>
      <div class="stat"><div class="stat-num">${f.rejected}</div><div class="stat-lab">Rejections</div></div>
      ${offers.count ? `<div class="stat"><div class="stat-num">${moneyK(offers.avgMid)}</div><div class="stat-lab">Avg offer (${offers.count})</div></div>` : ""}
    </div>
    <div class="funnel card"><h3>Weekly cadence</h3>
      <div class="cad-row">
        <div class="funnel-track"><i class="funnel-fill st-applied" style="width:${wk.pct}%"></i></div>
        <b class="funnel-num">${wk.count}${weeklyTarget ? " / " + weeklyTarget : ""}</b>
      </div>
      <p class="muted small">${weeklyTarget
        ? (wk.met ? "Target hit — keep the momentum." : `${weeklyTarget - wk.count} more to hit this week's target.`)
        : "Set a weekly application target to track your cadence."}</p>
      <label class="muted small">Weekly target
        <input type="number" id="weeklyTarget" min="0" max="99" value="${weeklyTarget || ""}" placeholder="e.g. 5" aria-label="Weekly application target">
      </label>
    </div>
    ${Object.keys(durations).length ? `<div class="funnel card"><h3>Avg days per stage</h3>
      <ul class="durations">${STAGES.filter(s => durations[s] != null).map(s =>
        `<li><span>${STAGE_LABELS[s]}</span><b>${durations[s]}d</b></li>`).join("")}</ul>
      <p class="muted small">From your activity timeline — stage moves are logged automatically.</p>
    </div>` : ""}
    <div class="funnel card"><h3>Pipeline funnel</h3>${funnel}</div>
    <p class="tip">Response rate = interviewing + offers ÷ everything you've actually applied to. Aim for 10–20%.</p>`;
  const wt = document.getElementById("weeklyTarget");
  if (wt) wt.addEventListener("change", () => {
    S.profile.weeklyTarget = Math.max(0, parseInt(wt.value, 10) || 0);
    save(S); renderStats();
  });
}

function render() {
  renderBoard();
  renderStats();
}

document.addEventListener("DOMContentLoaded", () => {
  const st = document.getElementById("fStage");
  st.innerHTML = STAGES.map(s => `<option value="${s}">${STAGE_LABELS[s]}</option>`).join("");
  const lt = document.getElementById("lTone");
  lt.innerHTML = Object.entries(TONES).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join("");
  const tt = document.getElementById("tTone");
  if (tt) tt.innerHTML = Object.entries(TONES).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join("");
  document.getElementById("fDate").value = todayISO();
  document.getElementById("pName").value = S.profile.name || "";
  document.getElementById("pBg").value = S.profile.background || "";
  document.getElementById("addForm").addEventListener("submit", addApp);
  document.getElementById("letterForm").addEventListener("submit", genLetter);
  document.getElementById("thanksForm").addEventListener("submit", genThanks);
  document.getElementById("boardSearch").addEventListener("input", e => {
    boardQuery = e.target.value;
    renderBoard();
  });
  document.getElementById("exportCsv").addEventListener("click", exportCsv);
  document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.tab)));
  render();
});
