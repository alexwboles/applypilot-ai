#!/usr/bin/env bash
# ApplyPilot AI smoke tests — 12 checks. Exit non-zero on first failure.
set -u
cd "$(dirname "$0")/.."
pass=0; fail=0
check() { # $1 = description, rest = command
  local desc="$1"; shift
  if "$@" >/dev/null 2>&1; then echo "PASS: $desc"; pass=$((pass+1));
  else echo "FAIL: $desc"; fail=$((fail+1)); fi
}

check "index.html exists" test -f index.html
check "css/style.css exists" test -f css/style.css
check "js/letterbank.js exists" test -f js/letterbank.js
check "js/logic.js exists" test -f js/logic.js
check "js/app.js exists" test -f js/app.js
check "letterbank.js syntax valid" node --check js/letterbank.js
check "logic.js syntax valid" node --check js/logic.js
check "app.js syntax valid" node --check js/app.js
check "3 tones with openers+closers" node -e "
  const b=require('./js/letterbank.js');
  for (const [k,v] of Object.entries(b.TONES)) { if(!v.openers.length||!v.closers.length) throw new Error(k); }"
check "5 pipeline stages" node -e "
  const b=require('./js/letterbank.js');
  if(b.STAGES.length!==5) throw new Error(b.STAGES.length);"
check "letter generates with keywords + score" node -e "
  const L=require('./js/logic.js'); const B=require('./js/letterbank.js');
  const r=L.generateCoverLetter({name:'Alex',role:'Engineer',company:'Acme',tone:'professional',
    background:'I write javascript and python daily.', jobDesc:'Looking for javascript skills.',
    skillBank:B.SKILL_KEYWORDS, valueProps:B.VALUE_PROPS, tones:B.TONES});
  if(!r.letter.includes('Acme')) throw new Error('no company');
  if(!r.keywords.includes('javascript')) throw new Error('no keyword');
  if(r.score<50) throw new Error('score '+r.score);"
check "funnel stats math" node -e "
  const L=require('./js/logic.js');
  const f=L.funnelStats([{stage:'applied'},{stage:'interviewing'},{stage:'offer'},{stage:'rejected'},{stage:'wishlist'}]);
  if(f.responseRate!==50) throw new Error('rr='+f.responseRate);
  if(f.offers!==1) throw new Error('offers');"
check "appsToCSV exports header + rows with quoting" node -e "
  const L=require('./js/logic.js');
  const csv=L.appsToCSV([{company:'Acme, Inc.',role:'Eng',stage:'applied',dateApplied:'2026-10-01',deadline:'2026-10-15',contact:'',link:'',salary:'\$90k',followUpDone:false,notes:'a \"great\" fit'}]);
  const lines=csv.split('\n');
  if(lines.length!==2) throw new Error('lines='+lines.length);
  if(!lines[0].startsWith('company,role,stage')) throw new Error('header');
  if(!lines[1].includes('\"Acme, Inc.\"')) throw new Error('company quoting: '+lines[1]);
  if(!lines[1].includes('2026-10-15')) throw new Error('deadline missing');"
check "upcomingDeadlines sorts soonest-first, flags overdue" node -e "
  const L=require('./js/logic.js');
  const d=L.upcomingDeadlines([
    {company:'Late',deadline:'2026-09-20'},
    {company:'Soon',deadline:'2026-10-02'},
    {company:'Far',deadline:'2027-06-01'},
    {company:'None'}
  ],30,'2026-10-01');
  if(d.length!==2) throw new Error('count='+d.length);
  if(d[0].app.company!=='Late'||!d[0].overdue||d[0].daysLeft!==-11) throw new Error('overdue wrong');
  if(d[1].app.company!=='Soon'||d[1].overdue||d[1].daysLeft!==1) throw new Error('soon wrong');"
check "searchApps filters by company/role/contact" node -e "
  const L=require('./js/logic.js');
  const apps=[{company:'Acme',role:'Engineer',contact:'jane@x.io',notes:''},
              {company:'Globex',role:'Designer',contact:'',notes:'referral'}];
  if(L.searchApps(apps,'acme').length!==1) throw new Error('company');
  if(L.searchApps(apps,'DESIGNER').length!==1) throw new Error('role case');
  if(L.searchApps(apps,'referral').length!==1) throw new Error('notes');
  if(L.searchApps(apps,'').length!==2) throw new Error('empty query');
  if(L.searchApps(apps,'zzz').length!==0) throw new Error('no match');"
