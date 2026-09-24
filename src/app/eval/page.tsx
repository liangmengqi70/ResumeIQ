import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EvalDashboard } from '@/components/eval-dashboard';
import { evalToolEnabled } from '@/eval-tool/access';

export const metadata: Metadata = { title: 'Model Eval · ResumeIQ', description: 'ResumeIQ 大模型诊断评测工具' };
export default function EvalPage() {
  if (!evalToolEnabled()) notFound();
  return <EvalDashboard />;
}
