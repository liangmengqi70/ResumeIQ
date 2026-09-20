import type { EvalCase } from './types';
import { PROMPT_VERSION } from './config';

export function buildPrompt(testCase: EvalCase) {
  return `Prompt version: ${PROMPT_VERSION}

你是一名严谨、表达清楚的招聘初筛 HR。请结合候选人的简历、目标岗位 JD 和背景信息，生成与 ResumeIQ 正式诊断报告完全一致的结构化报告。

控制要求：
1. 只能使用下方材料中的事实，不得补充或猜测候选人未提供的经历、技能或结果。
2. 明确把简历证据与 JD 要求对应起来。
3. 报告的阅读顺序是：AI HR 初筛结论 → 为什么是这个结论 → 每个关键问题的具体修改建议 → 参考改写 → 简历优势。
4. problems 按对初筛结果的影响从高到低排列。每个问题必须同时包含简历原文、对应 JD 要求、影响原因、具体建议和参考改写。
5. 建议必须具体、可执行；参考改写只能使用材料中已有事实。缺少数字或事实时使用「[补充真实数据]」等占位提示，不得替候选人编造。
6. verdictSummary 要用自然、通俗的中文说明结论和最核心原因，不能只写“匹配度一般”等空泛判断。
7. 只保留最影响初筛的 3～5 个 problems 和最有证据的 2～3 个 strengths，内容清楚、具体、不重复。
8. 只输出一个 JSON 对象，不要输出 Markdown、解释前缀或代码围栏。
9. verdict 只能是 recommended、concern、rejected；impact 只能是 high、mid、low。

<resume>
${testCase.resume}
</resume>

<job_description>
${testCase.jd}
</job_description>

<background>
${testCase.background}
</background>

输出字段：
{
  "targetRole": "从 JD 中提取的目标岗位名称",
  "verdict": "recommended | concern | rejected",
  "verdictSummary": "初筛结论及其最核心原因",
  "problems": [{
    "id": "稳定、简短、仅含英文小写字母和连字符的问题标识",
    "impact": "high | mid | low",
    "title": "问题标题",
    "summary": "用大白话概括候选人当前的问题",
    "resumeQuote": "简历中的直接原文；若未提供相关证据，明确写简历未体现",
    "jdRequirement": "与问题对应的 JD 原文或忠实概括",
    "whyMatters": "为什么这个问题会影响 HR 初筛",
    "suggestion": "候选人可以如何具体修改",
    "rewrite": "严格基于已有事实的参考改写；缺失信息用方括号占位"
  }],
  "strengths": [{
    "id": "稳定、简短、仅含英文小写字母和连字符的优势标识",
    "title": "优势标题",
    "detail": "优势说明及简历中的直接证据"
  }]
}`;
}
