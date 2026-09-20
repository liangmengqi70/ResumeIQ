import 'server-only';
import { randomInt } from 'node:crypto';
import { sms } from 'tencentcloud-sdk-nodejs';
import { AuthError, requireLocalSms } from './auth-policy';

export type SmsDelivery = {
  code: string;
  message: string;
  send: (phone: string) => Promise<void>;
};

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new AuthError(`短信服务缺少配置：${name}`, 503);
  return value;
}

export function createSmsDelivery(request: Request): SmsDelivery {
  if (process.env.AUTH_SMS_MODE === 'development') {
    const code = requireLocalSms(request);
    return {
      code,
      message: '本地测试模式：请使用开发环境验证码',
      send: async () => {},
    };
  }

  if (process.env.AUTH_SMS_MODE !== 'tencent') {
    throw new AuthError('短信服务尚未启用，请将 AUTH_SMS_MODE 配置为 tencent', 503);
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  return {
    code,
    message: '验证码已发送，5 分钟内有效',
    send: async phone => {
      try {
        const SmsClient = sms.v20210111.Client;
        const client = new SmsClient({
          credential: {
            secretId: required('TENCENTCLOUD_SECRET_ID'),
            secretKey: required('TENCENTCLOUD_SECRET_KEY'),
          },
          region: process.env.TENCENT_SMS_REGION?.trim() || 'ap-guangzhou',
          profile: { httpProfile: { endpoint: 'sms.tencentcloudapi.com' } },
        });
        const response = await client.SendSms({
          PhoneNumberSet: [phone],
          SmsSdkAppId: required('TENCENT_SMS_SDK_APP_ID'),
          SignName: required('TENCENT_SMS_SIGN_NAME'),
          TemplateId: required('TENCENT_SMS_TEMPLATE_ID'),
          TemplateParamSet: [code, process.env.TENCENT_SMS_CODE_MINUTES?.trim() || '5'],
        });
        const result = response.SendStatusSet?.[0];
        if (!result || result.Code !== 'Ok') throw new AuthError(result?.Message || '短信发送失败，请稍后重试', 503);
      } catch (error) {
        if (error instanceof AuthError) throw error;
        throw new AuthError('短信发送失败，请检查腾讯云短信配置后重试', 503);
      }
    },
  };
}
