'use client';
import { ButtonArrow } from './button-arrow';
import Link from 'next/link';

export function DiagnosisFooter({ back, disabled, onNext, label = '下一步' }: { back: string; disabled: boolean; onNext: () => void; label?: string }) {
  return <footer className="upload-footer"><div><Link href={back} className="upload-back">返回</Link><button className="button upload-next" disabled={disabled} onClick={onNext}>{label} <ButtonArrow chevron /></button></div></footer>;
}

