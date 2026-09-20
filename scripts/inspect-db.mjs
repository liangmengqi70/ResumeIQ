import mysql from 'mysql2/promise';
const connection = await mysql.createConnection({ host: process.env.MYSQL_HOST || '127.0.0.1', port: Number(process.env.MYSQL_PORT || 3306), database: process.env.MYSQL_DATABASE, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD });
try {
  for (const table of ['users','guest_sessions','resume_files','job_descriptions','background_surveys','diagnosis_tasks','ai_usage_records','diagnosis_reports','free_usage_records']) {
    const [rows] = await connection.query(`SHOW CREATE TABLE \`${table}\``); console.log(rows[0]['Create Table']);
  }
} finally { await connection.end(); }
