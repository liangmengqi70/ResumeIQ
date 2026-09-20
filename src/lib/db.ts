import 'server-only';
import mysql, { type Pool, type PoolConnection } from 'mysql2/promise';
import { AuthError } from './auth-policy';
const shared = globalThis as unknown as { resumeiqPool?: Pool };
export function db() {
  if (!process.env.MYSQL_DATABASE || !process.env.MYSQL_USER) throw new AuthError('登录服务尚未连接数据库，请完成本地数据库配置', 503);
  return shared.resumeiqPool ??= mysql.createPool({ host: process.env.MYSQL_HOST || '127.0.0.1', port: Number(process.env.MYSQL_PORT || 3306), database: process.env.MYSQL_DATABASE, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, connectionLimit: 5, supportBigNumbers: true, bigNumberStrings: true, timezone: '+08:00', dateStrings: true });
}
export async function transaction<T>(fn: (connection: PoolConnection) => Promise<T>) {
  const connection = await db().getConnection();
  try { await connection.beginTransaction(); const result = await fn(connection); await connection.commit(); return result; }
  catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}
