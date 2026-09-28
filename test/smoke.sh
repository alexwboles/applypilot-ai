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

echo "--- smoke: $pass passed, $fail failed ---"
exit $((fail>0))
