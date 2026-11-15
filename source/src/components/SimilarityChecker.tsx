import { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, ArrowRight, CheckCircle2, FileText, FlaskConical,
  Layers3, LoaderCircle, ScanText, Search, ShieldCheck, Timer
} from 'lucide-react';
import {
  compareAllDocuments, compareDocuments,
  type DocumentComparisonResult, type MatchingPassage, type SourceDocument
} from '../algorithms/engine';
import { tokenizeDocument } from '../algorithms/preprocessing';
import type { UploadedDocument } from './UploadModule';

type Props = { documents: UploadedDocument[]; onUpload: () => void; onComparisonComplete: (runs: TimedResult[], runId: string, openReport: boolean) => void };
type RunMode = 'pair' | 'all';
type TimedResult = { result: DocumentComparisonResult; elapsedMs: number };

function Score({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-indigo-700">{value}</p>
      <p className="mt-1 text-[11px] leading-5 text-slate-500">{note}</p>
    </div>
  );
}

function SourceHighlight({ text, start, end }: { text: string; start: number; end: number }) {
  return (
    <p className="whitespace-pre-wrap break-words text-xs leading-6 text-slate-600">
      {text.slice(0, start)}
      <mark className="rounded bg-amber-100 px-0.5 text-amber-950">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </p>
  );
}

function Passage({ item, index, a, b }: {
  item: MatchingPassage; index: number; a: UploadedDocument; b: UploadedDocument;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap justify-between gap-2">
        <p className="text-xs font-semibold text-slate-800">Passage {index + 1}</p>
        <span className="text-[10px] text-slate-500">
          {item.matchingWords} matching words · A tokens {item.startTokenA + 1}–{item.endTokenA} · B tokens {item.startTokenB + 1}–{item.endTokenB}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="min-w-0 rounded-lg bg-slate-50 p-3">
          <p className="mb-2 break-all text-[10px] font-bold uppercase tracking-wider text-slate-400">{a.name}</p>
          <SourceHighlight text={a.text} start={item.startCharA} end={item.endCharA} />
        </div>
        <div className="min-w-0 rounded-lg bg-slate-50 p-3">
          <p className="mb-2 break-all text-[10px] font-bold uppercase tracking-wider text-slate-400">{b.name}</p>
          <SourceHighlight text={b.text} start={item.startCharB} end={item.endCharB} />
        </div>
      </div>
    </div>
  );
}