check "index.html has search, export, deadline controls" node -e "
  const fs=require('fs'), h=fs.readFileSync('index.html','utf8');
  for (const id of ['boardSearch','exportCsv','fDeadline']) if(!h.includes('id=\"'+id+'\"')) throw new Error('missing '+id);
  for (const id of ['thanksForm','tInterviewer','tCompany','tRole','tTone','thanksOut']) if(!h.includes('id=\"'+id+'\"')) throw new Error('missing '+id);
  const a=fs.readFileSync('js/app.js','utf8');
  if(!a.includes('id=\"dDeadline\"')) throw new Error('missing dDeadline');
  if(!a.includes('id=\"dInterview\"')) throw new Error('missing dInterview');
  if(!a.includes('upcomingDeadlines(S.apps')) throw new Error('deadlines not rendered');
  if(!a.includes('upcomingInterviews(S.apps')) throw new Error('interviews not rendered');
  if(!a.includes('searchApps(S.apps, boardQuery)')) throw new Error('search not wired');
  if(!a.includes('logActivity(a,')) throw new Error('activity not logged');
  if(!a.includes('generateThankYou(')) throw new Error('thank-you not wired');"
check "generateThankYou builds a complete note in all 3 tones" node -e "
  const L=require('./js/logic.js'), B=require('./js/letterbank.js');
  for (const tone of ['professional','warm','bold']) {
    const r=L.generateThankYou({name:'Alex',interviewer:'Sarah Kim',company:'Acme',role:'Engineer',tone,thankyou:B.THANKYOU});
    if(!r.note.includes('Dear Sarah Kim,')) throw new Error(tone+': greeting wrong');
    if(!r.note.includes('Acme')||!r.note.includes('Engineer')) throw new Error(tone+': fields missing');
    if(!r.note.includes('Best regards,\nAlex')) throw new Error(tone+': signature missing');
    if(r.tone!==tone) throw new Error(tone+': tone not reported');
  }
  const odd=L.generateThankYou({company:'Acme',role:'PM',tone:'nope',thankyou:B.THANKYOU});
  if(odd.tone!=='professional') throw new Error('bad tone should fall back to professional');
  if(!odd.note.startsWith('Hello,')) throw new Error('missing interviewer should use Hello');"
check "upcomingInterviews sorts soonest-first and flags overdue" node -e "
  const L=require('./js/logic.js');
  const now=new Date('2026-10-12T12:00:00').getTime();
  const apps=[
    {id:'a',company:'A',interviewAt:'2026-10-13T15:00:00'},
    {id:'b',company:'B',interviewAt:'2026-10-12T09:00:00'},
    {id:'c',company:'C',interviewAt:'2026-11-20T10:00:00'},
    {id:'d',company:'D'}
  ];
  const iv=L.upcomingInterviews(apps,14,now);
  if(iv.length!==2) throw new Error('expected 2 in-window, got '+iv.length);
  if(iv[0].app.id!=='b'||!iv[0].overdue) throw new Error('overdue should sort first and flag');
  if(iv[1].app.id!=='a'||iv[1].overdue) throw new Error('future interview wrong');
  if(Math.abs(iv[1].hoursLeft-27)>0.01) throw new Error('hoursLeft wrong: '+iv[1].hoursLeft);"
check "fmtCountdown renders human countdowns" node -e "
  const L=require('./js/logic.js');
  if(L.fmtCountdown(53)!=='in 2d 5h') throw new Error('days: '+L.fmtCountdown(53));
  if(L.fmtCountdown(3)!=='in 3h') throw new Error('hours');
  if(L.fmtCountdown(0.5)!=='in 30m') throw new Error('minutes');
  if(L.fmtCountdown(-2)!=='overdue') throw new Error('overdue');"
check "logActivity appends timestamped entries" node -e "
  const L=require('./js/logic.js');
  const app={company:'Acme'};
  L.logActivity(app,'Moved to interviewing','2026-10-12T10:00:00Z');
  L.logActivity(app,'  ');
  if(app.activity.length!==1) throw new Error('blank note should be ignored');
  if(app.activity[0].text!=='Moved to interviewing'||app.activity[0].ts!=='2026-10-12T10:00:00Z') throw new Error('entry wrong');"
check "parseSalary parses ranges, singles, hourly rates" node -e "
  const L=require('./js/logic.js');
  const r=L.parseSalary('\$90k–\$110k');
  if(!r||r.min!==90000||r.max!==110000||r.mid!==100000) throw new Error('range: '+JSON.stringify(r));
  const s=L.parseSalary('\$120,000');
  if(!s||s.mid!==120000) throw new Error('single: '+JSON.stringify(s));
  const h=L.parseSalary('\$95/hr');
  if(!h||h.mid!==197600||!h.hourly) throw new Error('hourly: '+JSON.stringify(h));
  if(L.parseSalary('competitive')!==null) throw new Error('garbage should be null');
  if(L.parseSalary('')!==null) throw new Error('empty should be null');"
