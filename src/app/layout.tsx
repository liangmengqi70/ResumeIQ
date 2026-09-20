import type { Metadata } from 'next';
import './globals.css';
import './figma-calibration.css';

export const metadata: Metadata = { title: 'ResumeIQ · AI 简历诊断', description: '结合目标岗位，找到简历中的问题与优势。' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
