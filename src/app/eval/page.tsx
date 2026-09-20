import type { Metadata } from 'next';
import { EvalDashboard } from '@/components/eval-dashboard';

export const metadata: Metadata = { title: 'Model Eval · ResumeIQ', description: 'ResumeIQ 大模型诊断评测工具' };
export default function EvalPage() { return <EvalDashboard />; }

