import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, EyeOff, FileText, Layers3, ShieldCheck } from 'lucide-react';
import type { DocumentComparisonResult, MatchingPassage } from '../algorithms/engine';
import type { UploadedDocument } from './UploadModule';

export type ComparisonRun = { id?: string; result: DocumentComparisonResult; elapsedMs: number };
type Props = { documents: UploadedDocument[]; comparisons: ComparisonRun[]; selectedComparisonId?: string | null; onBack: () => void };
type HighlightTone = 'yellow' | 'orange' | 'red';
type SourceInterval = { start: number; end: number; passageIndex: number; tone: HighlightTone };

function toneForPassage(passage: MatchingPassage, result: DocumentComparisonResult): HighlightTone {
  const smallerDocumentWords = Math.min(result.wordCountA, result.wordCountB);
  if (smallerDocumentWords > 0 && passage.matchingWords / smallerDocumentWords >= 0.7) return 'red';
  const repeated = result.repeatedFragments.some(fragment =>
    passage.text.includes(fragment.phrase) && (fragment.occurrencesA > 1 || fragment.occurrencesB > 1)
  );
  return repeated ? 'orange' : 'yellow';
}

function intervalsForDocument(result: DocumentComparisonResult, side: 'A' | 'B', sourceLength: number): SourceInterval[] {
  return result.passages.flatMap((passage, passageIndex) => {
    const start = side === 'A' ? passage.startCharA : passage.startCharB;
    const end = side === 'A' ? passage.endCharA : passage.endCharB;
    // Use only the Rabin–Karp engine's original-source offsets. Never infer offsets
    // from normalized text; malformed/out-of-range intervals are safely omitted.
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > sourceLength) return [];
    return [{ start, end, passageIndex, tone: toneForPassage(passage, result) }];
  });
}

function HighlightedSource({
  source, intervals, enabled, activePassage, passageRefs, onSelect
}: {
  source: string;
  intervals: SourceInterval[];
  enabled: boolean;
  activePassage: number;
  passageRefs: React.MutableRefObject<Array<HTMLElement | null>>;
  onSelect: (passageIndex: number) => void;
}) {
  const segments = useMemo(() => {
    if (!enabled || intervals.length === 0) return [{ start: 0, end: source.length, matches: [] as SourceInterval[] }];
    const boundaries = new Set<number>([0, source.length]);
    intervals.forEach(interval => { boundaries.add(interval.start); boundaries.add(interval.end); });
    const points = [...boundaries].sort((left, right) => left - right);
    return points.slice(0, -1).map((start, index) => {
      const end = points[index + 1];
      return { start, end, matches: intervals.filter(interval => interval.start <= start && interval.end >= end) };
    }).filter(segment => segment.end > segment.start);
  }, [source, intervals, enabled]);

  return (
    <div className="whitespace-pre-wrap break-words font-mono text-[12px] leading-7 text-slate-700">
      {segments.map((segment, index) => {
        if (!segment.matches.length) {
          return <span key={index} className={enabled ? 'rounded-sm bg-slate-100/80 text-slate-500' : ''}>{source.slice(segment.start, segment.end)}</span>;
        }
        const priority: Record<HighlightTone, number> = { yellow: 1, orange: 2, red: 3 };
        const tone = [...segment.matches].sort((left, right) => priority[right.tone] - priority[left.tone])[0].tone;
        const passageIndexes = [...new Set(segment.matches.map(match => match.passageIndex))];
        const passageIndex = passageIndexes[0];
        const toneClass = tone === 'red' ? 'bg-red-200 text-red-950 ring-1 ring-red-300'
          : tone === 'orange' ? 'bg-orange-200 text-orange-950 ring-1 ring-orange-300'
          : 'bg-yellow-200 text-yellow-950 ring-1 ring-yellow-300';
        return (
          <mark
            key={index}
            ref={element => { if (element && !passageRefs.current[passageIndex]) passageRefs.current[passageIndex] = element; }}
            className={`rounded-sm px-0.5 ${toneClass} ${passageIndexes.includes(activePassage) ? 'outline outline-2 outline-indigo-500' : ''}`}
          >
            <button type="button" onClick={() => onSelect(passageIndex)} title={`Passage ${passageIndexes.map(value => value + 1).join(', ')} · verified match`} className="inline cursor-pointer p-0 text-left align-baseline">
              {source.slice(segment.start, segment.end)}
            </button>
          </mark>
        );
      })}
    </div>
  );
}

