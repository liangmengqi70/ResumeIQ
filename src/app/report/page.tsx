import { Header } from '@/components/header';
import { DiagnosisProgress } from '@/components/diagnosis-progress';
import { GuestReport } from '@/components/guest-report';

export default function ReportPage() {
  return <div className="upload-page"><Header /><DiagnosisProgress current={4} /><GuestReport /></div>;
}
