#!/usr/bin/env bash
# ApplyPilot AI e2e tests — 7 flows exercising real logic in Node. Exit non-zero on failure.
set -u
cd "$(dirname "$0")/.."
pass=0; fail=0
flow() { # $1 = description, $2 = node script
  if node -e "$2" >/dev/null 2>&1; then echo "PASS: $1"; pass=$((pass+1));
  else echo "FAIL: $1"; fail=$((fail+1)); fi
}

flow "follow-up nudge fires after 7 quiet days" "
  const L=require('./js/logic.js');
  const n=L.followUpNudges([{id:'1',company:'Acme',stage:'applied',dateApplied:'2026-09-18'}],7,'2026-09-28');
  if(n.length!==1) throw new Error('expected 1 nudge, got '+n.length);
  if(!/10 days/.test(n[0].nudge)) throw new Error(n[0].nudge);
"

flow "no nudge when follow-up already done or too recent" "
  const L=require('./js/logic.js');
  const apps=[
    {id:'1',company:'A',stage:'applied',dateApplied:'2026-09-18',followUpDone:true},
    {id:'2',company:'B',stage:'applied',dateApplied:'2026-09-26'},
    {id:'3',company:'C',stage:'interviewing',dateApplied:'2026-09-01'}
  ];
  if(L.followUpNudges(apps,7,'2026-09-28').length!==0) throw new Error('unexpected nudge');
"

flow "keyword extraction is case-insensitive and deduped" "
  const L=require('./js/logic.js'); const B=require('./js/letterbank.js');
  const k=L.extractKeywords('We need Python, python, and PYTHON plus leadership.',B.SKILL_KEYWORDS);
  if(k.length!==2||!k.includes('python')||!k.includes('leadership')) throw new Error(k.join(','));
"

flow "match score rewards background overlap" "
  const L=require('./js/logic.js');
  const hi=L.matchScore(['python','sql'],'I write python and sql every day for reporting pipelines.');
  const lo=L.matchScore(['python','sql'],'I am a great team player who loves a challenge.');
  if(hi<=lo) throw new Error('hi='+hi+' lo='+lo);
  if(L.matchScore([],'anything')!==0) throw new Error('empty keywords should be 0');
"

flow "all 3 tones produce distinct openers" "
  const L=require('./js/logic.js'); const B=require('./js/letterbank.js');
  const mk=t=>L.generateCoverLetter({name:'Sam',role:'Analyst',company:'Globex',tone:t,
    background:'3 years of data analysis with excel and sql.',jobDesc:'data analysis role',
    skillBank:B.SKILL_KEYWORDS,valueProps:B.VALUE_PROPS,tones:B.TONES}).letter.split('\n\n')[0];
  const a=mk('professional'),b=mk('warm'),c=mk('bold');
  if(a===b||b===c||a===c) throw new Error('tones not distinct');
"

flow "stage stats count correctly" "
  const L=require('./js/logic.js');
  const s=L.stageStats([{stage:'applied'},{stage:'applied'},{stage:'offer'}]);
  if(s.applied!==2||s.offer!==1) throw new Error(JSON.stringify(s));
"

flow "letter handles empty job description gracefully" "
  const L=require('./js/logic.js'); const B=require('./js/letterbank.js');
  const r=L.generateCoverLetter({name:'Sam',role:'Clerk',company:'Initech',tone:'warm',
    background:'Two years in customer service.',jobDesc:'',
    skillBank:B.SKILL_KEYWORDS,valueProps:B.VALUE_PROPS,tones:B.TONES});
  if(!r.letter.includes('Initech')) throw new Error('missing company');
  if(r.keywords.length!==0) throw new Error('keywords should be empty');
"

flow "deadlines: soonest first, overdue flagged, far ones dropped" "
  const L=require('./js/logic.js');
  const d=L.upcomingDeadlines([
    {id:'1',company:'A',deadline:'2026-09-28'},
    {id:'2',company:'B',deadline:'2026-10-03'},
    {id:'3',company:'C',deadline:'2027-01-01'},
    {id:'4',company:'D',deadline:'not-a-date'}
  ],30,'2026-10-01');
  if(d.length!==2) throw new Error('expected 2, got '+d.length);
  if(d[0].app.id!=='1'||d[0].daysLeft!==-3||!d[0].overdue) throw new Error('first should be overdue A');
  if(d[1].app.id!=='2'||d[1].daysLeft!==2||d[1].overdue) throw new Error('second should be B');
"

flow "CSV export round-trips every application field" "
  const L=require('./js/logic.js');
  const apps=[
    {company:'Acme',role:'Eng',stage:'applied',dateApplied:'2026-10-01',deadline:'2026-10-20',contact:'a@x.io',link:'http://x',salary:'\$100k',followUpDone:true,notes:'line1\nline2'},
    {company:'Globex',role:'Designer',stage:'wishlist',dateApplied:'2026-09-01',deadline:'',contact:'',link:'',salary:'',followUpDone:false,notes:''}
  ];
  const lines=L.appsToCSV(apps).split('\n');
  if(lines.length!==3) throw new Error('lines='+lines.length);
  const r1=lines[1];
  if(!r1.includes('Acme')||!r1.includes('2026-10-20')||!r1.includes('yes')) throw new Error('fields: '+r1);
  if(!r1.includes('line1 line2')) throw new Error('newline not flattened');
  if(!lines[2].endsWith(',no,')) throw new Error('followup no: '+lines[2]);
"

flow "searchApps narrows the board by any text field" "
  const L=require('./js/logic.js');
  const apps=[
    {company:'Acme Corp',role:'Engineer',contact:'',notes:''},
    {company:'Globex',role:'Designer',contact:'Jane Smith',notes:''},
    {company:'Initech',role:'PM',contact:'',notes:'ex-Acme intern'}
  ];
  if(L.searchApps(apps,'acme').length!==2) throw new Error('acme should hit company+notes');
  if(L.searchApps(apps,'jane').length!==1) throw new Error('contact');
  if(L.searchApps(apps,'   ').length!==3) throw new Error('blank = all');
"

echo "--- e2e: $pass passed, $fail failed ---"
exit $((fail>0))
