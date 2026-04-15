const fs = require("fs");
const c = fs.readFileSync("client/src/pages/Settings.tsx", "utf8");

// Extract all case "xxx": from renderContent
const caseRe = /case "([^"]+)":/g;
let m;
const cases = [];
while ((m = caseRe.exec(c)) !== null) cases.push(m[1]);
console.log("Total cases:", cases.length);
console.log(cases.join("\n"));

// Extract all sectionIds from NAV_GROUPS
const sidRe = /sectionId:\s*"([^"]+)"/g;
const sids = [];
while ((m = sidRe.exec(c)) !== null) sids.push(m[1]);
console.log("\nTotal sectionIds in NAV_GROUPS:", sids.length);

// Find missing
const caseSet = new Set(cases);
const missing = sids.filter(s => !caseSet.has(s));
console.log("\nMissing cases (in NAV_GROUPS but no renderContent):", missing.length);
missing.forEach(s => console.log(" -", s));
