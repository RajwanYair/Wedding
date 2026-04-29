import { readFileSync } from "node:fs";
const s = JSON.parse(readFileSync("coverage/coverage-summary.json", "utf8"));
const entries = Object.entries(s).filter(([k]) => k !== "total");
entries.sort((a, b) => a[1].lines.pct - b[1].lines.pct);
entries.slice(0, 25).forEach(([k, v]) => {
  const short = k.replace(/.*?src[\\/]/, "src/");
  console.log(`${v.lines.pct}%\t${v.lines.covered}/${v.lines.total}\t${short}`);
});
