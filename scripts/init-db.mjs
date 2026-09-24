import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';

const database = process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE;
const user = process.env.MYSQL_USER || process.env.MYSQLUSER;
if (!database || !user) throw new Error('Missing MySQL database or user environment variables.');

const sql = (await readFile(new URL('../schema.sql', import.meta.url), 'utf8'))
  .replace(/^\uFEFF/, '')
  .replace(/^USE\s+[^;]+;\s*$/gim, '');

const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST || process.env.MYSQLHOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || process.env.MYSQLPORT || 3306),
  database,
  user,
  password: process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD,
  multipleStatements: true,
});

try {
  await connection.query(sql);
  console.log(`ResumeIQ schema is ready in database ${database}.`);
} finally {
  await connection.end();
}
