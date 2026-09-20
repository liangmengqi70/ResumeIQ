import { mutation, jsonBody } from '@/lib/api';
import { normalizePhone } from '@/lib/auth-policy';
import { invalidateCode, issueCode } from '@/lib/auth';
import { createSmsDelivery } from '@/lib/sms';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  return mutation(request, async () => {
    const body = await jsonBody(request);
    const phone = normalizePhone(body.phone);
    const delivery = createSmsDelivery(request);
    await issueCode(phone, delivery.code);
    try { await delivery.send(phone); }
    catch (error) { await invalidateCode(phone); throw error; }
    return { message: delivery.message, retryAfter: 60 };
  });
}
