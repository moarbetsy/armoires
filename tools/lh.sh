#!/usr/bin/env bash
# Usage: tools/lh.sh <url> <out-basename> [preset]
# Runs Lighthouse (mobile default, or desktop if preset=desktop), prints scores +
# failing/warning audits, saves json+html to /opt/cursor/artifacts/<out-basename>.
set -u
URL="$1"
OUT="$2"
PRESET="${3:-mobile}"
mkdir -p /opt/cursor/artifacts
FLAGS="--headless=new --no-sandbox --disable-gpu"
PRESET_ARG=""
if [ "$PRESET" = "desktop" ]; then PRESET_ARG="--preset=desktop"; fi
CHROME_PATH=/usr/bin/google-chrome npx --yes lighthouse "$URL" \
  --only-categories=performance,accessibility,best-practices,seo \
  $PRESET_ARG \
  --output=json --output=html \
  --output-path="/opt/cursor/artifacts/${OUT}" \
  --chrome-flags="$FLAGS" --quiet >/dev/null 2>/dev/null
node -e '
const fs=require("fs");
const p="/opt/cursor/artifacts/"+process.argv[1]+".report.json";
const j=JSON.parse(fs.readFileSync(p,"utf8"));
const cats=j.categories;
const order=["performance","accessibility","best-practices","seo"];
let line=[];
for(const k of order){line.push(k+"="+Math.round((cats[k].score||0)*100));}
console.log("SCORES "+process.argv[1]+": "+line.join("  "));
// failing/warning audits
const bad=[];
for(const k of order){
  for(const ref of cats[k].auditRefs){
    const a=j.audits[ref.id];
    if(!a) continue;
    if(a.scoreDisplayMode==="binary"||a.scoreDisplayMode==="numeric"){
      if(a.score!==null && a.score<1 && ref.weight>0){
        bad.push("  ["+k+"] "+a.id+" score="+a.score+(a.displayValue?" ("+a.displayValue+")":""));
      }
    }
  }
}
// also warnings
const warns=j.runWarnings||[];
if(bad.length){console.log("FAILING/IMPERFECT AUDITS:");console.log(bad.join("\n"));}
else{console.log("No weighted audits below 1.0");}
if(warns.length){console.log("RUN WARNINGS:");warns.forEach(w=>console.log("  "+w));}
' "$OUT"
