'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DiagnosisFooter } from './diagnosis-footer';
import { diagnosisDraft } from '@/lib/diagnosis-draft';

export function ResumeUpload() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { setFile(diagnosisDraft.file); }, []);

  function selectFiles(files: FileList | null) {
    setError(''); setNotice('');
    if (!files?.length) return;
    if (files.length !== 1) { setError('请一次选择一份简历。'); return; }
    const selected = files[0];
    if (!/\.(pdf|docx)$/i.test(selected.name)) { setError('请选择 PDF 或 DOCX 格式的简历。'); return; }
    if (!selected.size) { setError('文件为空，请重新选择。'); return; }
    if (selected.size > 10 * 1024 * 1024) { setError('文件不能超过 10MB，请重新选择。'); return; }
    setFile(selected);
    diagnosisDraft.file = selected;
  }

  return <>
    <main className="upload-main">
      <h1>上传你的简历</h1>
      <p className="upload-description">支持 PDF、DOCX 格式，请上传最新版本的简历。</p>
      <input ref={input} className="sr-only" type="file" tabIndex={-1} aria-label="选择简历" accept=".pdf,.docx" onChange={event => { selectFiles(event.target.files); event.target.value = ''; }} />
      <button type="button" className={`upload-dropzone${dragging ? ' is-dragging' : ''}${file ? ' has-file' : ''}`}
        onClick={() => input.current?.click()}
        onDragEnter={event => { event.preventDefault(); dragDepth.current++; setDragging(true); }}
        onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }}
        onDragLeave={event => { event.preventDefault(); if (--dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false); } }}
        onDrop={event => { event.preventDefault(); dragDepth.current = 0; setDragging(false); selectFiles(event.dataTransfer.files); }}>
        <span className="upload-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></svg></span>
        {file ? <><strong className="upload-filename">{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB · 已选择</span><span className="upload-replace">点击或拖拽重新选择</span></> : <><strong>{dragging ? '松开鼠标，选择简历' : <>拖拽文件到这里，或<span className="upload-link">点击上传</span></>}</strong><span>支持格式：PDF、DOCX</span><span>最大 10MB</span></>}
      </button>
      <div className="upload-feedback" aria-live="polite">{error && <p className="form-error" role="alert">{error}</p>}{file && <button className="text-button" onClick={() => { setFile(null); diagnosisDraft.file = null; setError(''); setNotice(''); }}>移除文件</button>}{notice && <p>{notice}</p>}</div>
    </main>
    <DiagnosisFooter back="/" disabled={!file} onNext={() => router.push('/jd')} />
  </>;
}
