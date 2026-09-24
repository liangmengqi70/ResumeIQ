import 'server-only';
import mysql, { type Pool, type PoolConnection } from 'mysql2/promise';
import { AuthError } from './auth-policy';
const shared = globalThis as unknown as { resumeiqPool?: Pool };
export function db() {
  const database = process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE;
  const user = process.env.MYSQL_USER || process.env.MYSQLUSER;
  if (!database || !user) throw new AuthError('登录服务尚未连接数据库，请完成数据库配置', 503);
  return shared.resumeiqPool ??= mysql.createPool({
    host: process.env.MYSQL_HOST || process.env.MYSQLHOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || process.env.MYSQLPORT || 3306),
    database,
    user,
    password: process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD,
    connectionLimit: 5,
    supportBigNumbers: true,
    bigNumberStrings: true,
    timezone: '+08:00',
    dateStrings: true,
  });
}
export async function transaction<T>(fn: (connection: PoolConnection) => Promise<T>) {
  const connection = await db().getConnection();
  try { await connection.beginTransaction(); const result = await fn(connection); await connection.commit(); return result; }
  catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}
