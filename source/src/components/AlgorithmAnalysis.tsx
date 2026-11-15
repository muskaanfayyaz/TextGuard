import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, CheckCircle2, ChevronRight, Code2, GitBranch, Hash, RotateCcw, Search, Sparkles, Table2 } from 'lucide-react';
import { HashTable } from '../algorithms/hashTable';
import { Trie, type TrieSnapshotNode } from '../algorithms/trie';
import { tokenizeDocument } from '../algorithms/preprocessing';
import { rabinKarpWordMatches, traceRabinKarpWindows } from '../algorithms/rabinKarp';

type Tab = 'hash' | 'trie' | 'array' | 'rabin';
const seededFragments = ['quick brown fox', 'brown fox jumps', 'fox jumps over', 'lazy dog runs'];
const seededWords = ['text', 'textual', 'testing', 'team'];

function Pill({ children }: { children: ReactNode }) {
  return <code className="rounded bg-slate-100 px-1.5 py-1 font-mono text-[10px] text-slate-700">{children}</code>;
}
function Heading({ index, title, detail }: { index: string; title: string; detail: string }) {
  return <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-bold text-indigo-700">{index}</span><div><h3 className="font-semibold text-slate-900">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div></div>;
}
function TreeBranch({ node, prefix, activePrefix }: { node: TrieSnapshotNode; prefix: string; activePrefix: string }) {
  return <div className="ml-3 border-l border-slate-200 pl-3">{node.children.map(child => {
    const value = prefix + child.character;
    const active = !!activePrefix && (activePrefix.startsWith(value) || value.startsWith(activePrefix));
    return <div key={value} className="py-1"><span className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${active ? 'border-indigo-300 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-600'}`}><b className="font-mono">{child.character}</b><small className="text-[9px] text-slate-400">{child.terminal ? 'word end' : 'node'}</small></span>{child.children.length > 0 && <TreeBranch node={child} prefix={value} activePrefix={activePrefix} />}</div>;
  })}</div>;
}

function HashLab() {
  const [fragments, setFragments] = useState(seededFragments);
  const [value, setValue] = useState('quick brown fox jumps');
  const [query, setQuery] = useState('brown fox jumps');
  const [message, setMessage] = useState('');
  const size = 7;
  const table = useMemo(() => {
    const instance = new HashTable<string[]>(size);
    fragments.forEach((key, index) => instance.set(key, [...(instance.get(key) ?? []), 'fragment-' + (index + 1)]));
    return instance;
  }, [fragments]);
  const buckets = Array.from({ length: size }, (_, index) => ({
    index,
    entries: table.entries().filter(([key]) => HashTable.hashString(key) % size === index)
  }));
  const collisions = buckets.reduce((sum, bucket) => sum + Math.max(0, bucket.entries.length - 1), 0);
  const insert = () => {
    const key = value.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!key) return;
    setFragments(current => [...current, key]);
    setMessage('Inserted key: ' + key);
    setValue('');
  };
  const find = () => {
    const key = query.trim().replace(/\s+/g, ' ').toLowerCase();
    const found = table.get(key);
    setMessage(found ? 'Found in bucket ' + (HashTable.hashString(key) % size) + ' → ' + found.join(', ') : 'Key not found after searching its bucket chain.');
  };
  return <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
    <div>
      <div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-700">Bucket array · {size} buckets</p><p className="mt-1 text-[10px] text-slate-400">Actual HashTable.hashString(key) % {size}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-semibold text-amber-800">{collisions} collision links</span></div>
      <div className="grid gap-2 sm:grid-cols-2">{buckets.map(bucket => <div key={bucket.index} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"><div className="mb-2 flex justify-between"><b className="font-mono text-[11px] text-slate-500">bucket[{bucket.index}]</b><span className="text-[10px] text-slate-400">{bucket.entries.length} entries</span></div>{bucket.entries.length ? bucket.entries.map(([key, stored], i) => <div key={key} className="mb-1.5 rounded-lg border border-indigo-100 bg-white p-2"><p className="break-words font-mono text-[11px] font-semibold text-slate-800">{key}</p><p className="mt-1 text-[10px] text-slate-400">value: {stored.join(', ')}</p>{i < bucket.entries.length - 1 && <p className="mt-1 text-[9px] font-bold text-amber-700">↓ next chain node</p>}</div>) : <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-center text-[10px] text-slate-400">null · empty</div>}</div>)}</div>
    </div>
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold text-slate-800">Insert text fragment</p><div className="mt-3 flex gap-2"><input value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') insert(); }} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-xs" placeholder="Enter fragment" /><button onClick={insert} className="rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white">Insert</button></div><p className="mt-2 text-[10px] text-slate-500">Calls the actual <Pill>HashTable.set()</Pill>; duplicate keys update their value.</p></div>
      <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold text-slate-800">Lookup exact key</p><div className="mt-3 flex gap-2"><input value={query} onChange={e => setQuery(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-xs" placeholder="Fragment to find" /><button onClick={find} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700">Find</button></div><p role="status" className="mt-3 min-h-5 text-[11px] text-slate-600">{message}</p><p className="mt-2 text-[10px] text-slate-400">{table.size} unique keys stored · implementation: src/algorithms/hashTable.ts</p></div>
      <button onClick={() => { setFragments(seededFragments); setMessage(''); }} className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-500"><RotateCcw size={13} /> Reset example</button>
    </div>
  </div>;
}

function TrieLab() {
  const [words, setWords] = useState(seededWords);
  const [word, setWord] = useState('teamwork');
  const [step, setStep] = useState(0);
  const [prefix, setPrefix] = useState('te');
  const [message, setMessage] = useState('');
  const current = word.trim().toLowerCase();
  const treeWords = step > 0 && step < current.length ? [...words, current.slice(0, step)] : words;
  const trie = useMemo(() => { const instance = new Trie(); treeWords.forEach(item => instance.insert(item)); return instance; }, [treeWords]);
  const prefixTrie = useMemo(() => { const instance = new Trie(); words.forEach(item => instance.insert(item)); return instance; }, [words]);
  const begin = () => { if (current) { setStep(0); setMessage('Ready to insert ' + current + '. Advance one character at a time.'); } };
  const advance = () => {
    if (!current || step >= current.length) return;
    const next = step + 1;
    setStep(next);
    if (next === current.length) {
      setWords(existing => existing.includes(current) ? existing : [...existing, current]);
      setMessage('Completed insertion of "' + current + '" using Trie.insert().');
    } else setMessage('Traversed "' + current[next - 1] + '" · current prefix: ' + current.slice(0, next));
  };
  const results = prefix.trim() ? prefixTrie.prefixSearch(prefix.trim()) : [];
  return <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div className="flex justify-between"><div><p className="text-xs font-semibold text-slate-800">Trie tree snapshot</p><p className="mt-1 text-[10px] text-slate-500">Actual Trie.snapshot() · shared prefixes share nodes</p></div><span className="text-[10px] text-slate-400">{words.length} complete words</span></div><div className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-slate-200 bg-white p-4"><span className="inline-block rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-bold text-white">ROOT</span><TreeBranch node={trie.snapshot()} prefix="" activePrefix={step > 0 ? current.slice(0, step) : prefix.trim().toLowerCase()} /></div>{step > 0 && step < current.length && <div className="mt-3 rounded-lg bg-indigo-50 p-3 text-[11px] text-indigo-800">Insertion path: {current.slice(0, step).split('').map((char, i) => <span key={i} className="mx-0.5 inline-flex h-6 w-6 items-center justify-center rounded bg-indigo-600 font-mono font-bold text-white">{char}</span>)} · next: {current[step]}</div>}</div>
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold text-slate-800">Character-by-character insertion</p><input value={word} onChange={e => { setWord(e.target.value.replace(/[^a-zA-Z]/g, '')); setStep(0); setMessage(''); }} className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs" placeholder="Enter word" /><div className="mt-3 flex flex-wrap gap-2"><button onClick={begin} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold">Start insertion</button><button onClick={advance} disabled={!current || step >= current.length} className="rounded-lg bg-indigo-600 px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-40"><ChevronRight size={12} className="mr-1 inline" /> Next character</button></div><div className="mt-3 flex flex-wrap gap-1">{current.split('').map((char, i) => <span key={i} className={`flex h-8 w-8 items-center justify-center rounded border font-mono text-xs font-bold ${i < step ? 'border-indigo-300 bg-indigo-100 text-indigo-800' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>{char}</span>)}</div><p role="status" className="mt-3 text-[11px] text-slate-600">{message}</p></div>
      <div className="rounded-xl border border-slate-200 p-4"><p className="flex items-center gap-2 text-xs font-semibold text-slate-800"><Search size={14} /> Prefix search</p><input value={prefix} onChange={e => setPrefix(e.target.value)} className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs" placeholder="e.g. te" /><div className="mt-3 flex flex-wrap gap-2">{results.length ? results.map(item => <span key={item} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">{item}</span>) : <span className="text-[11px] text-slate-400">No words found.</span>}</div><p className="mt-3 text-[10px] text-slate-500">Results come from <Pill>Trie.prefixSearch()</Pill>.</p></div>
      <button onClick={() => { setWords(seededWords); setStep(0); setMessage(''); }} className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-500"><RotateCcw size={13} /> Reset Trie</button>
    </div>
  </div>;
}

