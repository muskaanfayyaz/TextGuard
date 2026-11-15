import { useMemo, useState } from 'react';
import { ArrowLeft, Download, FileDown, FileSearch, Printer, Search, Trash2, X } from 'lucide-react';
import type { DocumentComparisonResult, MatchingPassage } from '../algorithms/engine';

export type HistoryDocument = {
  id: string; name: string; text: string; wordCount: number;
  characterCount: number; type: string; size: number;
};
export type HistoryEntry = {
  id: string; detectedAt: string; elapsedMs: number;
  result: DocumentComparisonResult; documentA: HistoryDocument; documentB: HistoryDocument;
};
type Props = { entries: HistoryEntry[]; onDelete: (id: string) => void };
type SortMode = 'newest' | 'oldest' | 'similarity-high' | 'similarity-low';

function score(entry: HistoryEntry) {
  return (entry.result.similarityA + entry.result.similarityB) / 2;
}
function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString();
}
function cell(value: string | number) {
  return '"' + String(value).replace(/"/g, '""') + '"';
}
function exportCsv(entry: HistoryEntry) {
  const result = entry.result;
  const matched = result.matchingWordsA + result.matchingWordsB;
  const total = result.wordCountA + result.wordCountB;
  const header = [
    'Comparison ID', 'Analysis date', 'Document A', 'Document B',
    'Average similarity %', 'Document A similarity %', 'Document B similarity %',
    'Shared coverage %', 'Matching passages', 'Matching word positions',
    'Execution time ms', 'Minimum phrase words', 'Passage number',
    'Passage words', 'A start character', 'A end character',
    'B start character', 'B end character', 'Passage text'
  ];
  const rows: Array<Array<string | number>> = [header];
  (result.passages.length ? result.passages : [null]).forEach((passage, index) => rows.push([
    entry.id, entry.detectedAt, entry.documentA.name, entry.documentB.name,
    score(entry).toFixed(2), result.similarityA.toFixed(2), result.similarityB.toFixed(2),
    (total ? matched / total * 100 : 0).toFixed(2), result.passages.length, matched,
    entry.elapsedMs.toFixed(3), result.windowSize, passage ? index + 1 : '',
    passage?.matchingWords ?? '', passage?.startCharA ?? '', passage?.endCharA ?? '',
    passage?.startCharB ?? '', passage?.endCharB ?? '', passage?.text ?? ''
  ]));
  const blob = new Blob(['\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'textguard-' + entry.id + '.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

function tone(passage: MatchingPassage, result: DocumentComparisonResult) {
  if (Math.min(result.wordCountA, result.wordCountB) > 0 &&
      passage.matchingWords / Math.min(result.wordCountA, result.wordCountB) >= 0.7) return 'bg-red-200 text-red-950';
  const repeated = result.repeatedFragments.some(fragment =>
    passage.text.includes(fragment.phrase) && (fragment.occurrencesA > 1 || fragment.occurrencesB > 1)
  );
  return repeated ? 'bg-orange-200 text-orange-950' : 'bg-yellow-200 text-yellow-950';
}

function SourceView({ document, result, side }: {
  document: HistoryDocument; result: DocumentComparisonResult; side: 'A' | 'B';
}) {
  const intervals = result.passages.map((passage, index) => ({
    start: side === 'A' ? passage.startCharA : passage.startCharB,
    end: side === 'A' ? passage.endCharA : passage.endCharB,
    index, tone: tone(passage, result)
  })).filter(item => Number.isInteger(item.start) && Number.isInteger(item.end) &&
    item.start >= 0 && item.end > item.start && item.end <= document.text.length);
  const points = [...new Set([0, document.text.length, ...intervals.flatMap(item => [item.start, item.end])])].sort((a, b) => a - b);
  return <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200">
    <header className="border-b border-slate-100 bg-slate-50 px-4 py-3">
      <p className="break-all text-xs font-semibold text-slate-800">{document.name}</p>
      <p className="mt-1 text-[10px] text-slate-500">{document.wordCount.toLocaleString()} words · {document.characterCount.toLocaleString()} characters · {document.type}</p>
    </header>
    <div className="tg-source max-h-[440px] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[11px] leading-6 text-slate-700">
      {points.slice(0, -1).map((start, index) => {
        const end = points[index + 1];
        const active = intervals.filter(item => item.start <= start && item.end >= end);
        return active.length
          ? <mark key={start} className={`rounded-sm px-0.5 ${active[0].tone}`} title={'Passage ' + (active[0].index + 1)}>{document.text.slice(start, end)}</mark>
          : <span key={start} className="bg-slate-100/70 text-slate-500">{document.text.slice(start, end)}</span>;
      })}
    </div>
  </section>;
}

function Report({ entry, onBack }: { entry: HistoryEntry; onBack: () => void }) {
  const r = entry.result;
  const matched = r.matchingWordsA + r.matchingWordsB;
  const total = r.wordCountA + r.wordCountB;
  const coverage = total ? matched / total * 100 : 0;
  const print = () => window.print();
  return <div className="space-y-5">
    <style>{`@media print {
      body * { visibility: hidden !important; }
      #textguard-report-print, #textguard-report-print * { visibility: visible !important; }
      #textguard-report-print { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; padding: 0 !important; }
      .tg-no-print { display: none !important; }
      .tg-report-section { break-inside: avoid; }
      .tg-source { max-height: none !important; overflow: visible !important; }
      mark { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }`}</style>
    <div className="tg-no-print flex flex-wrap items-center justify-between gap-2">
      <button onClick={onBack} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"><ArrowLeft size={14}/> Back to history</button>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => exportCsv(entry)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"><Download size={14}/> Export CSV</button>
        <button onClick={print} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700"><FileDown size={14}/> Download PDF</button>
        <button onClick={print} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"><Printer size={14}/> Print report</button>
      </div>
    </div>
    <article id="textguard-report-print" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <header className="tg-report-section border-b border-slate-100 pb-4">
        <p className="text-[10px] font-bold tracking-widest text-indigo-600">TEXTGUARD · DETECTION REPORT</p>
        <h2 className="mt-2 text-xl font-bold text-slate-950">Document similarity analysis</h2>
        <p className="mt-2 break-words text-sm text-slate-600">{entry.documentA.name} vs {entry.documentB.name}</p>
        <p className="mt-2 text-[10px] text-slate-500">Comparison ID: {entry.id} · {dateLabel(entry.detectedAt)}</p>
      </header>
      <section className="tg-report-section">
        <h3 className="text-sm font-bold text-slate-900">1. Comparison overview</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-500">Average directional score</p><p className="mt-1 text-xl font-bold text-indigo-700">{score(entry).toFixed(1)}%</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-500">Matching passages</p><p className="mt-1 text-xl font-bold">{r.passages.length}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-500">Matched positions A + B</p><p className="mt-1 text-xl font-bold">{matched.toLocaleString()}</p></div>
        </div>
        <p className="mt-2 text-xs text-slate-600">Combined shared passage coverage: {coverage.toFixed(1)}% of the combined word count.</p>
      </section>
      <section className="tg-report-section">
        <h3 className="text-sm font-bold text-slate-900">2. Document information</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">{[entry.documentA, entry.documentB].map((doc, i) => <div key={doc.id} className="rounded-xl border border-slate-200 p-3"><p className="text-[10px] font-bold text-slate-400">DOCUMENT {i === 0 ? 'A' : 'B'}</p><p className="mt-2 break-all text-xs font-semibold">{doc.name}</p><p className="mt-1 text-[11px] text-slate-500">{doc.type} · {doc.wordCount} words · {doc.characterCount} characters · {(doc.size / 1024).toFixed(1)} KB</p></div>)}</div>
      </section>
      <section className="tg-report-section">
        <h3 className="text-sm font-bold text-slate-900">3. Similarity percentages</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-indigo-50 p-3"><p className="text-[10px] text-indigo-700">Document A</p><p className="mt-1 text-2xl font-bold text-indigo-800">{r.similarityA.toFixed(2)}%</p><p className="text-[10px] text-indigo-700">{r.matchingWordsA} / {r.wordCountA} words</p></div>
          <div className="rounded-xl bg-indigo-50 p-3"><p className="text-[10px] text-indigo-700">Document B</p><p className="mt-1 text-2xl font-bold text-indigo-800">{r.similarityB.toFixed(2)}%</p><p className="text-[10px] text-indigo-700">{r.matchingWordsB} / {r.wordCountB} words</p></div>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">Average is the arithmetic mean of directional coverage; it is not a separate engine metric.</p>
      </section>
      <section className="tg-report-section">
        <h3 className="text-sm font-bold text-slate-900">4. Matching passage count</h3>
        <p className="mt-2 text-xs text-slate-600">{r.passages.length} verified passage group(s), minimum phrase threshold {r.windowSize} consecutive tokens; {matched} matched positions after overlapping windows are deduplicated.</p>
      </section>
      <section className="tg-report-section">
        <h3 className="text-sm font-bold text-slate-900">5. Highlighted matching passages</h3>
        <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-slate-500"><span>🟨 Verified</span><span>🟧 Repeated</span><span>🟥 High overlap</span><span>⬜ Unmatched</span></div>
        {r.passages.length ? <div className="mt-3 grid gap-3 xl:grid-cols-2"><SourceView document={entry.documentA} result={r} side="A"/><SourceView document={entry.documentB} result={r} side="B"/></div> : <p className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">No verified sequence met the phrase threshold; no passages are highlighted.</p>}
        {r.passages.map((p, i) => <div key={p.startTokenA + '-' + p.startTokenB} className="mt-3 rounded-xl border border-slate-200 p-3"><div className="flex justify-between gap-2"><b className="text-xs">Passage {i + 1}</b><span className="text-[10px] text-slate-500">{p.matchingWords} matching words</span></div><p className="mt-2 whitespace-pre-wrap text-[11px] text-slate-700">{entry.documentA.text.slice(p.startCharA, p.endCharA)}</p><p className="mt-1 text-[10px] text-slate-400">Original offsets · A {p.startCharA}–{p.endCharA} · B {p.startCharB}–{p.endCharB}</p></div>)}
      </section>
      <section className="tg-report-section">
        <h3 className="text-sm font-bold text-slate-900">6. Algorithm information</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3"><b className="text-xs">Token preprocessing</b><p className="mt-1 text-[11px] text-slate-500">Normalized tokens retain original character offsets for source highlighting.</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><b className="text-xs">Hash table · separate chaining</b><p className="mt-1 text-[11px] text-slate-500">{r.algorithmMetrics.hashTableUniqueFragments} unique fragments indexed; {r.algorithmMetrics.sharedHashFragments} shared.</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><b className="text-xs">Trie vocabulary index</b><p className="mt-1 text-[11px] text-slate-500">{r.algorithmMetrics.trieSharedVocabulary} shared unique vocabulary items.</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><b className="text-xs">Rabin–Karp rolling hash</b><p className="mt-1 text-[11px] text-slate-500">{r.algorithmMetrics.rabinKarpWindowMatches} candidate windows; each hash candidate is token-verified.</p></div>
        </div>
      </section>
      <section className="tg-report-section"><h3 className="text-sm font-bold text-slate-900">7. Execution time</h3><p className="mt-2 text-xs text-slate-600">{entry.elapsedMs.toFixed(3)} ms around the browser TypeScript engine call; excludes upload and report rendering.</p></section>
      <section className="tg-report-section rounded-xl border border-amber-200 bg-amber-50/60 p-4">
        <h3 className="text-sm font-bold text-amber-950">8. Detection limitations</h3>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-5 text-amber-900">
          <li>Detects exact consecutive normalized token sequences at or above the phrase threshold; paraphrases and semantic similarity may be missed.</li>
          <li>Common phrases may match legitimately. Textual overlap is not proof of plagiarism, intent, or misconduct.</li>
          <li>Scores are directional matched-token-position coverage, not an authorship or misconduct judgment.</li>
          <li>Only readable TXT and Markdown content available in this browser session is assessed.</li>
          <li>Results depend on the configured phrase length and extracted source text.</li>
        </ul>
      </section>
      <footer className="border-t border-slate-100 pt-3 text-[10px] text-slate-400">TextGuard · {entry.id} · Report generated from a completed local engine result.</footer>
    </article>
    <p className="tg-no-print text-[10px] text-slate-400">PDF export opens the browser print dialog. Choose “Save as PDF” as the destination to download a PDF copy.</p>
  </div>;
}

export function DetectionHistory({ entries, onDelete }: Props) {
  const [query, setQuery] = useState('');
  const [minimum, setMinimum] = useState('');
  const [maximum, setMaximum] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<HistoryEntry | null>(null);
  const selected = entries.find(entry => entry.id === selectedId) ?? null;
  const min = minimum === '' ? 0 : Number(minimum);
  const max = maximum === '' ? 100 : Number(maximum);
  const invalidRange = !Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max > 100 || min > max;

  const filtered = useMemo(() => {
    if (invalidRange) return [];
    const q = query.trim().toLowerCase();
    return entries.filter(entry => {
      const names = entry.documentA.name.toLowerCase() + ' ' + entry.documentB.name.toLowerCase();
      return (!q || names.includes(q)) && score(entry) >= min && score(entry) <= max;
    }).sort((a, b) => {
      if (sort === 'newest') return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
      if (sort === 'oldest') return new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime();
      return sort === 'similarity-high' ? score(b) - score(a) : score(a) - score(b);
    });
  }, [entries, query, min, max, sort, invalidRange]);

  if (selected) return <Report entry={selected} onBack={() => setSelectedId(null)}/>;

  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold tracking-widest text-indigo-600">COMPLETED ANALYSES</p><h2 className="mt-1 text-lg font-bold text-slate-900">Detection history</h2><p className="mt-1 text-xs text-slate-500">Only successful, completed TypeScript engine runs appear here.</p></div><span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">{entries.length} reports</span></div>
      <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-[10px] leading-5 text-indigo-900"><b>Session-only history:</b> report snapshots remain in this page's memory until reload or close. No localStorage, cloud database, or cross-session persistence is used.</div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_120px_190px]">
        <label className="text-[10px] font-semibold text-slate-600"><span className="mb-1 block">Search document name</span><span className="relative block"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Either document…" className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-xs font-normal"/></span></label>
        <label className="text-[10px] font-semibold text-slate-600"><span className="mb-1 block">Minimum %</span><input type="number" min="0" max="100" value={minimum} onChange={e => setMinimum(e.target.value)} placeholder="0" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-normal"/></label>
        <label className="text-[10px] font-semibold text-slate-600"><span className="mb-1 block">Maximum %</span><input type="number" min="0" max="100" value={maximum} onChange={e => setMaximum(e.target.value)} placeholder="100" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-normal"/></label>
        <label className="text-[10px] font-semibold text-slate-600"><span className="mb-1 block">Sort results</span><select value={sort} onChange={e => setSort(e.target.value as SortMode)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="similarity-high">Similarity high to low</option><option value="similarity-low">Similarity low to high</option></select></label>
      </div>
      {invalidRange && <p role="alert" className="mt-3 text-[11px] text-rose-600">Enter a valid range from 0 to 100; minimum must not exceed maximum.</p>}
    </section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {filtered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="px-4 py-3">Comparison ID</th><th className="px-4 py-3">Document A</th><th className="px-4 py-3">Document B</th><th className="px-4 py-3">Similarity</th><th className="px-4 py-3">Passages</th><th className="px-4 py-3">Analysis date</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(entry => <tr key={entry.id} className="text-xs text-slate-600"><td className="px-4 py-4 font-mono text-[10px]">{entry.id}</td><td className="max-w-[170px] truncate px-4 py-4 font-semibold text-slate-800">{entry.documentA.name}</td><td className="max-w-[170px] truncate px-4 py-4">{entry.documentB.name}</td><td className="px-4 py-4 font-semibold text-indigo-700">{score(entry).toFixed(1)}%</td><td className="px-4 py-4">{entry.result.passages.length}</td><td className="whitespace-nowrap px-4 py-4">{dateLabel(entry.detectedAt)}</td><td className="px-4 py-4"><div className="flex items-center gap-3"><button onClick={() => setSelectedId(entry.id)} className="font-semibold text-indigo-600">View report</button><button aria-label={'Delete comparison ' + entry.id} onClick={() => setDeleteCandidate(entry)} className="text-rose-600"><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div> : <div className="flex min-h-[220px] flex-col items-center justify-center p-7 text-center"><FileSearch size={26} className="text-slate-300"/><p className="mt-3 text-sm font-semibold text-slate-800">{entries.length ? 'No results match these filters' : 'No completed comparisons yet'}</p><p className="mt-1 max-w-md text-xs text-slate-500">{entries.length ? 'Adjust the search or similarity range.' : 'Run a successful comparison first. Only real engine output is recorded.'}</p><button onClick={() => { setQuery(''); setMinimum(''); setMaximum(''); setSort('newest'); }} className="mt-3 text-xs font-semibold text-indigo-600">Clear filters</button></div>}
    </section>
    {deleteCandidate && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="history-delete-title"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-start gap-3"><span className="rounded-xl bg-rose-50 p-2 text-rose-600"><Trash2 size={18}/></span><div><h3 id="history-delete-title" className="text-sm font-bold">Delete comparison report?</h3><p className="mt-2 text-xs leading-5 text-slate-500">Remove {deleteCandidate.id} and its document snapshots from this session? This cannot be undone.</p></div><button onClick={() => setDeleteCandidate(null)} className="ml-auto text-slate-400"><X size={17}/></button></div><div className="mt-5 flex justify-end gap-2"><button onClick={() => setDeleteCandidate(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Cancel</button><button onClick={() => { onDelete(deleteCandidate.id); setDeleteCandidate(null); }} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white">Delete report</button></div></div></div>}
  </div>;
}