check "offerStats averages offer-stage midpoints" node -e "
  const L=require('./js/logic.js');
  const apps=[
    {stage:'offer',salary:'\$90k–\$110k'},
    {stage:'offer',salary:'\$120k'},
    {stage:'offer',salary:'competitive'},
    {stage:'applied',salary:'\$200k'}];
  const o=L.offerStats(apps);
  if(o.count!==2) throw new Error('count='+o.count);
  if(o.avgMid!==110000) throw new Error('avg='+o.avgMid);
  if(o.min!==100000||o.max!==120000) throw new Error('min/max');"
check "weekStats counts last-7-day applications vs target" node -e "
  const L=require('./js/logic.js');
  const apps=[
    {dateApplied:'2026-10-13'},{dateApplied:'2026-10-10'},{dateApplied:'2026-10-07'},
    {dateApplied:'2026-10-06'},{dateApplied:'2026-09-01'}];
  const w=L.weekStats(apps,5,'2026-10-13');
  if(w.count!==3) throw new Error('count='+w.count);
  if(w.pct!==60) throw new Error('pct='+w.pct);
  if(w.met) throw new Error('should not be met');
  const w2=L.weekStats(apps,3,'2026-10-13');
  if(!w2.met) throw new Error('3/3 should be met');
  const w0=L.weekStats(apps,0,'2026-10-13');
  if(w0.pct!==0||w0.met) throw new Error('zero target');"
check "stageDurations averages days per stage from the timeline" node -e "
  const L=require('./js/logic.js');
  const map={'Wishlist':'wishlist','Applied':'applied','Interviewing':'interviewing'};
  const apps=[{
    activity:[
      {ts:'2026-10-01T09:00:00',text:'Moved to Wishlist'},
      {ts:'2026-10-03T09:00:00',text:'Moved to Applied'},
      {ts:'2026-10-08T09:00:00',text:'Moved to Interviewing'},
      {ts:'2026-10-09T09:00:00',text:'Called Sarah — went well'}
    ]}];
  const d=L.stageDurations(apps,'2026-10-13',map);
  if(d.wishlist!==2) throw new Error('wishlist='+d.wishlist);
  if(d.applied!==5) throw new Error('applied='+d.applied);
  if(d.interviewing!==5) throw new Error('interviewing='+d.interviewing);
  const empty=L.stageDurations([{activity:[]}],'2026-10-13',map);
  if(Object.keys(empty).length!==0) throw new Error('should be empty');"
check "CSV carries salary_mid column" node -e "
  const L=require('./js/logic.js');
  const csv=L.appsToCSV([{company:'Acme',role:'Eng',stage:'offer',dateApplied:'2026-10-01',deadline:'',contact:'',link:'',salary:'\$100k',followUpDone:false,notes:''}]);
  const lines=csv.split('\n');
  if(!lines[0].includes('salary_mid')) throw new Error('header: '+lines[0]);
  if(!lines[1].includes(',100000,')) throw new Error('mid missing: '+lines[1]);"
check "demoBoard seeds 6 realistic multi-stage applications" node -e "
  const L=require('./js/logic.js');
  const apps=L.demoBoard();
  if(apps.length!==6) throw new Error('count='+apps.length);
  const stages=new Set(apps.map(a=>a.stage));
  for (const s of ['wishlist','applied','interviewing','offer','rejected']) if(!stages.has(s)) throw new Error('missing '+s);
  const ids=new Set(apps.map(a=>a.id));
  if(ids.size!==6) throw new Error('ids not unique');
  for (const a of apps) { if(!a.activity||!a.activity.length) throw new Error('no activity for '+a.company); }
  if(typeof L.demoBoard!=='function') throw new Error('not exported');"
check "redesign: rail stats, demo seed, boarding-pass wiring present" node -e "
  const h=require('fs').readFileSync('index.html','utf8');
  for (const id of ['railStats','seedDemo']) if(!h.includes('id=\"'+id+'\"')) throw new Error('missing '+id);
  if(!h.includes('class=\"shell\"')||!h.includes('kicker')) throw new Error('shell/kicker missing');
  const a=require('fs').readFileSync('js/app.js','utf8');
  for (const s of ['renderRail','demoBoard()','ticket-no','col-foot','follow-badge','LABEL_TO_STAGE']) if(!a.includes(s)) throw new Error('missing '+s);
  const css=require('fs').readFileSync('css/style.css','utf8');
  // no rounded corners anywhere; true circles (50%) are fine (status dot)
  if(/border-radius:\s*(?!50%)[1-9]/.test(css.replace(/border-radius:\s*50%/g,''))) throw new Error('rounded edges found');
  for (const s of ['.shell','.rail-stats','.col-foot','.ticket-no','.follow-badge']) if(!css.includes(s)) throw new Error('css missing '+s);"

echo "--- smoke: $pass passed, $fail failed ---"
exit $((fail>0))