function LegendItem({ tone, label, detail }: { tone: string; label: string; detail: string }) {
  return <div className="flex items-center gap-2"><span className={`h-3.5 w-3.5 shrink-0 rounded-sm border ${tone}`} /><span className="text-[11px] font-semibold text-slate-700">{label}</span><span className="text-[10px] text-slate-400">{detail}</span></div>;
}

function DocumentPane({
  label, side, document, intervals, enabled, activePassage, passageRefs, onSelect
}: {
  label: string;
  side: 'A' | 'B';
  document: UploadedDocument;
  intervals: SourceInterval[];
  enabled: boolean;
  activePassage: number;
  passageRefs: React.MutableRefObject<Array<HTMLElement | null>>;
  onSelect: (passageIndex: number) => void;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><FileText size={16} /></span>
          <div className="min-w-0"><p className="text-[10px] font-bold tracking-widest text-indigo-600">DOCUMENT {label}</p><h3 className="truncate text-xs font-semibold text-slate-800" title={document.name}>{document.name}</h3></div>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500">{document.wordCount.toLocaleString()} words</span>
      </header>
      <div className="max-h-[68vh] min-h-[320px] overflow-auto p-4 sm:p-5" aria-label={`Document ${side} content`}>
        <HighlightedSource source={document.text} intervals={intervals} enabled={enabled} activePassage={activePassage} passageRefs={passageRefs} onSelect={onSelect} />
      </div>
      <footer className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400">{document.characterCount.toLocaleString()} original characters · {enabled ? 'Verified passage highlighting on' : 'Highlighting hidden'}</footer>
    </section>
  );
}

