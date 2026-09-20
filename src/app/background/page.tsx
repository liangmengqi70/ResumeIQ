import { Header } from '@/components/header';
import { DiagnosisProgress } from '@/components/diagnosis-progress';
import { BackgroundForm } from '@/components/background-form';

export default function BackgroundPage() {
  return <div className="upload-page"><Header /><DiagnosisProgress current={2} /><BackgroundForm /></div>;
}
