import { Header } from '@/components/header';
import { DiagnosisProgress } from '@/components/diagnosis-progress';
import { AnalysisStatus } from '@/components/analysis-status';

export default function AnalysisPage() {
  return <div className="upload-page"><Header /><DiagnosisProgress current={3} /><AnalysisStatus /></div>;
}
