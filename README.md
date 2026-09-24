# ResumeIQ

ResumeIQ 是结合简历、目标岗位 JD 和求职背景生成诊断报告的应用。已实现首页、手机号验证码登录、游客入口、简历上传、JD 输入、背景调查、AI 分析、诊断报告、历史记录及个人中心抽屉；内部大模型评测工具当前为 **V0.2**。

本文按 2026-09-20 的代码状态更新；页面已实现不等于所有上线验收项均已完成。

## 本地运行

要求 Node.js 22+，MySQL 8.0.16+。

1. 在本目录执行 `npm install`。
2. 复制 `.env.example` 为 `.env.local`，填写本地 MySQL 连接信息。不要提交此文件。
3. 执行 `npm run db:inspect`，将真实九表结构与 `schema.sql` 比对。此命令只读取表结构。
4. 结构确认兼容后，按顺序应用尚未执行的迁移：`migrations/001_auth.sql`（验证码与登录会话）、`002_user_last_login.sql`（最近登录时间）、`003_ai_usage_metrics.sql`（AI 调用指标与成本字段）。先核对实际结构，不要重复执行迁移或重跑基线覆盖已有结构。
5. 执行 `npm run dev`，打开 http://127.0.0.1:3000。

本地可使用 `AUTH_SMS_MODE=development` 和 `AUTH_DEV_CODE`。真实短信使用腾讯云短信：将 `AUTH_SMS_MODE` 改为 `tencent`，并配置 `TENCENTCLOUD_SECRET_ID`、`TENCENTCLOUD_SECRET_KEY`、`TENCENT_SMS_SDK_APP_ID`、`TENCENT_SMS_SIGN_NAME` 和 `TENCENT_SMS_TEMPLATE_ID`。短信模板参数 1 为验证码，参数 2 为有效分钟数。密钥只能写在 `.env.local` 或部署平台环境变量中。

## 已实现功能

- 首页与双栏登录页，移动端适配；共用文字品牌、按钮、60px 表单控件、12px 圆角及 8px 间距刻度。
- +86 手机号校验、6 位验证码、60 秒倒计时、错误/加载状态、游客入口。
- 首次验证创建账号和默认昵称；默认头像使用昵称首字。
- MySQL 保存验证码散列、5 分钟有效期、最多 5 次错误、60 秒发送间隔、每小时最多 5 次发送。
- 随机会话令牌仅通过 HttpOnly / SameSite Cookie 发送，数据库只存散列；登录有效期 30 天，退出立即删除服务器会话。
- 游客入口创建或续期 24 小时会话；登录事务绑定未过期游客数据；不扣除免费机会。
- 修改接口同源校验、请求大小限制、手机号脱敏、不向客户端泄露数据库错误。
- 简历上传 `/upload`：选择或拖拽单份 PDF/DOCX，文件大小上限 10 MB；分析接口提取简历文本。
- JD 输入 `/jd` 与背景调查 `/background`：收集目标岗位和求职背景，进入诊断流程。
- AI 分析 `/analysis`：已接入 DeepSeek 诊断接口，提供等待、失败与重试界面；输入、任务、报告及调用指标写入 MySQL。
- 诊断报告 `/report`：展示初筛结论、问题证据、修改建议、参考改写和简历优势，包含游客登录解锁界面。
- 历史记录 `/history`：查询已绑定账号的报告、查看报告及软删除记录。
- 个人中心抽屉：头像与昵称编辑、手机号脱敏展示、账号时间信息及退出登录。

正式诊断使用 `DEEPSEEK_API_KEY`，可通过 `DEEPSEEK_MODEL` 和 `DEEPSEEK_BASE_URL` 配置模型及地址；具体环境变量见 `.env.example`。评测工具的模型配置见下文。

## 验证记录与后续验收

