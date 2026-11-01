'use strict';
// Explicit opt-in. Only a separately started disposable MySQL on 127.0.0.1:13371.
// Does not read dotenv, application config, backups or the developer's business DB.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const { statements, inspect, piece, stable } = require('../scripts/delivery-01-05/schema.cjs');
const { plan, run, hash, DIR, LEDGER_SQL, LEDGER, BASELINE } = require('../scripts/delivery-01-05/migrate.cjs');
const fixture = statements(fs.readFileSync(path.join(__dirname,'delivery-01-05-baseline.sql'),'utf8'));
async function main() {
  if (!['--generate-contract','--verify'].includes(process.argv[2]) || process.argv.length !== 3) throw new Error('Explicit --generate-contract or --verify required');
  const control = await mysql.createConnection({host:'127.0.0.1',port:13371,user:'root',password:'',multipleStatements:false});
  const [[identity]] = await control.query('SELECT @@server_uuid AS uuid,@@port AS port,VERSION() AS version');
  assert.equal(Number(identity.port),13371); assert.match(identity.version,/^8\.0\./);
  const suffix = Date.now().toString();
  async function db(label) {
    const name = `delivery_test_${label}_${suffix}`;
    await control.query(`CREATE DATABASE ${name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    const c = await mysql.createConnection({host:'127.0.0.1',port:13371,user:'root',password:'',database:name});
    for (const sql of fixture) await c.query(sql);
    return { c, cfg:{database:name,expectedServerUuid:identity.uuid} };
  }
  const active = [];
  try {
    if (process.argv[2] === '--generate-contract') {
      const {c} = await db('contract'); active.push(c);
      const ops = plan(), contract={planHash:hash(stable(ops)),steps:{},before:{},final:{},ledger:null,baseline:{}};
      contract.directoryHash=hash(fs.readFileSync(path.join(DIR,'006_directory.sql'),'utf8'));
      const original = await inspect(c);
      for (const [table,names] of Object.entries(BASELINE)) contract.baseline[table] = Object.fromEntries(names.split(' ').map(n=>[n, original[table].columns[n][0]]));
      for (const op of ops) {
        const schema = await inspect(c);
        if (/ MODIFY /i.test(op.sql)) contract.before[op.id] = piece(schema,op);
        if (!(op.kind === 'table' && schema[op.table])) await c.query(op.sql);
        contract.steps[op.id] = piece(await inspect(c),op);
      }
      await c.query(LEDGER_SQL);
      contract.final=await inspect(c); contract.ledger=contract.final[LEDGER]; delete contract.final[LEDGER];
      fs.writeFileSync(path.join(DIR,'schema-contract.json'),JSON.stringify(contract,null,2)+'\n');
      console.log(`Contract generated from disposable MySQL ${identity.version}; ${ops.length} structural steps.`);
      return;
    }
    const a=await db('upgrade'); active.push(a.c);
    await a.c.query("INSERT INTO stage2_schema_migrations VALUES('SYNTHETIC_LEGACY',0,REPEAT('0',64),'applied','2026-01-01 00:00:00')");
    await a.c.query('ALTER TABLE user_terms_acceptances DROP FOREIGN KEY user_terms_acceptances_ibfk_1, ADD CONSTRAINT fk_user_terms_acceptances_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE');
    await a.c.query("INSERT INTO users(id,username,password_hash,college,major) VALUES(1,'DELIVERY_SYNTHETIC','NOT_A_PASSWORD_HASH','Unmapped historical college','Historical major')");
    await a.c.query("INSERT INTO organizations(id,type,name) VALUES(1,'Official','DELIVERY_SYNTHETIC')");
    await a.c.query("INSERT INTO campus_posts(id,organization_id,author_user_id,feed_tab,title,content) VALUES(1,1,1,'school','DELIVERY_SYNTHETIC','Historical body')");
    await a.c.query("INSERT INTO campus_post_comments(id,post_id,user_id,content) VALUES(1,1,1,'Historical comment')");
    await a.c.query('INSERT INTO campus_post_likes(post_id,user_id) VALUES(1,1)');
    await a.c.query("INSERT INTO posts(id,user_id,title,content) VALUES(1,1,'DELIVERY_SYNTHETIC','Historical treehole')");
    await a.c.query("INSERT INTO notifications(user_id,type,post_id) VALUES(1,'like',1)");
    await a.c.query("INSERT INTO regions(id,code,name) VALUES(1,'SYNTHETIC','SYNTHETIC')");
    await a.c.query("INSERT INTO shops(id,user_id,region_id,name) VALUES(1,1,1,'SYNTHETIC')");
    await a.c.query("INSERT INTO products(id,shop_id,name) VALUES(1,1,'SYNTHETIC')");
    await a.c.query("INSERT INTO product_comments(product_id,user_id,rating,content) VALUES(1,1,'NPC','SYNTHETIC')");
    await a.c.query('INSERT INTO product_favorites(user_id,product_id) VALUES(1,1)');
    const old=await inspect(a.c);
    async function fingerprint() {
      const result={};
      for(const [t,def] of Object.entries(old)) {
        const cols=Object.keys(def.columns).map(n=>'`'+n+'`').join(',');
        const [rows]=await a.c.query(`SELECT ${cols} FROM \`${t}\``);
        result[t]=hash(stable(rows.map(stable).sort()));
      }
      return result;
    }
    const before=await fingerprint();
    await run(a.c,a.cfg,'pre');
    let interrupted=false;
    await assert.rejects(run(a.c,a.cfg,'apply', async op=>{if(!interrupted && op.kind==='column'){interrupted=true;throw new Error('INJECTED_INTERRUPTION');}}),/INJECTED_INTERRUPTION/);
    const [[pending]]=await a.c.query(`SELECT COUNT(*) AS n FROM ${LEDGER} WHERE state='started'`); assert.equal(pending.n,1);
    await run(a.c,a.cfg,'apply'); assert.deepEqual(await fingerprint(),before);
    await run(a.c,a.cfg,'apply'); assert.deepEqual(await fingerprint(),before);
    await run(a.c,a.cfg,'post');
    const [[legacy]]=await a.c.query('SELECT source_kind,category,audience_scope FROM campus_posts WHERE id=1'); assert.deepEqual({...legacy},{source_kind:'legacy',category:null,audience_scope:null});
    const [[user]]=await a.c.query('SELECT college_id,programme_id FROM users WHERE id=1'); assert.equal(user.college_id,null);assert.equal(user.programme_id,null);
    console.log('PASS upgrade, DDL interruption/retry, repeat, all old-column row fingerprints, no implicit classification/identity backfill');
    await assert.rejects(run(a.c,{...a.cfg,expectedServerUuid:'wrong'},'apply'),/UUID/);
    await a.c.query('ALTER TABLE campus_post_favorites MODIFY created_at DATE NOT NULL');
    await assert.rejects(run(a.c,a.cfg,'apply'),/INCOMPATIBLE_OBJECT/);
    console.log('PASS target identity pin and existing incompatible table rejected');
    const b=await db('retry'); active.push(b.c);
    const original=b.c.query.bind(b.c);let fail=true;
    b.c.query=async function(sql,...args){if(fail && /^ALTER TABLE campus_posts MODIFY/.test(sql)){fail=false;throw Object.assign(new Error('INJECTED_DDL_FAILURE'),{code:'TEST'});}return original(sql,...args);};
    await assert.rejects(run(b.c,b.cfg,'apply'),/INJECTED_DDL_FAILURE/);
    await run(b.c,b.cfg,'apply');await run(b.c,b.cfg,'post');console.log('PASS SQL failure stops and absent-object started step retries');
    const pre = await run(b.c,b.cfg,'pre'),post = await run(b.c,b.cfg,'post');
    const { execFileSync } = require('node:child_process');
    const privateDir = path.resolve(__dirname,'../.local/delivery');
    fs.writeFileSync(path.join(privateDir,'before.json'),JSON.stringify(pre));fs.writeFileSync(path.join(privateDir,'after.json'),JSON.stringify(post));
    execFileSync(process.execPath,[path.join(__dirname,'../scripts/delivery-01-05/compare-checks.cjs'),path.join(privateDir,'before.json'),path.join(privateDir,'after.json')]);
    fs.writeFileSync(path.join(privateDir,'test-config.json'),JSON.stringify({host:'127.0.0.1',port:13371,user:'root',password:'',...b.cfg}));
    for (const mode of ['identity','pre','post']) {
      const output=execFileSync(process.execPath,[path.join(__dirname,'../scripts/delivery-01-05/migrate.cjs'),mode,path.join(privateDir,'test-config.json')],{encoding:'utf8'});
      const parsed=JSON.parse(output);assert.equal(parsed.identity.database_name,b.cfg.database);
    }
    await b.c.query('ALTER TABLE campus_post_favorites DROP INDEX idx_cpf_user_created_post, ADD INDEX idx_cpf_user_created_post(created_at)');
    await assert.rejects(run(b.c,b.cfg,'pre'),/INCOMPATIBLE_OBJECT/);
    await b.c.query('ALTER TABLE campus_post_favorites DROP INDEX idx_cpf_user_created_post, ADD INDEX idx_cpf_user_created_post(user_id,created_at DESC,post_id DESC)');
    console.log('PASS read-only count comparison and incompatible index rejected');
    const d=await db('conflict');active.push(d.c);
    await run(d.c,d.cfg,'apply');
    await d.c.query("UPDATE colleges SET name='SYNTHETIC_CONFLICT' WHERE id='xmum-sem'");
    await assert.rejects(run(d.c,d.cfg,'apply'),/DIRECTORY_CONFLICT/);
    await d.c.query('ALTER TABLE campus_post_favorites DROP FOREIGN KEY fk_cpf_user');
    await d.c.query('ALTER TABLE campus_post_favorites ADD CONSTRAINT fk_cpf_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT');
    await assert.rejects(run(d.c,d.cfg,'pre'),/INCOMPATIBLE_OBJECT/);
    await d.c.query('ALTER TABLE campus_post_favorites DROP FOREIGN KEY fk_cpf_user');
    await d.c.query('ALTER TABLE campus_post_favorites ADD CONSTRAINT fk_cpf_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE');
    await d.c.query('ALTER TABLE users DROP CHECK ck_users_programme_requires_college');
    await d.c.query('ALTER TABLE users ADD CONSTRAINT ck_users_programme_requires_college CHECK(programme_id IS NULL)');
    await assert.rejects(run(d.c,d.cfg,'pre'),/INCOMPATIBLE_OBJECT/);
    await d.c.query('ALTER TABLE users DROP CHECK ck_users_programme_requires_college');
    await d.c.query('ALTER TABLE users ADD CONSTRAINT ck_users_programme_requires_college CHECK(programme_id IS NULL OR college_id IS NOT NULL)');
    await d.c.query("ALTER TABLE campus_post_comments MODIFY reply_to_name VARCHAR(20) NULL");
    await assert.rejects(run(d.c,d.cfg,'pre'),/INCOMPATIBLE_OBJECT/);
    console.log('PASS directory conflict and incompatible FK, CHECK, existing column rejected; semantic historical FK name accepted');
    console.log(`VERIFIED disposable MySQL ${identity.version}; reconstructed baseline only; no production compatibility claim.`);
  } finally { for(const c of active) await c.end(); await control.end(); }
}
main().catch(e=>{ console.error('FAIL:', e.code || e.message);process.exitCode=1; });
