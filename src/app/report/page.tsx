import { Header } from '@/components/header';
import { DiagnosisProgress } from '@/components/diagnosis-progress';
import { GuestReport } from '@/components/guest-report';

export const dynamic = 'force-dynamic';

export default function ReportPage() {
  const allowGuestFullReport = process.env.GUEST_REPORT_ACCESS === 'full';
  return <div className="upload-page"><Header /><DiagnosisProgress current={4} /><GuestReport allowGuestFullReport={allowGuestFullReport} /></div>;
}