上述页面和接口已实现。正式诊断目前在请求内调用模型；独立 Worker、关闭页面后的任务持续执行及刷新恢复仍需后续完善。游客报告访问控制、保留期和免费机会限制需做端到端验收，不能仅凭页面完成认定全部业务约束已验收。

2026-09-13：本地九表结构已核对，登录两表迁移已应用。真实 MySQL 接口测试已通过首次注册、重复登录、错误验证码次数、过期验证码、重复发送、验证码单次使用、30 天会话、退出后旧 Cookie 失效、游客会话复用及绑定、不消耗免费机会。浏览器已验证获取验证码倒计时、登录跳转、刷新保持状态与退出登录。所有临时测试账号已清理。

登录复测命令：`node --env-file=.env.local scripts/test-auth.mjs`（需先启动本地开发服务器；会创建并清理自身的临时测试记录）。以上为历史验证记录，不代表本次重新执行了接口测试。

`npm run test` 运行安全边界测试；`npm run typecheck` 检查类型；`npm run build` 检查生产构建。

安装方式参考 [Next.js 官方文档](https://nextjs.org/docs/app/getting-started/installation)。

## Railway 公网部署

仓库已包含 `railway.json`、`/api/health` 健康检查和幂等的 `npm run db:init`。公开部署由一个 ResumeIQ Web 服务、一个 Railway MySQL 服务和一个挂载到 `/app/.data` 的持久卷组成。

1. 在 Railway 选择 **New Project → Deploy from GitHub repo**，连接此仓库。
2. 在同一个 Project 添加 **MySQL** 服务。
3. 在 ResumeIQ 服务添加以下变量引用（`MySQL` 为数据库服务名）：

```env
MYSQLHOST=${{MySQL.MYSQLHOST}}
MYSQLPORT=${{MySQL.MYSQLPORT}}
MYSQLDATABASE=${{MySQL.MYSQLDATABASE}}
MYSQLUSER=${{MySQL.MYSQLUSER}}
MYSQLPASSWORD=${{MySQL.MYSQLPASSWORD}}
```

4. 添加应用变量：`DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL`、`DEEPSEEK_BASE_URL`、`RESUMEIQ_DATA_DIR=/app/.data`、`AI_DAILY_GLOBAL_LIMIT=20`、`AI_DAILY_OWNER_LIMIT=3`、`EVAL_TOOL_ENABLED=false`。API Key 只放 Railway Variables。
5. 给 ResumeIQ 服务添加 Volume，Mount Path 填 `/app/.data`。
6. 在 **Settings → Networking → Public Networking** 生成域名。生成后可把 `APP_ORIGIN` 设为完整的 `https://...up.railway.app` 地址。

游客可以从首页直接进入上传和 AI 诊断流程。若要开放手机号登录，另将 `AUTH_SMS_MODE=tencent` 并配置 `.env.example` 中的腾讯云短信变量；未配置真实短信时，公开环境不会接受本地测试验证码。生产环境默认关闭内部 `/eval` 工具。

## LLM Model Eval Tool V0.2

内部评测工具位于 `/eval`，与正式诊断流程分离。Case 数据位于 `src/eval-tool/data/cases.json`，运行记录以 JSONL 事件写入 `.data/eval-tool/events.jsonl`，该目录不会提交到 Git。

当前 Prompt 版本为 `resume-diagnosis-v0.2`，输出使用与正式报告兼容的 Schema：`targetRole`、`verdict`、`verdictSummary`、`problems`、`strengths`。V0.2 记录可直接通过正式报告组件预览。

- 支持 OpenAI、Anthropic、DeepSeek 横向评测，每轮可重复 1～3 次。
- 展示 API 成功率、Schema 通过率、响应时间、输入/输出/总 Token、平均及累计估算成本。
- 保留完整模型输出与参考标注，支持六个维度的人工评分、失败类型、备注及 High Risk / FAIL 标记。
- 事实忠实度评分为 1 时自动标记 FAIL，支持 CSV 导出。

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
