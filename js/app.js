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
  box.innerHTML = STAGES.map(st => {
    const list = (S.apps || []).filter(a => a.stage === st);
    return `<div class="col" data-stage="${st}">
      <h3><span class="stage-ic">${STAGE_ICONS[st] || ""}</span>${STAGE_LABELS[st]} <span class="count">${list.length}</span></h3>
      ${list.map(a => {
        const initial = esc((a.company || "?").trim().charAt(0).toUpperCase());
        return `
        <div class="acard">
          <div class="strip-main">
            <span class="avatar" aria-hidden="true">${initial}</span>
            <div class="strip-id">
              <b>${esc(a.company)}</b>
              <div class="muted small">${esc(a.role)}</div>
            </div>
          </div>
          <div class="strip-meta muted small">Applied ${esc(a.dateApplied || "—")}${a.salary ? ` · ${esc(a.salary)}` : ""}</div>
          <div class="rowbtns">
            ${STAGES.filter(s => s !== a.stage).map(s =>
              `<button class="btn tiny" onclick="moveApp('${a.id}','${s}')" title="Move to ${STAGE_LABELS[s]}">→ ${STAGE_LABELS[s]}</button>`).join("")}
          </div>
          <button class="btn tiny ghost" onclick="editApp('${a.id}')">Details</button>
        </div>`; }).join("") || `<p class="muted small col-empty">No applications here yet.</p>`}
    </div>`;
  }).join("");
}
function moveApp(id, stage) {
  const a = S.apps.find(x => x.id === id); if (!a) return;
  a.stage = stage; persist();
}
function delApp() {
  const id = document.getElementById("dId").value;
  S.apps = S.apps.filter(x => x.id !== id);
  document.getElementById("detailBox").style.display = "none";
  persist();
}

/* ---------- add / edit ---------- */
function addApp(e) {
  e.preventDefault();
  const company = document.getElementById("fCompany").value.trim();
  const role = document.getElementById("fRole").value.trim();
  if (!company || !role) return;
  S.apps.push({
    id: uid(), company, role,
    stage: document.getElementById("fStage").value,
    dateApplied: document.getElementById("fDate").value || todayISO(),
    contact: document.getElementById("fContact").value.trim(),
    link: document.getElementById("fLink").value.trim(),
    salary: document.getElementById("fSalary").value.trim(),
    notes: document.getElementById("fNotes").value.trim(),
    jobDesc: "", followUpDone: false
  });
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
      <label>Job description (paste — powers the cover letter + keyword match)
        <textarea id="dJobDesc" placeholder="Paste the job posting here…">${esc(a.jobDesc || "")}</textarea></label>
      <label>Notes <textarea id="dNotes" placeholder="Interview dates, impressions…">${esc(a.notes || "")}</textarea></label>
      <label class="check"><input type="checkbox" id="dFollow" ${a.followUpDone ? "checked" : ""}> Follow-up sent</label>
      <div class="rowbtns">
        <button class="btn small" onclick="saveDetail()">Save</button>
        <button class="btn small" onclick="useForLetter('${a.id}')">Write cover letter</button>
        <button class="btn danger small" onclick="delApp()">Delete</button>
      </div>
    </div>`;
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function saveDetail() {
  const id = document.getElementById("dId").value;
  const a = S.apps.find(x => x.id === id); if (!a) return;
  a.contact = document.getElementById("dContact").value.trim();
  a.link = document.getElementById("dLink").value.trim();
  a.salary = document.getElementById("dSalary").value.trim();
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

/* ---------- stats + nudges ---------- */
function renderStats() {
  const f = funnelStats(S.apps);
  const nudges = followUpNudges(S.apps, FOLLOWUP_AFTER_DAYS, todayISO());
  const perStage = stageStats(S.apps);
  const maxStage = Math.max(1, ...STAGES.map(s => perStage[s] || 0));
  const funnel = STAGES.map(s => {
    const n = perStage[s] || 0;
    const w = Math.max(n > 0 ? 6 : 0, Math.round((n / maxStage) * 100));
    return `<div class="funnel-row"><span class="funnel-lab">${STAGE_LABELS[s]}</span><div class="funnel-track"><i class="funnel-fill st-${s}" style="width:${w}%"></i></div><b class="funnel-num">${n}</b></div>`;
  }).join("");
  document.getElementById("statsBox").innerHTML = `
    ${nudges.length ? `<div class="nudge"><b>${nudges.length} follow-up${nudges.length > 1 ? "s" : ""} due:</b><ul>${nudges.slice(0, 5).map(n => `<li>${esc(n.nudge)}</li>`).join("")}</ul></div>` : `<div class="nudge good"><b>Follow-up radar clear.</b> No follow-ups overdue. Nice.</div>`}
    <div class="statcards">
      <div class="stat"><div class="stat-num">${f.total}</div><div class="stat-lab">Applications</div></div>
      <div class="stat"><div class="stat-num">${f.responseRate}%</div><div class="stat-lab">Response rate</div></div>
      <div class="stat"><div class="stat-num">${f.offers}</div><div class="stat-lab">Offers</div></div>
      <div class="stat"><div class="stat-num">${f.rejected}</div><div class="stat-lab">Rejections</div></div>
    </div>
    <div class="funnel card"><h3>Pipeline funnel</h3>${funnel}</div>
    <p class="tip">Response rate = interviewing + offers ÷ everything you've actually applied to. Aim for 10–20%.</p>`;
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
  document.getElementById("fDate").value = todayISO();
  document.getElementById("pName").value = S.profile.name || "";
  document.getElementById("pBg").value = S.profile.background || "";
  document.getElementById("addForm").addEventListener("submit", addApp);
  document.getElementById("letterForm").addEventListener("submit", genLetter);
  document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.tab)));
  render();
});
