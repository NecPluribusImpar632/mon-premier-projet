// Regenerates src/lib/property/communesZonage.json from the official government
// commune->zonage-ABC list at data/communes-zonage-abc.csv.
//
// Source: "Liste des communes selon le zonage ABC", Ministère de la Transition
// écologique, https://www.data.gouv.fr/datasets/liste-des-communes-selon-le-zonage-abc
// (Licence Ouverte / Open Licence 2.0). To refresh: download the latest
// "Liste ensemble des communes" CSV from that page, replace
// data/communes-zonage-abc.csv, then run: node scripts/generate-communes-zonage.mjs
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "data", "communes-zonage-abc.csv");
const OUT = join(__dirname, "..", "src", "lib", "property", "communesZonage.json");

const raw = readFileSync(SRC, "utf8");
const lines = raw.split(/\r?\n/).filter(Boolean);
const header = lines[0].split(";");
if (header[0] !== "CODGEO" || header[3] === undefined) {
  throw new Error(`Unexpected CSV header: ${lines[0]}`);
}

const communes = lines.slice(1).map((line) => {
  const [code, department, name, zone] = line.split(";");
  return { code, department, name, zone };
});

writeFileSync(OUT, JSON.stringify(communes));
console.log(`Wrote ${communes.length} communes to ${OUT}`);
