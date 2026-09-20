# ResumeIQ

当前阶段：按提供的截图开发首页、手机号验证码登录及游客入口。品牌仅显示 ResumeIQ 文字。

## 本地运行

要求 Node.js 22+，MySQL 8.0.16+。

1. 在本目录执行 `npm install`。
2. 复制 `.env.example` 为 `.env.local`，填写本地 MySQL 连接信息。不要提交此文件。
3. 执行 `npm run db:inspect`，将真实九表结构与 `schema.sql` 比对。此命令只读取表结构。
4. 结构确认兼容后，在对应数据库执行 `migrations/001_auth.sql`，新增验证码与登录会话表。不要重跑基线覆盖已有结构。
5. 执行 `npm run dev`，打开 http://127.0.0.1:3000。

本地可使用 `AUTH_SMS_MODE=development` 和 `AUTH_DEV_CODE`。真实短信使用腾讯云短信：将 `AUTH_SMS_MODE` 改为 `tencent`，并配置 `TENCENTCLOUD_SECRET_ID`、`TENCENTCLOUD_SECRET_KEY`、`TENCENT_SMS_SDK_APP_ID`、`TENCENT_SMS_SIGN_NAME` 和 `TENCENT_SMS_TEMPLATE_ID`。短信模板参数 1 为验证码，参数 2 为有效分钟数。密钥只能写在 `.env.local` 或部署平台环境变量中。

## 本阶段实现

- 首页与双栏登录页，移动端适配；共用文字品牌、按钮、60px 表单控件、12px 圆角及 8px 间距刻度。
- +86 手机号校验、6 位验证码、60 秒倒计时、错误/加载状态、游客入口。
- 首次验证创建账号和默认昵称；默认头像使用昵称首字。
- MySQL 保存验证码散列、5 分钟有效期、最多 5 次错误、60 秒发送间隔、每小时最多 5 次发送。
- 随机会话令牌仅通过 HttpOnly / SameSite Cookie 发送，数据库只存散列；登录有效期 30 天，退出立即删除服务器会话。
- 游客入口创建或续期 24 小时会话；登录事务绑定未过期游客数据；不扣除免费机会。
- 修改接口同源校验、请求大小限制、手机号脱敏、不向客户端泄露数据库错误。

## 范围与待验证项

上传、诊断、历史记录、个人中心暂未开发，不展示不可用菜单。开始诊断/游客体验成功后仅提示入口已准备好，不伪造上传页面。

2026-09-13：本地九表结构已核对，登录两表迁移已应用。真实 MySQL 接口测试已通过首次注册、重复登录、错误验证码次数、过期验证码、重复发送、验证码单次使用、30 天会话、退出后旧 Cookie 失效、游客会话复用及绑定、不消耗免费机会。浏览器已验证获取验证码倒计时、登录跳转、刷新保持状态与退出登录。所有临时测试账号已清理。

复测命令：`node --env-file=.env.local scripts/test-auth.mjs`（需先启动本地开发服务器；会创建并清理自身的临时测试记录）。游客报告 10 天保留及报告解锁在报告阶段完善。

`npm run test` 运行安全边界测试；`npm run typecheck` 检查类型；`npm run build` 检查生产构建。

安装方式参考 [Next.js 官方文档](https://nextjs.org/docs/app/getting-started/installation)。

## LLM Model Eval Tool V0.1

内部评测工具位于 `/eval`，与正式诊断流程分离。Case 数据位于 `src/eval-tool/data/cases.json`，运行记录以 JSONL 事件写入 `.data/eval-tool/events.jsonl`，该目录不会提交到 Git。

在 `.env.local` 中为需要测试的厂商填写 API Key 与 model ID，重启开发服务器后即可运行。OpenAI、Anthropic 价格字段使用“美元 / 一百万 tokens”，DeepSeek 使用“人民币元 / 一百万 tokens”；价格只用于估算，不参与模型调用。DeepSeek 采用配置的固定价格档，不自动区分缓存命中和高峰时段。未配置密钥时评测页面仍可打开，但对应模型不可运行。

```env
OPENAI_API_KEY=
EVAL_OPENAI_MODEL=
EVAL_OPENAI_INPUT_USD_PER_1M=
EVAL_OPENAI_OUTPUT_USD_PER_1M=

ANTHROPIC_API_KEY=
EVAL_ANTHROPIC_MODEL=
EVAL_ANTHROPIC_INPUT_USD_PER_1M=
EVAL_ANTHROPIC_OUTPUT_USD_PER_1M=

DEEPSEEK_API_KEY=
EVAL_DEEPSEEK_MODEL=
EVAL_DEEPSEEK_INPUT_CNY_PER_1M=
EVAL_DEEPSEEK_OUTPUT_CNY_PER_1M=
```

三个 Adapter 分别使用 OpenAI Responses API、Anthropic Messages API 和 DeepSeek Chat Completions API。每次运行独立捕获错误，单个厂商失败不会终止后续模型；原始输出、Schema 校验、token、延迟、成本估算、人工评分和红线结果均会保留。CSV 从 `/api/eval/export` 导出。
