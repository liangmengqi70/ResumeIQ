import { Header } from '@/components/header';
import { DiagnosisProgress } from '@/components/diagnosis-progress';
import { JdForm } from '@/components/jd-form';

export default function JdPage() {
  return <div className="upload-page"><Header /><DiagnosisProgress current={1} /><JdForm /></div>;
}
