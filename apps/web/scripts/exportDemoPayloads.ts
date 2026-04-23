/**
 * Выгрузка демо-событий в UTF-8 JSON (вызывается из корня репозитория:
 * `python scripts/reseed_demo_events.py`).
 * Не использовать PowerShell `>` для stdout — сломает кодировку.
 */
import { writeFileSync } from "node:fs";
import { demoEventPayloads } from "../src/data/demoEventPayloads.ts";

const out = process.argv[2];
if (!out) {
  console.error("usage: npx tsx scripts/exportDemoPayloads.ts <out.json>");
  process.exit(1);
}
writeFileSync(out, JSON.stringify(demoEventPayloads), { encoding: "utf8" });
