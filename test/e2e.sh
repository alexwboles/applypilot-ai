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

echo "--- e2e: $pass passed, $fail failed ---"
exit $((fail>0))
