'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { inspectSchema, requiredMigrations, requiredTables, laboratoryColumns } =
  require('./BioNexus-SchemaReadiness.cjs');

function fakeClient({ missing = [], identity = {}, failQuery = '' } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      if (failQuery && sql.includes(failQuery)) throw new Error('query failed');
      if (sql.includes('current_database()')) {
        return { rows: [{ database: 'bionexus_dev', role: 'bionexus_dev_app', read_only: 'on', ...identity }] };
      }
      if (params) return { rows: params[0].filter(name => !missing.includes(name)).map(name => ({ name })) };
      return { rows: [] };
    },
  };
}

test('complete contract is checked in one read-only transaction', async () => {
  const client = fakeClient();
  assert.deepEqual(await inspectSchema(client, 'bionexus_dev', 'bionexus_dev_app'), { ready: true, issues: [] });
  assert.match(client.calls[0].sql, /^BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY$/);
  assert.equal(client.calls.at(-1).sql, 'ROLLBACK');
  assert.deepEqual(client.calls.filter(call => call.params).map(call => call.params[0]),
    [requiredTables, laboratoryColumns, requiredMigrations]);
  assert.ok(client.calls.slice(1, -1).every(call => /^\s*SELECT\b/i.test(call.sql)));
});

for (const name of [...requiredMigrations, ...requiredTables, ...laboratoryColumns]) {
  test(`missing ${name} blocks readiness`, async () => {
    const result = await inspectSchema(fakeClient({ missing: [name] }), 'bionexus_dev', 'bionexus_dev_app');
    assert.equal(result.ready, false);
    assert.ok(result.issues.some(issue => issue.endsWith(name)));
  });
}

for (const identity of [{ database: 'other' }, { role: 'other' }, { read_only: 'off' }]) {
  test(`unexpected identity ${JSON.stringify(identity)} fails closed`, async () => {
    const client = fakeClient({ identity });
    await assert.rejects(inspectSchema(client, 'bionexus_dev', 'bionexus_dev_app'), /DATABASE_IDENTITY_OR_READ_ONLY_MISMATCH/);
    assert.equal(client.calls.at(-1).sql, 'ROLLBACK');
    assert.equal(client.calls.length, 3);
  });
}

test('query errors fail closed and roll back', async () => {
  const client = fakeClient({ failQuery: 'public.migrations' });
  await assert.rejects(inspectSchema(client, 'bionexus_dev', 'bionexus_dev_app'), /query failed/);
  assert.equal(client.calls.at(-1).sql, 'ROLLBACK');
});

test('operational entry points gate success and service startup', () => {
  const migrations = fs.readFileSync(path.join(__dirname, 'Invoke-BioNexus-Migrations.ps1'), 'utf8');
  const startup = fs.readFileSync(path.join(__dirname, 'Start-BioNexus-Development.ps1'), 'utf8');
  assert.match(migrations, /migration:show[\s\S]+Get-BioNexusSchemaReadiness/);
  assert.equal((migrations.match(/Assert-BioNexusSchemaReady -State/g) || []).length, 5);
  assert.ok(startup.indexOf('Assert-BioNexusSchemaReady -State') < startup.indexOf('Start-BioNexusConsole'));
  assert.match(startup, /Get-BioNexusSchemaReadiness -Database 'bionexus_dev' -Role 'bionexus_dev_app'/);
  for (const name of requiredMigrations) {
    assert.ok(migrations.includes(`'${name}'`), `${name} must also be required by migration:show`);
    const timestamp = name.slice(-13);
    const migrationFile = path.join(__dirname, '..', '..', 'src', 'database', 'migrations',
      `${timestamp}-${name.slice(0, -13)}.ts`);
    assert.match(fs.readFileSync(migrationFile, 'utf8'), new RegExp(`readonly name = '${name}'`));
  }
});
