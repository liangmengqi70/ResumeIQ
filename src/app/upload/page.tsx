import { Header } from '@/components/header';
import { ResumeUpload } from '@/components/resume-upload';
import { DiagnosisProgress } from '@/components/diagnosis-progress';

export default function UploadPage() {
  return <div className="upload-page">
    <Header />
    <DiagnosisProgress />
    <ResumeUpload />
  </div>;
}
