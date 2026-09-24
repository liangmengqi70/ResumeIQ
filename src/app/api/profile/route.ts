import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { currentUser } from '@/lib/auth';
import { mutation, jsonBody } from '@/lib/api';
import { AuthError } from '@/lib/auth-policy';
import { db } from '@/lib/db';
import { dataDirectory } from '@/lib/data-directory';

export async function PATCH(request: Request) {
  return mutation(request, async () => {
    const user = await currentUser();
    if (!user) throw new AuthError('请先登录', 401);
    const data = await jsonBody(request, 600000);
    const nickname = typeof data.nickname === 'string' ? data.nickname.trim() : '';
    if ([...nickname].length < 2 || [...nickname].length > 20) throw new AuthError('昵称需要 2～20 个字符');
    let avatarUrl = user.avatarUrl;
    if (data.avatar === null) avatarUrl = null;
    else if (data.avatar !== undefined) {
      if (typeof data.avatar !== 'string' || !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(data.avatar)) throw new AuthError('请选择 JPG 或 PNG 图片');
      let bytes: Buffer;
      try { bytes = await sharp(Buffer.from(data.avatar.split(',')[1], 'base64'), { limitInputPixels: 16000000 }).resize(256, 256, { fit: 'cover' }).png().toBuffer(); }
      catch { throw new AuthError('图片无法读取，请重新选择'); }
      const name = randomUUID() + '.png';
      const directory = dataDirectory('avatars');
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, name), bytes);
      avatarUrl = '/api/profile/avatar?file=' + name;
    }
    await db().execute('UPDATE users SET nickname = ?, avatar_url = ? WHERE id = ? AND deleted_at IS NULL', [nickname, avatarUrl, user.id]);
    return { user: { ...user, nickname, avatarUrl } };
  });
}
