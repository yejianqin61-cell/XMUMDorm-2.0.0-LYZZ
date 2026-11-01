'use strict';
// Compare sanitized pre/post JSON, produced while application writes are paused.
const fs = require('node:fs');
try {
  if (process.argv.length !== 4) throw new Error('USAGE: compare-checks.cjs BEFORE_JSON AFTER_JSON');
  const [before,after] = process.argv.slice(2).map(p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'')));
  for (const key of ['database_name','server_uuid']) if (before.identity[key] !== after.identity[key]) throw new Error('IDENTITY_MISMATCH');
  if (after.verifiedSteps !== 46) throw new Error('POSTCHECK_MISSING');
  if (JSON.stringify(before.historicalLedgers) !== JSON.stringify(after.historicalLedgers)) throw new Error('HISTORICAL_LEDGER_COUNTS_CHANGED');
  for (const [table,count] of Object.entries(before.counts)) {
    if (['colleges','academic_programmes'].includes(table)) {
      if (!(after.counts[table] >= count && after.counts[table] <= count + (table === 'colleges' ? 10 : 28))) throw new Error(`DIRECTORY_COUNT_MISMATCH:${table}`);
    } else if (after.counts[table] !== count) throw new Error(`BUSINESS_COUNT_CHANGED:${table}`);
  }
  console.log('PASS: database identity, 46 verified steps, existing business row counts preserved. Row counts alone do not prove field contents unchanged.');
} catch(e) {console.error('STOP:',/^[A-Z_]+(?::[A-Za-z_.]+)?$/.test(e.message || '') ? e.message : 'CHECK_FILES_INVALID');process.exitCode=1;}