function PairReport({ timed, a, b }: { timed: TimedResult; a: UploadedDocument; b: UploadedDocument }) {
  const result = timed.result;
  const [expanded, setExpanded] = useState(true);
  const significantPassages = useMemo(
    () => [...result.passages].sort((left, right) => right.matchingWords - left.matchingWords || left.startTokenA - right.startTokenA),
    [result.passages]
  );
  const totalWords = result.wordCountA + result.wordCountB;
  const sharedPositions = result.matchingWordsA + result.matchingWordsB;
  const sharedCoverage = totalWords === 0 ? 0 : sharedPositions / totalWords * 100;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-widest text-indigo-600">PAIRWISE REPORT</p>
          <h3 className="mt-2 break-words text-sm font-semibold text-slate-900">
            {a.name} <span className="text-slate-400">vs</span> {b.name}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {result.wordCountA.toLocaleString()} and {result.wordCountB.toLocaleString()} words · {result.windowSize}-word minimum phrase
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 size={13} className="mr-1 inline" /> Actual engine result
        </span>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <Score label="Pairwise similarity · A" value={result.similarityA.toFixed(1) + '%'} note={result.matchingWordsA + ' matched positions / ' + result.wordCountA + ' words'} />
        <Score label="Pairwise similarity · B" value={result.similarityB.toFixed(1) + '%'} note={result.matchingWordsB + ' matched positions / ' + result.wordCountB + ' words'} />
        <Score label="Shared passage coverage" value={sharedCoverage.toFixed(1) + '%'} note={sharedPositions + ' matched positions across both documents / ' + totalWords + ' total words'} />
        <Score label="Matching passages" value={String(result.passages.length)} note={result.passages.length ? 'Verified exact-sequence passage groups' : 'No exact passage met the phrase threshold'} />
      </div>

      <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
          <p className="text-xs font-semibold text-indigo-900">Matching words</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-indigo-800">{sharedPositions.toLocaleString()}</p>
          <p className="mt-1 text-[11px] leading-5 text-indigo-700">Unique matched token positions counted in A plus B; overlapping windows are deduplicated.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-slate-700"><Timer size={14} /> Algorithm execution time</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-800">{timed.elapsedMs.toFixed(2)} ms</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">Measured around the TypeScript comparison engine call in this browser.</p>
        </div>
      </div>

      <div className="mx-5 mb-4 rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-[11px] leading-5 text-amber-900">
        <strong>How to read this:</strong> A and B percentages are directional matched-position coverage. Shared passage coverage is the combined matched positions divided by both documents’ total word count. These are textual-overlap metrics, not a finding of intent or plagiarism.
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-5">
        <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
          <span className="rounded-lg bg-slate-50 px-2 py-1">Rabin–Karp matches: {result.algorithmMetrics.rabinKarpWindowMatches}</span>
          <span className="rounded-lg bg-slate-50 px-2 py-1">Shared hash fragments: {result.algorithmMetrics.sharedHashFragments}</span>
          <span className="rounded-lg bg-slate-50 px-2 py-1">Trie shared words: {result.algorithmMetrics.trieSharedVocabulary}</span>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
          {expanded ? 'Hide matching passages' : 'Show matching passages'} <ArrowRight size={13} />
        </button>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-slate-100 bg-slate-50/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-800">Most significant matching passages</h4>
            <span className="text-[10px] text-slate-500">Ranked by matching word count · showing up to 5</span>
          </div>
          {significantPassages.length ? significantPassages.slice(0, 5).map((item, index) => (
            <Passage key={item.startTokenA + '-' + item.startTokenB} item={item} index={index} a={a} b={b} />
          )) : (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center text-xs text-slate-500">
              No verified matching passage of {result.windowSize} or more consecutive words was found.
            </p>
          )}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-700">Shared vocabulary (Trie)</p>
            <p className="mt-2 break-words text-xs leading-6 text-slate-500">
              {result.sharedUniqueTokens.length ? result.sharedUniqueTokens.join(', ') : 'No shared words.'}
            </p>
            <p className="mt-2 text-[10px] text-slate-400">Dice vocabulary similarity: {result.diceSimilarity.toFixed(1)}% (reported separately; not used as passage coverage).</p>
          </div>
        </div>
      )}
    </article>
  );
}

