#!/usr/bin/env node
/**
 * One-shot migration script: MD5 password_hash → bcrypt
 * 
 * This script reads all members with MD5 hashed passwords,
 * generates a temporary bcrypt password, and updates the DB.
 * 
 * After running this script, all users must reset their password
 * OR you can set a known temp password for testing.
 * 
 * Usage: node scripts/migrate-passwords-to-bcrypt.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const TEMP_PASSWORD = process.env.MIGRATION_TEMP_PASSWORD || 'ChangeMe2024!';
const BCRYPT_ROUNDS = 10;

async function migrate() {
  const db = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'club_manager'
  });

  console.log('Connected to database.');

  // Fetch all members with MD5 hashes (32 hex chars, no $2b$ prefix)
  const [members] = await db.query(
    "SELECT id, email, password_hash FROM members WHERE password_hash IS NOT NULL AND password_hash NOT LIKE '$2b$%' AND is_deleted = 0"
  );

  console.log(`Found ${members.length} member(s) with MD5 passwords to migrate.`);

  if (members.length === 0) {
    console.log('Nothing to migrate.');
    await db.end();
    return;
  }

  const tempHash = await bcrypt.hash(TEMP_PASSWORD, BCRYPT_ROUNDS);
  let migrated = 0;

  for (const member of members) {
    await db.query(
      'UPDATE members SET password_hash = ?, password_plain = NULL WHERE id = ?',
      [tempHash, member.id]
    );
    migrated++;
    console.log(`  Migrated: ${member.email}`);
  }

  await db.end();

  console.log(`\n✅ Migration complete — ${migrated} account(s) updated.`);
  console.log(`\n⚠️  All migrated accounts now use the temporary password: "${TEMP_PASSWORD}"`);
  console.log('   Ask users to reset their password after first login.');
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
