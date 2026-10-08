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
  const a=fs.readFileSync('js/app.js','utf8');
  if(!a.includes('id=\"dDeadline\"')) throw new Error('missing dDeadline');
  if(!a.includes('upcomingDeadlines(S.apps')) throw new Error('deadlines not rendered');
  if(!a.includes('searchApps(S.apps, boardQuery)')) throw new Error('search not wired');"

echo "--- smoke: $pass passed, $fail failed ---"
exit $((fail>0))