function ArrayLab() {
  const [sourceA, setSourceA] = useState('The quick brown fox jumps over the lazy dog');
  const [sourceB, setSourceB] = useState('A quick brown fox jumps over a small fence');
  const [size, setSize] = useState(3);
  const a = useMemo(() => tokenizeDocument(sourceA), [sourceA]);
  const b = useMemo(() => tokenizeDocument(sourceB), [sourceB]);
  const matches = useMemo(() => rabinKarpWordMatches(a.tokens, b.tokens, size), [a, b, size]);
  const positionsA = new Set(matches.flatMap(match => Array.from({ length: match.length }, (_, i) => match.startA + i)));
  const positionsB = new Set(matches.flatMap(match => Array.from({ length: match.length }, (_, i) => match.startB + i)));
  return <div className="space-y-4">
    <div className="grid gap-3 md:grid-cols-2"><label className="text-[11px] font-semibold text-slate-600">Sample document A<textarea rows={3} value={sourceA} onChange={e => setSourceA(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-xs leading-5" /></label><label className="text-[11px] font-semibold text-slate-600">Sample document B<textarea rows={3} value={sourceB} onChange={e => setSourceB(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-xs leading-5" /></label></div>
    <div className="flex flex-wrap items-center gap-3"><label className="text-[11px] font-semibold text-slate-600">Window size <select value={size} onChange={e => setSize(Number(e.target.value))} className="ml-2 rounded-lg border border-slate-200 px-2 py-2">{[2,3,4,5].map(n => <option key={n} value={n}>{n} tokens</option>)}</select></label><span className="text-[10px] text-slate-500">{matches.length} exact windows returned by Rabin–Karp</span></div>
    <div className="grid gap-4 xl:grid-cols-2">{[{label:'Array A',tokens:a.tokens,matched:positionsA},{label:'Array B',tokens:b.tokens,matched:positionsB}].map(array => <div key={array.label} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 p-3"><div className="mb-3 flex justify-between"><p className="text-xs font-semibold text-slate-800">{array.label} · {array.tokens.length} tokens</p><span className="text-[9px] text-slate-400">[index] value · char offsets</span></div><div className="flex flex-wrap gap-2">{array.tokens.map(token => <div key={token.index} className={`min-w-[64px] rounded-lg border p-2 text-center ${array.matched.has(token.index) ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}><p className="font-mono text-[9px] text-slate-400">[{token.index}]</p><p className="mt-1 break-all text-[11px] font-semibold text-slate-700">{token.value}</p><p className="mt-1 text-[9px] text-slate-400">{token.start}:{token.end}</p></div>)}</div></div>)}</div>
    <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold text-slate-800">Verified matching array windows</p><p className="mt-1 text-[10px] text-slate-500">Green cells belong to exact matching sequences. Indexes are zero-based; offsets refer to original source text.</p><div className="mt-3 space-y-2">{matches.slice(0,10).map((match,i) => <div key={i} className="rounded-lg bg-emerald-50 p-2 text-[10px] text-emerald-900"><CheckCircle2 size={12} className="mr-1 inline" /> Match {i+1}: A[{match.startA}…{match.startA+match.length-1}] ↔ B[{match.startB}…{match.startB+match.length-1}] · {match.length} words</div>)}{!matches.length && <p className="text-[11px] text-slate-400">No exact sequence found at this window size.</p>}</div></div>
  </div>;
}

function RabinLab() {
  const [source, setSource] = useState('the quick brown fox jumps over the lazy dog');
  const [pattern, setPattern] = useState('brown fox jumps');
  const [index, setIndex] = useState(0);
  const trace = useMemo(() => {
    const textTokens = tokenizeDocument(source).tokens;
    const patternTokens = tokenizeDocument(pattern).tokens;
    return { textTokens, patternTokens, windows: traceRabinKarpWindows(textTokens, patternTokens), matches: patternTokens.length ? rabinKarpWordMatches(textTokens, patternTokens, patternTokens.length) : [] };
  }, [source, pattern]);
  const selectedIndex = Math.min(index, Math.max(0, trace.windows.length - 1));
  const selected = trace.windows[selectedIndex];
  return <div className="space-y-4">
    <div className="grid gap-3 md:grid-cols-2"><label className="text-[11px] font-semibold text-slate-600">Text<textarea rows={2} value={source} onChange={e => { setSource(e.target.value); setIndex(0); }} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-xs" /></label><label className="text-[11px] font-semibold text-slate-600">Search pattern<textarea rows={2} value={pattern} onChange={e => { setPattern(e.target.value); setIndex(0); }} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-xs" /></label></div>
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-semibold text-slate-800">Sliding token window · {trace.patternTokens.length} tokens</p><span className="text-[10px] text-slate-500">{trace.windows.length} candidate windows</span></div><div className="mt-3 flex flex-wrap gap-2">{trace.textTokens.map((token,i) => { const inside=!!selected && i>=selected.start && i<selected.start+trace.patternTokens.length; return <button key={i} onClick={() => setIndex(Math.min(i,Math.max(0,trace.windows.length-1)))} className={`rounded-lg border px-2.5 py-2 ${inside ? selected.verified ? 'border-emerald-400 bg-emerald-100' : 'border-indigo-300 bg-indigo-100' : 'border-slate-200 bg-white'}`}><span className="block text-[9px] text-slate-400">[{i}]</span><span className="font-mono text-[11px] font-semibold text-slate-800">{token.value}</span></button>; })}</div><div className="mt-3 flex gap-2"><button disabled={!selected || selectedIndex===0} onClick={() => setIndex(v=>Math.max(0,v-1))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] disabled:opacity-40">Previous window</button><button disabled={!selected || selectedIndex>=trace.windows.length-1} onClick={() => setIndex(v=>Math.min(trace.windows.length-1,v+1))} className="rounded-lg bg-indigo-600 px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-40">Next window</button></div></div>
    {selected ? <div className="grid gap-3 md:grid-cols-2"><div className="rounded-xl border border-slate-200 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current window</p><p className="mt-2 font-mono text-xs text-slate-800">{trace.textTokens.slice(selected.start,selected.start+trace.patternTokens.length).map(t=>t.value).join(' ')}</p><p className="mt-2 text-[10px] text-slate-500">Start token index: {selected.start}</p></div><div className="rounded-xl border border-slate-200 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rolling hash calculation</p><p className="mt-2 font-mono text-xs">H(window) = {selected.windowHash}</p><p className="mt-1 font-mono text-xs">H(pattern) = {selected.patternHash}</p><p className={`mt-2 text-[11px] font-semibold ${selected.hashMatch?'text-amber-700':'text-slate-500'}`}>{selected.hashMatch?'Hash candidate found · verify token values':'Hash differs · reject window'}</p><p className={`mt-1 text-[11px] font-semibold ${selected.verified?'text-emerald-700':'text-slate-500'}`}>{selected.verified?'Exact token verification: PASS':selected.hashMatch?'Exact token verification: FAIL (collision)':'Exact verification not required'}</p></div></div> : <p className="rounded-xl border border-dashed border-slate-200 p-5 text-xs text-slate-500">Enter a non-empty pattern and text long enough for one complete window.</p>}
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4"><p className="text-xs font-semibold text-indigo-950">Why verify a hash match?</p><p className="mt-1 text-[11px] leading-5 text-indigo-900">Different token sequences can share a numeric hash. Rabin–Karp compares actual normalized token values after a hash match; hash equality alone never proves a passage match.</p><p className="mt-2 text-[10px] text-indigo-700">Verified results from rabinKarpWordMatches(): {trace.matches.length} · BASE = 257 · MOD = 1,000,003.</p></div>
  </div>;
}

const complexity = [
  {name:'Hash table · separate chaining',best:'O(1)',average:'O(1)',worst:'O(n)',space:'O(B + n)',note:'Expected constant-time set/get with well-distributed keys; a long bucket chain can require scanning n entries.'},
  {name:'Trie · word length L',best:'O(L)',average:'O(L)',worst:'O(L)',space:'O(total characters)',note:'Insertion and exact lookup traverse one node per character. Prefix enumeration also visits nodes in the matching subtree.'},
  {name:'Token array preprocessing',best:'O(C)',average:'O(C)',worst:'O(C)',space:'O(T)',note:'A Unicode-aware scan processes C source characters and stores T tokens plus original character offsets.'},
  {name:'Rabin–Karp · n, m, w',best:'O(n + m)',average:'O(n + m + c·w)',worst:'O(n·m·w)',space:'O(m)',note:'n and m are token counts, w is pattern length, and c is equal-hash candidates requiring exact verification.'}
];
function Complexity() {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><div className="flex items-center gap-2"><Activity size={17} className="text-indigo-600"/><h3 className="font-semibold text-slate-900">Algorithm complexity reference</h3></div><p className="mt-1 text-xs text-slate-500">Bounds reflect the code in this project, with bounded average token-hash cost.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-[11px]"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr>{['Algorithm','Best case','Average case','Worst case','Space','Explanation'].map(x=><th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{complexity.map(row=><tr key={row.name} className="align-top"><td className="px-4 py-4 font-semibold text-slate-800">{row.name}</td><td className="px-4 py-4 font-mono text-emerald-700">{row.best}</td><td className="px-4 py-4 font-mono text-indigo-700">{row.average}</td><td className="px-4 py-4 font-mono text-rose-700">{row.worst}</td><td className="px-4 py-4 font-mono">{row.space}</td><td className="max-w-xs px-4 py-4 leading-5 text-slate-500">{row.note}</td></tr>)}</tbody></table></div><p className="border-t border-slate-100 px-5 py-3 text-[10px] leading-5 text-slate-400">B = bucket count · n/m = token or entry counts · C = source character count · T = token count · L = word length · c = equal-hash candidates · w = pattern window length.</p></section>;
}

const tabs: Array<{id:Tab;label:string;detail:string;icon:typeof Hash}> = [
  {id:'hash',label:'Hash Table',detail:'Separate chaining',icon:Hash},
  {id:'trie',label:'Trie',detail:'Prefix tree',icon:GitBranch},
  {id:'array',label:'Token Arrays',detail:'Indexed sequences',icon:Table2},
  {id:'rabin',label:'Rabin–Karp',detail:'Rolling hash',icon:Search}
];
export function AlgorithmAnalysis() {
  const [tab,setTab] = useState<Tab>('hash');
  const current = tabs.find(item=>item.id===tab)!;
  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white sm:p-8"><div className="relative z-10 max-w-3xl"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold tracking-widest text-indigo-200"><Sparkles size={13}/> INTERACTIVE DSA LAB</span><h2 className="mt-4 text-2xl font-bold sm:text-3xl">Explore how TextGuard detects matching text.</h2><p className="mt-3 text-sm leading-6 text-slate-300">Operate the same TypeScript data structures and search routines used by the detection engine. Step through insertions, inspect buckets, and watch rolling windows.</p><div className="mt-5 flex flex-wrap gap-2 text-[10px] text-slate-300"><span className="rounded-full border border-white/15 px-3 py-1.5">Real source modules</span><span className="rounded-full border border-white/15 px-3 py-1.5">No fabricated matches</span><span className="rounded-full border border-white/15 px-3 py-1.5">University demo mode</span></div></div><div className="absolute -right-12 -top-16 h-64 w-64 rounded-full border border-white/10"/><div className="absolute -right-2 -top-6 h-44 w-44 rounded-full border border-indigo-300/15"/></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><div className="grid grid-cols-2 gap-2 xl:grid-cols-4">{tabs.map(item=>{const Icon=item.icon;const selected=tab===item.id;return <button key={item.id} onClick={()=>setTab(item.id)} className={`flex items-center gap-3 rounded-xl border p-3 text-left ${selected?'border-indigo-200 bg-indigo-50 text-indigo-800':'border-transparent text-slate-600 hover:bg-slate-50'}`}><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${selected?'bg-indigo-600 text-white':'bg-slate-100 text-slate-500'}`}><Icon size={17}/></span><span><span className="block text-xs font-semibold">{item.label}</span><span className="mt-1 block text-[10px] opacity-65">{item.detail}</span></span></button>;})}</div></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Heading index={'0'+(tabs.findIndex(item=>item.id===tab)+1)} title={current.label} detail={current.detail+' · interactive view from implemented TypeScript module'}/><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-semibold text-emerald-700"><CheckCircle2 size={12} className="mr-1 inline"/> Actual implementation</span></div>{tab==='hash'&&<HashLab/>}{tab==='trie'&&<TrieLab/>}{tab==='array'&&<ArrayLab/>}{tab==='rabin'&&<RabinLab/>}</section>
    <Complexity/>
    <section className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4"><div className="flex items-start gap-2"><Code2 size={16} className="mt-0.5 shrink-0 text-indigo-700"/><div><p className="text-xs font-semibold text-indigo-950">How the algorithms work together</p><p className="mt-1 text-[11px] leading-5 text-indigo-900">Preprocessing creates normalized token arrays while preserving source offsets. The custom hash table indexes exact fragments and their occurrences. The Trie tracks vocabulary and prefixes. Rabin–Karp slides a fixed-size token window, uses rolling hashes to find candidates, and verifies every hash candidate against actual token values before the engine reports a match.</p></div></div></section>
  </div>;
}
