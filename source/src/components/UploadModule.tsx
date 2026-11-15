import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import {
  AlertCircle, CheckCircle2, FileText, FileUp, FileCode2, FilePlus2,
  Files, Info, LoaderCircle, Trash2, UploadCloud, X
} from 'lucide-react';

export type UploadedDocument = {
  id: string;
  name: string;
  size: number;
  type: 'TXT' | 'MD';
  text: string;
  wordCount: number;
  characterCount: number;
  uploadedAt: string;
  status: 'ready';
  lastModified: number;
};

type Props = {
  documents: UploadedDocument[];
  onDocumentsChange: (documents: UploadedDocument[]) => void;
  onContinue: () => void;
};

type ValidationIssue = { name: string; message: string };

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['.txt', '.md'];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function countWords(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\\s+/u).length : 0;
}

function createId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `doc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function UploadModule({ documents, onDocumentsChange, onContinue }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  const addFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length) return;
    setIssues([]);
    setSuccessMessage('');
    setProcessing(true);

    const nextIssues: ValidationIssue[] = [];
    const accepted: UploadedDocument[] = [];
    const seen = new Set(documents.map(doc => `${doc.name.toLowerCase()}|${doc.size}|${doc.lastModified}`));

    for (const file of files) {
      const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        nextIssues.push({ name: file.name, message: 'Unsupported format. Choose a .txt or .md file.' });
        continue;
      }
      if (file.size === 0) {
        nextIssues.push({ name: file.name, message: 'This file is empty. Add text before uploading.' });
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        nextIssues.push({ name: file.name, message: 'File exceeds the 5 MB limit.' });
        continue;
      }
      const fingerprint = `${file.name.toLowerCase()}|${file.size}|${file.lastModified}`;
      if (seen.has(fingerprint)) {
        nextIssues.push({ name: file.name, message: 'This file has already been added.' });
        continue;
      }
      seen.add(fingerprint);

      try {
        const text = await file.text();
        if (!text.trim()) {
          nextIssues.push({ name: file.name, message: 'No readable text was found in this file.' });
          continue;
        }
        accepted.push({
          id: createId(),
          name: file.name,
          size: file.size,
          type: extension === '.md' ? 'MD' : 'TXT',
          text,
          wordCount: countWords(text),
          characterCount: text.length,
          uploadedAt: new Date().toISOString(),
          status: 'ready',
          lastModified: file.lastModified
        });
      } catch {
        nextIssues.push({ name: file.name, message: 'The file could not be read. Please try again.' });
      }
    }

    if (accepted.length) {
      onDocumentsChange([...documents, ...accepted]);
      setSuccessMessage(`${accepted.length} document${accepted.length === 1 ? '' : 's'} added and ready for analysis.`);
    }
    setIssues(nextIssues);
    setProcessing(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) void addFiles(event.target.files);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void addFiles(event.dataTransfer.files);
  };

  const removeDocument = (id: string) => {
    onDocumentsChange(documents.filter(doc => doc.id !== id));
    setSuccessMessage('Document removed from this session.');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-indigo-600">DOCUMENT INTAKE</p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">Add documents to your workspace</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Upload text documents to prepare them for comparison. TextGuard extracts their content locally in your browser.</p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">TXT · MD supported</span>
        </div>

        <input ref={inputRef} type="file" accept=".txt,.md,text/plain,text/markdown" multiple className="hidden" onChange={handleInput} />
        <div
          onDragEnter={event => { event.preventDefault(); setDragging(true); }}
          onDragOver={event => { event.preventDefault(); setDragging(true); }}
          onDragLeave={event => { event.preventDefault(); if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
          onDrop={handleDrop}
          className={`rounded-2xl border-2 border-dashed px-5 py-10 text-center transition sm:py-14 ${dragging ? 'border-indigo-500 bg-indigo-50/80' : 'border-indigo-200 bg-gradient-to-br from-slate-50 to-indigo-50/50 hover:border-indigo-300'}`}
        >
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm"><UploadCloud size={27} /></span>
          <h3 className="mt-4 text-base font-semibold text-slate-900">{dragging ? 'Drop your files to add them' : 'Drag and drop your documents here'}</h3>
          <p className="mt-2 text-sm text-slate-500">or browse from your device</p>
          <button type="button" disabled={processing} onClick={() => inputRef.current?.click()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
            {processing ? <LoaderCircle size={16} className="animate-spin" /> : <FileUp size={16} />} Browse Files
          </button>
          <p className="mt-4 text-[11px] text-slate-400">TXT and MD · Multiple files · Maximum 5 MB per file</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Plain text extraction</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheckIcon /> Processed in this browser session</span>
          <span className="inline-flex items-center gap-1.5"><Info size={14} className="text-indigo-500" /> No permanent cloud storage</span>
        </div>
      </section>

      {issues.length > 0 && <section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-900"><AlertCircle size={17} /> Some files could not be added</div>
        <ul className="mt-3 space-y-2">{issues.map((issue, index) => <li key={`${issue.name}-${index}`} className="flex flex-wrap gap-x-2 text-xs text-amber-800"><span className="font-semibold">{issue.name}</span><span>{issue.message}</span></li>)}</ul>
      </section>}

      {successMessage && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800"><CheckCircle2 size={15} /> {successMessage}</div>}

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div><h3 className="font-semibold text-slate-900">Uploaded documents</h3><p className="mt-1 text-xs text-slate-500">Files available in this browser session</p></div>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">{documents.length} {documents.length === 1 ? 'file' : 'files'}</span>
        </div>
        {documents.length === 0 ? (
          <div className="flex min-h-[190px] flex-col items-center justify-center px-6 py-8 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-slate-400"><Files size={22} /></span>
            <p className="mt-3 text-sm font-semibold text-slate-700">No documents uploaded yet</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Your selected TXT and MD files will appear here with their extracted text statistics.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {documents.map(doc => (
              <article key={doc.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">{doc.type === 'MD' ? <FileCode2 size={19} /> : <FileText size={19} />}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{doc.name}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{formatBytes(doc.size)} <span className="mx-1.5 text-slate-300">·</span>{doc.type} <span className="mx-1.5 text-slate-300">·</span>{doc.wordCount.toLocaleString()} words <span className="mx-1.5 text-slate-300">·</span>{doc.characterCount.toLocaleString()} characters</p>
                  <p className="mt-1 text-[10px] text-slate-400">Added {new Date(doc.uploadedAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-700"><CheckCircle2 size={12} /> Ready</span>
                  <button type="button" onClick={() => removeDocument(doc.id)} aria-label={`Remove ${doc.name}`} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-violet-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div><p className="text-sm font-semibold text-slate-900">Ready for the next step?</p><p className="mt-1 text-xs leading-5 text-slate-500">{documents.length < 2 ? 'Add at least two documents to prepare a comparison.' : `${documents.length} documents are ready to take into the similarity checker.`}</p></div>
        <button type="button" disabled={documents.length < 2 || processing} onClick={onContinue} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">Continue to Similarity Checker <ArrowRightIcon /></button>
      </div>
      <p className="text-center text-[11px] text-slate-400">Uploaded documents and extracted text are held in application memory for this session only. Refreshing or closing the tab clears them.</p>
    </div>
  );
}

function ShieldCheckIcon() {
  return <CheckCircle2 size={14} className="text-emerald-500" />;
}

function ArrowRightIcon() {
  return <span aria-hidden="true">→</span>;
}
