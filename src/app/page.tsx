import { Header } from '@/components/header';
import { GuestButton } from '@/components/guest-button';
export default function Home() {
  return <><Header /><main className="home-main"><div className="hero">
    <div className="eyebrow"><span />由 AI 驱动的简历诊断引擎</div>
    <h1>你的简历为什么<br />总是被拒？</h1>
    <p className="hero-description">AI 带你解锁答案，<br />让每一次投递更有把握。</p>
    <GuestButton /><p className="file-hint">支持 PDF / Word 简历</p>
  </div><p className="privacy-note"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" /><path d="m8 12 3 3 5-6" /></svg><span>你的数据安全有保障，仅用于简历分析，不会泄露给第三方。</span></p></main></>;
}
