import Link from 'next/link';
export function Brand({ className = '' }: { className?: string }) {
  return <Link href="/" className={`brand ${className}`} aria-label="ResumeIQ 首页">ResumeIQ</Link>;
}
