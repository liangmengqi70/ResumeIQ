import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';

const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST || '127.0.0.1', port: Number(process.env.MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
  multipleStatements: true,
});
try {
  const [columns] = await connection.query("SHOW COLUMNS FROM ai_usage_records LIKE 'latency_ms'");
  if (columns.length) console.log('migration already applied');
  else {
    await connection.query(await readFile(new URL('../migrations/003_ai_usage_metrics.sql', import.meta.url), 'utf8'));
    console.log('migration applied');
  }
} finally { await connection.end(); }
