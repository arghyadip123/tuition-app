import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDirectory = path.resolve(__dirname, '../../migrations');

async function runMigrations() {
  const files = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const fullPath = path.join(migrationsDirectory, file);
    const sql = await readFile(fullPath, 'utf8');
    console.log(`Running migration ${file}`);
    await pool.query(sql);
  }

  console.log('All migrations completed.');
  await pool.end();
}

runMigrations().catch(async (error) => {
  console.error('Migration failed:', error);
  await pool.end();
  process.exit(1);
});