export function ComparisonResults({ documents, comparisons, selectedComparisonId, onBack }: Props) {
  const [selectedPair, setSelectedPair] = useState(() => {
    if (!selectedComparisonId) return 0;
    return comparisons.findIndex(item => item.id === selectedComparisonId);
  });
  const [activePassage, setActivePassage] = useState(0);
  const [highlightsVisible, setHighlightsVisible] = useState(true);
  const leftPassageRefs = useRef<Array<HTMLElement | null>>([]);
  const rightPassageRefs = useRef<Array<HTMLElement | null>>([]);
  const lookup = useMemo(() => new Map(documents.map(document => [document.id, document])), [documents]);
  const current = comparisons[selectedPair];
  const result = current?.result;
  const documentA = result ? lookup.get(result.documentA.id) : undefined;
  const documentB = result ? lookup.get(result.documentB.id) : undefined;
  const passages = result?.passages ?? [];

  const intervalsA = useMemo(() => result && documentA ? intervalsForDocument(result, 'A', documentA.text.length) : [], [result, documentA]);
  const intervalsB = useMemo(() => result && documentB ? intervalsForDocument(result, 'B', documentB.text.length) : [], [result, documentB]);

  const navigateToPassage = (index: number) => {
    if (!passages.length) return;
    const next = Math.max(0, Math.min(index, passages.length - 1));
    setActivePassage(next);
    window.requestAnimationFrame(() => {
      leftPassageRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      rightPassageRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  if (!result || !documentA || !documentB) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <Layers3 size={26} className="mx-auto text-slate-400" />
        <h2 className="mt-3 text-base font-semibold text-slate-900">No comparison result selected</h2>
        <p className="mt-1 text-xs text-slate-500">{comparisons.length ? 'The selected comparison is no longer available in this browser session. Run a new comparison or return to Detection History.' : 'No completed comparison is currently selected. Run a comparison first, or return to Detection History to open a saved session report.'}</p>
        <button type="button" onClick={onBack} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white"><ArrowLeft size={14} /> Back to Similarity Checker</button>
      </section>
    );
  }

  const matchedPositions = result.matchingWordsA + result.matchingWordsB;
  const totalWords = result.wordCountA + result.wordCountB;
  const sharedCoverage = totalWords ? matchedPositions / totalWords * 100 : 0;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-[10px] font-bold tracking-widest text-indigo-600">SIDE-BY-SIDE ANALYSIS</p><h2 className="mt-1 text-lg font-bold text-slate-900">Comparison results</h2><p className="mt-1 text-xs text-slate-500">Matching text is highlighted using Rabin–Karp verified windows and original source character offsets.</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><ArrowLeft size={14} /> Back to checker</button>
            <button type="button" onClick={() => setHighlightsVisible(!highlightsVisible)} aria-pressed={highlightsVisible} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700">{highlightsVisible ? <EyeOff size={14} /> : <Eye size={14} />}{highlightsVisible ? 'Hide highlights' : 'Show highlights'}</button>
          </div>
        </div>

        {comparisons.length > 1 && <label className="mt-4 block max-w-xl"><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">Choose a document pair</span><select value={selectedPair} onChange={event => { setSelectedPair(Number(event.target.value)); setActivePassage(0); leftPassageRefs.current = []; rightPassageRefs.current = []; }} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700">{comparisons.map((item, index) => <option key={item.result.documentA.id + '-' + item.result.documentB.id} value={index}>{item.result.documentA.name} vs {item.result.documentB.name}</option>)}</select></label>}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Similarity · Document A', value: result.similarityA.toFixed(1) + '%' },
            { label: 'Similarity · Document B', value: result.similarityB.toFixed(1) + '%' },
            { label: 'Shared passage coverage', value: sharedCoverage.toFixed(1) + '%' },
            { label: 'Matching passages', value: String(passages.length) }
          ].map(item => <div key={item.label} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-medium text-slate-500">{item.label}</p><p className="mt-1 text-xl font-bold tabular-nums text-indigo-700">{item.value}</p></div>)}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-slate-500"><span><strong className="text-slate-800">{matchedPositions.toLocaleString()}</strong> matched word positions across both documents</span><span><strong className="text-slate-800">{current.elapsedMs.toFixed(2)} ms</strong> engine execution time</span><span><strong className="text-slate-800">{result.windowSize}</strong> words minimum phrase</span></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-sm font-semibold text-slate-900">Matching passage navigation</h3><p className="mt-1 text-[11px] text-slate-500">Select a passage to move both documents to the corresponding original text ranges.</p></div>
          <div className="flex gap-2">
            <button type="button" disabled={!passages.length || activePassage === 0} onClick={() => navigateToPassage(activePassage - 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 disabled:opacity-40"><ChevronLeft size={14} /> Previous Match</button>
            <button type="button" disabled={!passages.length || activePassage >= passages.length - 1} onClick={() => navigateToPassage(activePassage + 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 disabled:opacity-40">Next Match <ChevronRight size={14} /></button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {passages.map((passage, index) => <button key={passage.startTokenA + '-' + passage.startTokenB} type="button" onClick={() => navigateToPassage(index)} className={`rounded-xl border p-3 text-left transition ${activePassage === index ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
            <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-slate-800">Passage {index + 1}</span><span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-600">{passage.matchingWords} words</span></div>
            <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-slate-500">{passage.text}</p>
            <p className="mt-2 text-[10px] text-slate-400">A: {passage.startCharA}–{passage.endCharA} · B: {passage.startCharB}–{passage.endCharB}</p>
          </button>)}
          {!passages.length && <p className="rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500 sm:col-span-2 lg:col-span-3">No verified matching sequences met the configured phrase length. The documents remain unhighlighted.</p>}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-3">
          <LegendItem tone="border-yellow-300 bg-yellow-200" label="Yellow" detail="Verified matching passage" />
          <LegendItem tone="border-orange-300 bg-orange-200" label="Orange" detail="Repeated matching passage" />
          <LegendItem tone="border-red-300 bg-red-200" label="Red" detail="High overlap (≥70% of smaller document)" />
          <LegendItem tone="border-slate-200 bg-slate-100" label="Grey" detail="Unmatched source content" />
        </div>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <DocumentPane label="A" side="A" document={documentA} intervals={intervalsA} enabled={highlightsVisible} activePassage={activePassage} passageRefs={leftPassageRefs} onSelect={index => { setActivePassage(index); window.requestAnimationFrame(() => rightPassageRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' })); }} />
        <DocumentPane label="B" side="B" document={documentB} intervals={intervalsB} enabled={highlightsVisible} activePassage={activePassage} passageRefs={rightPassageRefs} onSelect={index => { setActivePassage(index); window.requestAnimationFrame(() => leftPassageRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' })); }} />
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-[11px] leading-5 text-indigo-900"><ShieldCheck size={15} className="mt-0.5 shrink-0" /><p>Highlight ranges come directly from the detection engine’s original-source character offsets. Unmatched words and common vocabulary alone are not highlighted. No offsets are inferred from normalized text.</p></div>
    </div>
  );
}
