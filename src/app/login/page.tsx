import { Brand } from '@/components/brand';
import { ResumeIllustration } from '@/components/resume-illustration';
import { LoginForm } from '@/components/login-form';
export default function LoginPage() {
  return <main className="login-layout"><aside className="login-aside"><Brand /><ResumeIllustration />
    <h2>你的简历，<br />为什么总是被拒？</h2><p className="aside-caption">AI · RESUME · DIAGNOSIS</p>
  </aside><section className="login-panel" aria-labelledby="login-title"><div className="login-content"><Brand />
    <div className="login-heading"><h1 id="login-title">登录</h1><p>未注册的账号验证后将自动创建</p></div><LoginForm />
  </div></section></main>;
}
