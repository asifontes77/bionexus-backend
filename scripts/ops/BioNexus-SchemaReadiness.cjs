'use strict';

const requiredMigrations = [
  'BioNexusBaseline1790366400000',
  'AddPlatformLaboratoryLifecycle1793847600000',
  'AddPlatformSubscriptionCatalogAndBilling1793862000000',
];
const requiredTables = [
  'laboratory',
  'platform_laboratory_audit_logs',
  'platform_subscription_plans',
  'platform_subscriptions',
  'platform_subscription_payments',
  'platform_billing_audit_logs',
];
const laboratoryColumns = [
  'access_slug', 'service_mode', 'plan_code', 'subscription_status',
  'service_starts_at', 'service_expires_at', 'grace_until',
  'perpetual_free_reason', 'perpetual_free_granted_at', 'perpetual_free_granted_by',
  'suspension_reason', 'suspended_at', 'commercial_notes', 'is_active',
  'plan_id', 'plan_name', 'plan_description', 'plan_price', 'plan_currency',
  'billing_interval', 'plan_limits_benefits', 'plan_grace_period_days',
];

async function inspectSchema(client, expectedDatabase, expectedRole) {
  await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    const identity = await client.query(`
      SELECT current_database() AS database, current_user AS role,
             current_setting('transaction_read_only') AS read_only
    `);
    const current = identity.rows[0];
    if (!current || current.database !== expectedDatabase ||
        (expectedRole && current.role !== expectedRole) || current.read_only !== 'on') {
      throw new Error('DATABASE_IDENTITY_OR_READ_ONLY_MISMATCH');
    }

    const tables = await client.query(`
      SELECT c.relname AS name FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relname = ANY($1::text[])
    `, [requiredTables]);
    const columns = await client.query(`
      SELECT a.attname AS name FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'laboratory'
        AND c.relkind IN ('r', 'p') AND a.attnum > 0 AND NOT a.attisdropped
        AND a.attname = ANY($1::text[])
    `, [laboratoryColumns]);
    const migrations = await client.query(
      'SELECT name FROM public.migrations WHERE name = ANY($1::text[])',
      [requiredMigrations],
    );
    const missing = (expected, rows, prefix) => {
      const found = new Set(rows.map(row => row.name));
      return expected.filter(name => !found.has(name)).map(name => `${prefix}${name}`);
    };
    const issues = [
      ...missing(requiredMigrations, migrations.rows, 'migration:'),
      ...missing(requiredTables, tables.rows, 'public.'),
      ...missing(laboratoryColumns, columns.rows, 'public.laboratory.'),
    ];
    return { ready: issues.length === 0, issues };
  } finally {
    await client.query('ROLLBACK');
  }
}

async function main() {
  const expectedDatabase = process.argv[2];
  const expectedRole = process.argv[3] || '';
  if (!expectedDatabase || process.env.DB_DATABASE !== expectedDatabase) {
    throw new Error('DATABASE_CONFIGURATION_MISMATCH');
  }
  const { Client } = require('pg');
  const client = new Client({
    host: process.env.DB_HOST.trim(), port: Number(process.env.DB_PORT), user: process.env.DB_USER.trim(),
    password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE,
    connectionTimeoutMillis: 10000, statement_timeout: 15000,
  });
  await client.connect();
  try {
    process.stdout.write(JSON.stringify(await inspectSchema(client, expectedDatabase, expectedRole)));
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch(error => {
    const known = ['DATABASE_CONFIGURATION_MISMATCH', 'DATABASE_IDENTITY_OR_READ_ONLY_MISMATCH'];
    const reason = known.includes(error.message) ? error.message :
      (/^[0-9A-Z]{5}$/.test(error.code || '') ? error.code : 'ERROR');
    process.stderr.write(`Schema preflight failed: ${reason}\n`);
    process.exitCode = 1;
  });
}

module.exports = { inspectSchema, requiredMigrations, requiredTables, laboratoryColumns };
