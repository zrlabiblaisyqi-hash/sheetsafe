// Core logic extracted for unit testing BEFORE shipping.
function looksLikeDate(t){
  if (/^\d+[.,]\d+$/.test(t)) return false;            // decimal, not date
  // NOTE: '.' is EXCLUDED as a date separator (it's a decimal point).
  // Dates use '-' or '/' only -> clean separation from decimals like 12.50
  const m1 = /^\d{1,2}[-/]\d{1,2}([-/]\d{2,4})?$/.test(t);
  const m2 = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(t);
  return m1 || m2;
}
function classifyCell(raw, opts){
  const t = raw.trim();
  if (t === "") return { value: raw, protect: false };
  let protect = false;
  if (opts.leadingZero && /^(?:-)?0\d/.test(t)) protect = true;
  if (opts.longNumber  && /^\d{15,}$/.test(t.replace(/[ ,]/g, ""))) protect = true;
  if (opts.dateLike    && looksLikeDate(t)) protect = true;
  if (opts.allNumbers  && /^(?:-)?\d+(?:[.,]\d+)?$/.test(t)) protect = true;
  return { value: raw, protect };
}
function parseGrid(text){
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").map(r => {
    if (r.includes("\t")) return r.split("\t");
    if (r.includes(","))  return r.split(",");
    return [r];
  });
}
function buildTSV(input, opts){
  let n = 0;
  const grid = parseGrid(input);
  const out = grid.map(row => row.map(cell => {
    const { value, protect } = classifyCell(cell, opts);
    if (protect) n++;
    return (protect && opts.excelPrefix) ? "'" + value : value;
  }));
  return { tsv: out.map(r => r.join("\t")).join("\n"), protectedCount: n };
}

const opts = { leadingZero:true, longNumber:true, dateLike:true, allNumbers:false, excelPrefix:true };

const sample = [
  "00123,Budi,3201234567890001,01-03-2024,08123456789",
  "007,Sari,3201234567890002,15/03/2024,08234567890",
  "1234567890123456,Dewi,3201987654321003,2024-03-01,3.5",
  "1-2,Agus,00099,2024-12-31,12.50",
].join("\n");

const { tsv, protectedCount } = buildTSV(sample, opts);
console.log("PROTECTED CELLS:", protectedCount);
console.log("--- TSV OUTPUT ---");
console.log(tsv);
console.log("--- ASSERTIONS ---");
const lines = tsv.split("\n");
const ok = [];
ok.push(["00123 kept leading zero", lines[0].startsWith("'00123")]);
ok.push(["long NIK not in sci notation", lines[0].includes("'3201234567890001")]);
ok.push(["01-03-2024 kept as text", lines[0].includes("'01-03-2024")]);
ok.push(["007 kept leading zero", lines[1].startsWith("'007")]);
ok.push(["3.5 NOT falsely dated", !lines[2].includes("'3.5")]);
ok.push(["1-2 kept as text (date-coercion case)", lines[3].startsWith("'1-2")]);
ok.push(["00099 kept leading zero", lines[3].includes("'00099")]);
ok.push(["12.50 kept decimals (NOT falsely dated)", !lines[3].includes("'12.50")]);
let pass = true;
for (const [name, res] of ok){ console.log((res?"PASS":"FAIL"), "-", name); if(!res) pass=false; }
console.log(pass ? "\nALL TESTS PASS" : "\nSOME TESTS FAILED");