export function SimilarityChecker({ documents, onUpload, onComparisonComplete }: Props) {
  const [mode, setMode] = useState<RunMode>('pair');
  const [documentAId, setDocumentAId] = useState('');
  const [documentBId, setDocumentBId] = useState('');
  const [phraseLength, setPhraseLength] = useState('5');
  const [results, setResults] = useState<TimedResult[] | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [runSummary, setRunSummary] = useState('');
  const [completedRunId, setCompletedRunId] = useState('');

  const lookup = useMemo(() => new Map(documents.map(document => [document.id, document])), [documents]);
  const availableA = lookup.get(documentAId);
  const availableB = lookup.get(documentBId);
  const wordCount = (document: UploadedDocument) => tokenizeDocument(document.text).wordCount;

  useEffect(() => {
    if (!documents.some(document => document.id === documentAId)) {
      setDocumentAId(documents[0]?.id ?? '');
    }
    if (!documents.some(document => document.id === documentBId) || documentBId === documentAId) {
      setDocumentBId(documents.find(document => document.id !== (documentAId || documents[0]?.id))?.id ?? '');
    }
  }, [documents, documentAId, documentBId]);

  const runComparison = () => {
    setError('');
    setRunSummary('');
    setResults(null);

    if (documents.length < 2) {
      setError('Upload at least two readable documents before starting a comparison.');
      return;
    }

    const parsedLength = Number(phraseLength);
    if (!Number.isInteger(parsedLength) || parsedLength < 1 || parsedLength > 20) {
      setError('Minimum matching phrase length must be a whole number from 1 to 20 words.');
      return;
    }

    if (mode === 'pair') {
      if (!documentAId || !documentBId) {
        setError('Select both Document A and Document B.');
        return;
      }
      if (documentAId === documentBId) {
        setError('Choose two different documents. Document A and Document B cannot be the same file.');
        return;
      }
      if (!availableA || !availableB) {
        setError('One of the selected documents is no longer available. Please select both documents again.');
        return;
      }
      if (!availableA.text.trim() || !availableB.text.trim()) {
        setError('Both selected documents must contain readable text.');
        return;
      }
    }

    const sourceDocuments: SourceDocument[] = (mode === 'all' ? documents : [availableA!, availableB!])
      .map(document => ({ id: document.id, name: document.name, text: document.text }));
    if (sourceDocuments.some(document => !document.text.trim())) {
      setError('One or more documents contain no readable text. Remove or re-upload those files before comparing all documents.');
      return;
    }

    setProcessing(true);
    window.setTimeout(() => {
      const startedAt = performance.now();
      try {
        const comparisons = mode === 'all'
          ? compareAllDocuments(sourceDocuments, { windowSize: parsedLength })
          : [compareDocuments(sourceDocuments[0], sourceDocuments[1], { windowSize: parsedLength })];
        const elapsedMs = performance.now() - startedAt;
        const completedRuns = comparisons.map(result => ({ result, elapsedMs }));
        const runId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
        setCompletedRunId(runId);
        setResults(completedRuns);
        onComparisonComplete(completedRuns, runId, false);
        setRunSummary(mode === 'all'
          ? 'Completed all ' + comparisons.length + ' unordered document pairs.'
          : 'Completed the selected document comparison.');
      } catch (comparisonError) {
        console.error('TextGuard comparison failed', comparisonError);
        setError('The comparison engine could not complete this run. Check the document text and try again.');
      } finally {
        setProcessing(false);
      }
    }, 20);
  };

  const possiblePairs = documents.length * (documents.length - 1) / 2;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-indigo-600">CLASSICAL DSA ENGINE</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">Compare your documents</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Select two files for a focused comparison or compare every uploaded file. Analysis runs locally using TextGuard’s TypeScript hash table, Trie, token-offset preprocessing, and Rabin–Karp engine.
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 size={13} className="mr-1 inline" /> DSA engine connected
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Comparison mode">
          <button type="button" onClick={() => { setMode('pair'); setResults(null); setError(''); }} className={`rounded-lg px-4 py-2.5 text-xs font-semibold transition ${mode === 'pair' ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
            Compare two documents
          </button>
          <button type="button" onClick={() => { setMode('all'); setResults(null); setError(''); }} className={`rounded-lg px-4 py-2.5 text-xs font-semibold transition ${mode === 'all' ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
            Compare all uploaded documents
          </button>
        </div>

        {mode === 'pair' && (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Document A</span>
              <select value={documentAId} onChange={event => { setDocumentAId(event.target.value); setResults(null); }} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                <option value="">Select Document A</option>
                {documents.map(document => <option key={document.id} value={document.id}>{document.name}</option>)}
              </select>
              {availableA && <span className="mt-2 flex items-center gap-2 text-[11px] text-slate-500"><FileText size={13} /> {wordCount(availableA).toLocaleString()} words · {(availableA.size / 1024).toFixed(1)} KB</span>}
            </label>
            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Document B</span>
              <select value={documentBId} onChange={event => { setDocumentBId(event.target.value); setResults(null); }} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                <option value="">Select Document B</option>
                {documents.map(document => <option key={document.id} value={document.id}>{document.name}</option>)}
              </select>
              {availableB && <span className="mt-2 flex items-center gap-2 text-[11px] text-slate-500"><FileText size={13} /> {wordCount(availableB).toLocaleString()} words · {(availableB.size / 1024).toFixed(1)} KB</span>}
            </label>
          </div>
        )}

        {mode === 'all' && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700">Documents included in this run</p>
              <span className="text-[11px] text-slate-500">{documents.length} documents · {possiblePairs} unique pairs</span>
            </div>
            {documents.length ? (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {documents.map(document => <li key={document.id} className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-slate-700"><FileText size={14} className="shrink-0 text-indigo-500" /><span className="truncate">{document.name}</span></span>
                  <span className="shrink-0 tabular-nums text-slate-500">{wordCount(document).toLocaleString()} words</span>
                </li>)}
              </ul>
            ) : <p className="mt-2 text-xs text-slate-500">No documents uploaded yet.</p>}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Minimum matching phrase length</span>
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={20} step={1} value={phraseLength} onChange={event => { setPhraseLength(event.target.value); setResults(null); }} className="w-24 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              <span className="text-xs text-slate-500">words (default 5)</span>
            </div>
          </label>
          <button type="button" disabled={processing || documents.length < 2} onClick={runComparison} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300">
            {processing ? <LoaderCircle size={16} className="animate-spin" /> : <Search size={16} />}
            {processing ? 'Comparing documents…' : 'Start Comparison'}
          </button>
          <span className="text-xs text-slate-500">{documents.length} uploaded · {possiblePairs} possible pairs</span>
        </div>

        {documents.length < 2 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertCircle size={15} /> Upload at least two documents to compare them.
            <button type="button" onClick={onUpload} className="font-semibold underline">Upload documents</button>
          </div>
        )}
        {error && <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"><AlertCircle size={15} className="shrink-0" /> {error}</p>}
        {processing && <div role="status" aria-live="polite" className="mt-4 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-xs text-indigo-800"><LoaderCircle size={17} className="animate-spin" /><span><strong>Running the real comparison engine.</strong> Tokenizing documents, indexing fragments, and verifying matching word windows…</span></div>}
        {runSummary && !processing && results && <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3"><p className="text-xs font-medium text-emerald-700">{runSummary}</p><button type="button" onClick={() => onComparisonComplete(results, completedRunId, true)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700">Open side-by-side comparison <ArrowRight size={13} /></button></div>}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: Layers3, title: 'Hash table', desc: 'Indexes normalized fragments' },
            { icon: Search, title: 'Trie', desc: 'Tracks shared vocabulary' },
            { icon: ScanText, title: 'Token arrays', desc: 'Preserve original source offsets' },
            { icon: FlaskConical, title: 'Rabin–Karp', desc: 'Rolling hash + exact token verification' }
          ].map(item => <div key={item.title} className="rounded-xl bg-slate-50 p-3"><item.icon size={17} className="text-indigo-600" /><p className="mt-2 text-xs font-semibold text-slate-800">{item.title}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{item.desc}</p></div>)}
        </div>
      </section>

      {results && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">Completed comparison report</h3>
              <p className="mt-1 text-xs text-slate-500">{results.length} pairwise report{results.length === 1 ? '' : 's'} · {phraseLength}-word minimum · actual TypeScript engine output</p>
            </div>
            <button type="button" onClick={() => { setResults(null); setRunSummary(''); }} className="text-xs font-semibold text-slate-500 hover:text-slate-800">Clear report</button>
          </div>
          {results.length ? results.map(timed => {
            const a = lookup.get(timed.result.documentA.id);
            const b = lookup.get(timed.result.documentB.id);
            return a && b ? <PairReport key={timed.result.documentA.id + '-' + timed.result.documentB.id} timed={timed} a={a} b={b} /> : null;
          }) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <Activity size={25} className="mx-auto text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-800">No document pairs to compare</p>
              <p className="mt-1 text-xs text-slate-500">The engine did not return any pairwise results.</p>
            </div>
          )}
        </section>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs leading-5 text-indigo-900">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" />
        <p><strong>Academic transparency:</strong> only verified exact word sequences are shown as matching passages. Similarity percentages are derived from deduplicated matched token positions; no random values or generated passages are used.</p>
      </div>
    </div>
  );
}
