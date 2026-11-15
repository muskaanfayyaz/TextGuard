import { useEffect, useMemo, useState } from 'react';
import { api, auth } from '@appdeploy/client';
import { AuthGate } from './components/AuthGate';
import { ProfilePage } from './components/ProfilePage';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, BookOpen,
  CalendarDays, CheckCircle2, ChevronDown, Clock3, FileCheck2, FileSearch,
  Files, FlaskConical, FolderOpen, LayoutDashboard, Menu, Search, ShieldCheck,
  UploadCloud, UserRound, X, ChartNoAxesColumnIncreasing, Plus, RefreshCw
} from 'lucide-react';
import { Sidebar, type SectionId } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { EmptyState } from './components/EmptyState';
import { UploadModule, type UploadedDocument } from './components/UploadModule';
import { SimilarityChecker } from './components/SimilarityChecker';
import { ComparisonResults, type ComparisonRun } from './components/ComparisonResults';
import { AlgorithmAnalysis } from './components/AlgorithmAnalysis';
import { DetectionHistory, type HistoryEntry } from './components/DetectionHistory';

type ServiceStatus = { status: string; detectionEngine: string; message: string };
type DocumentRecord = { id: string; name: string; createdAt: string };
type ComparisonRecord = {
  id: string;
  documentName: string;
  comparedAgainst: string;
  similarity: number;
  detectedAt: string;
  status: 'completed' | 'review' | 'failed';
};
type DashboardData = {
  documents: DocumentRecord[];
  comparisons: ComparisonRecord[];
};
type Stats = {
  totalDocuments: number;
  totalComparisons: number;
  averageSimilarity: number | null;
  highSimilarityMatches: number;
  distribution: { low: number; moderate: number; high: number; veryHigh: number };
};

const sectionMeta: Record<SectionId, { title: string; eyebrow: string; description: string }> = {
  overview: { title: 'Overview', eyebrow: 'WORKSPACE', description: 'Your document analysis activity, insights, and shortcuts.' },
  upload: { title: 'Upload documents', eyebrow: 'DOCUMENT INTAKE', description: 'Add TXT and Markdown source files for local document analysis.' },
  library: { title: 'Document library', eyebrow: 'YOUR FILES', description: 'A central place for the documents you add and prepare for comparison.' },
  checker: { title: 'Similarity checker', eyebrow: 'COMPARE', description: 'Run local DSA comparisons and inspect verified matching passages across your uploaded documents.' },
  results: { title: 'Comparison results', eyebrow: 'REPORTS', description: 'Review similarity scores and matched text side by side after a comparison is run.' },
  algorithms: { title: 'Algorithm analysis', eyebrow: 'UNDER THE HOOD', description: 'Explore the implemented classical data structures and algorithms behind document comparison.' },
  history: { title: 'Detection history', eyebrow: 'ACTIVITY', description: 'A chronological record of completed comparisons will appear here.' },
  about: { title: 'About TextGuard', eyebrow: 'PROJECT NOTES', description: 'A transparent, algorithm-first document similarity project.' },
  profile: { title: 'Account Profile', eyebrow: 'YOUR ACCOUNT', description: 'Manage your account details and secure sign-in session.' }
};

const emptyDashboard: DashboardData = { documents: [], comparisons: [] };

type WorkspaceSessionSnapshot = {
  uploadedDocuments: UploadedDocument[];
  comparisonRuns: ComparisonRun[];
  historyEntries: HistoryEntry[];
  selectedComparisonId: string | null;
};

const WORKSPACE_SESSION_KEY = 'textguard-workspace-session-v1';

function readWorkspaceSession(): WorkspaceSessionSnapshot {
  const empty: WorkspaceSessionSnapshot = {
    uploadedDocuments: [],
    comparisonRuns: [],
    historyEntries: [],
    selectedComparisonId: null
  };
  try {
    if (typeof window === 'undefined') return empty;
    const raw = window.sessionStorage.getItem(WORKSPACE_SESSION_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<WorkspaceSessionSnapshot>;
    return {
      uploadedDocuments: Array.isArray(parsed.uploadedDocuments) ? parsed.uploadedDocuments : [],
      comparisonRuns: Array.isArray(parsed.comparisonRuns) ? parsed.comparisonRuns : [],
      historyEntries: Array.isArray(parsed.historyEntries) ? parsed.historyEntries : [],
      selectedComparisonId: typeof parsed.selectedComparisonId === 'string' ? parsed.selectedComparisonId : null
    };
  } catch {
    return empty;
  }
}

function calculateStats(data: DashboardData): Stats {
  const comparisons = data.comparisons;
  const totalSimilarity = comparisons.reduce((sum, item) => sum + item.similarity, 0);
  return {
    totalDocuments: data.documents.length,
    totalComparisons: comparisons.length,
    averageSimilarity: comparisons.length ? totalSimilarity / comparisons.length : null,
    highSimilarityMatches: comparisons.filter(item => item.similarity >= 41).length,
    distribution: {
      low: comparisons.filter(item => item.similarity >= 0 && item.similarity <= 20).length,
      moderate: comparisons.filter(item => item.similarity > 20 && item.similarity <= 40).length,
      high: comparisons.filter(item => item.similarity > 40 && item.similarity <= 70).length,
      veryHigh: comparisons.filter(item => item.similarity > 70 && item.similarity <= 100).length
    }
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatCard({ label, value, helper, icon: Icon, accent }: {
  label: string; value: string; helper: string; icon: typeof Files; accent: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.025] transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`rounded-xl p-2.5 ${accent}`}><Icon size={19} /></span>
      </div>
      {value === '…' ? <div className="skeleton mt-4 h-9 w-24 rounded-lg" role="status" aria-label="Loading metric" /> : <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{value}</p>}
      <p className="mt-1.5 text-xs text-slate-500">{helper}</p>
    </article>
  );
}

function Distribution({ stats }: { stats: Stats }) {
  const total = stats.totalComparisons;
  const groups = [
    { key: 'low', label: 'Low', range: '0–20%', value: stats.distribution.low, color: 'bg-emerald-500', tint: 'bg-emerald-50 text-emerald-700' },
    { key: 'moderate', label: 'Moderate', range: '21–40%', value: stats.distribution.moderate, color: 'bg-sky-500', tint: 'bg-sky-50 text-sky-700' },
    { key: 'high', label: 'High', range: '41–70%', value: stats.distribution.high, color: 'bg-amber-500', tint: 'bg-amber-50 text-amber-700' },
    { key: 'veryHigh', label: 'Very high', range: '71–100%', value: stats.distribution.veryHigh, color: 'bg-rose-500', tint: 'bg-rose-50 text-rose-700' }
  ];
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="font-semibold text-slate-900">Similarity distribution</h3><p className="mt-1 text-xs text-slate-500">Comparisons grouped by their calculated similarity score</p></div>
        <span className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-500">{total} total</span>
      </div>
      {total === 0 ? (
        <div className="mt-6 flex min-h-[190px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-indigo-500 shadow-sm"><ChartNoAxesColumnIncreasing size={22} /></span>
          <p className="mt-3 text-sm font-semibold text-slate-700">No similarity data yet</p>
          <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Run your first document comparison to see how results are distributed across these ranges.</p>
        </div>
      ) : (
        <div className="mt-7 space-y-5">
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" aria-label="Similarity distribution chart">
            {groups.map(group => <div key={group.key} className={group.color} style={{ width: `${(group.value / total) * 100}%` }} title={`${group.label}: ${group.value}`} />)}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.map(group => <div key={group.key} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-2.5"><span className={`h-2.5 w-2.5 rounded-full ${group.color}`} /><div><p className="text-sm font-medium text-slate-700">{group.label}</p><p className="text-[11px] text-slate-400">{group.range}</p></div></div>
              <div className="text-right"><p className="text-sm font-bold tabular-nums text-slate-800">{group.value}</p><p className="text-[10px] text-slate-400">{((group.value / total) * 100).toFixed(0)}%</p></div>
            </div>)}
          </div>
        </div>
      )}
    </section>
  );
}

function RecentAnalysis({ comparisons, onNavigate }: { comparisons: ComparisonRecord[]; onNavigate: (id: SectionId) => void }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
        <div><h3 className="font-semibold text-slate-900">Recent analysis</h3><p className="mt-1 text-xs text-slate-500">Your latest document comparisons</p></div>
        <button onClick={() => onNavigate('history')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700">View history <ArrowRight size={14} /></button>
      </div>
      {comparisons.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-9 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><FileSearch size={23} /></div>
          <h4 className="mt-4 text-sm font-semibold text-slate-800">Your analysis activity will appear here</h4>
          <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">Once you compare documents, this table will show the files, similarity score, detection date, and report status.</p>
          <button onClick={() => onNavigate('checker')} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700">Start an analysis <ArrowRight size={14} /></button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="px-6 py-3">Document name</th><th className="px-6 py-3">Compared against</th><th className="px-6 py-3">Similarity</th><th className="px-6 py-3">Detection date</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{comparisons.slice(0, 8).map(item => <tr key={item.id} className="text-xs text-slate-600 hover:bg-slate-50/70">
              <td className="px-6 py-4 font-semibold text-slate-800">{item.documentName}</td><td className="px-6 py-4">{item.comparedAgainst}</td>
              <td className="px-6 py-4"><span className="font-semibold tabular-nums text-slate-800">{item.similarity.toFixed(1)}%</span></td><td className="px-6 py-4">{formatDate(item.detectedAt)}</td>
              <td className="px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${item.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : item.status === 'review' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>{item.status === 'completed' ? 'Completed' : item.status === 'review' ? 'Review needed' : 'Failed'}</span></td>
              <td className="px-6 py-4"><button onClick={() => onNavigate('results')} className="font-semibold text-indigo-600 hover:text-indigo-800">View report</button></td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Overview({ data, loading, errorMessage, onNavigate }: {
  data: DashboardData; loading: boolean; errorMessage: string | null; onNavigate: (id: SectionId) => void;
}) {
  const stats = useMemo(() => calculateStats(data), [data]);
  return (
    <div className="space-y-6">
      <section className="hero-panel relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-white/75 px-3 py-1.5 text-[10px] font-bold tracking-wider text-indigo-700"><ShieldCheck size={13} /> YOUR DOCUMENT WORKSPACE</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Welcome to TextGuard.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">Analyze documents, detect matching passages, and measure originality.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => onNavigate('checker')} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700"><Plus size={17} /> Start New Analysis</button>
            <button onClick={() => onNavigate('upload')} className="inline-flex items-center gap-2 rounded-xl border border-white/90 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"><UploadCloud size={17} /> Upload Documents</button>
          </div>
        </div>
        <div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
        <div className="absolute bottom-7 right-8 hidden h-32 w-32 items-center justify-center rounded-[2rem] border border-white/80 bg-white/55 shadow-xl shadow-indigo-900/5 backdrop-blur lg:flex"><div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30"><FileSearch size={34} strokeWidth={1.5} /></div></div>
      </section>

      {errorMessage && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"><span>{errorMessage} Showing the last available dashboard state.</span><button onClick={() => onNavigate('overview')} className="font-semibold underline">Dismiss</button></div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Documents" value={loading ? '…' : String(stats.totalDocuments)} helper={stats.totalDocuments ? 'Documents in your workspace' : 'No documents added yet'} icon={Files} accent="bg-indigo-50 text-indigo-600" />
        <StatCard label="Total Comparisons" value={loading ? '…' : String(stats.totalComparisons)} helper={stats.totalComparisons ? 'Completed comparison records' : 'No comparisons run yet'} icon={FileCheck2} accent="bg-violet-50 text-violet-600" />
        <StatCard label="Average Similarity" value={loading ? '…' : stats.averageSimilarity === null ? '—' : `${stats.averageSimilarity.toFixed(1)}%`} helper={stats.averageSimilarity === null ? 'Available after your first comparison' : 'Across all recorded comparisons'} icon={Activity} accent="bg-sky-50 text-sky-600" />
        <StatCard label="High Similarity Matches" value={loading ? '…' : String(stats.highSimilarityMatches)} helper="Comparisons scoring above 40%" icon={ChartNoAxesColumnIncreasing} accent="bg-amber-50 text-amber-600" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <RecentAnalysis comparisons={data.comparisons} onNavigate={onNavigate} />
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2"><span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Activity size={18} /></span><div><h3 className="font-semibold text-slate-900">Quick actions</h3><p className="mt-0.5 text-xs text-slate-500">Jump into your workflow</p></div></div>
          <div className="mt-5 space-y-2.5">
            <QuickAction icon={UploadCloud} title="Upload a Document" description="Add a file to your library" onClick={() => onNavigate('upload')} />
            <QuickAction icon={FileSearch} title="Compare Documents" description="Start a new similarity check" onClick={() => onNavigate('checker')} />
            <QuickAction icon={FlaskConical} title="View Algorithm Analysis" description="See how detection is designed" onClick={() => onNavigate('algorithms')} />
          </div>
        </div>
      </section>

      <Distribution stats={stats} />
      <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3"><div className="flex items-center gap-2 text-xs text-indigo-800"><ShieldCheck size={15} /><span>Similarity metrics are calculated from recorded comparison results. No sample data is included.</span></div><span className="hidden text-[10px] font-semibold text-indigo-500 sm:inline">DATA TRANSPARENCY</span></div>
    </div>
  );
}

function QuickAction({ icon: Icon, title, description, onClick }: { icon: typeof Files; title: string; description: string; onClick: () => void }) {
  return <button onClick={onClick} className="group flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-indigo-100 hover:bg-indigo-50/50"><span className="rounded-xl bg-slate-50 p-2.5 text-slate-500 transition group-hover:bg-white group-hover:text-indigo-600"><Icon size={18} /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-800">{title}</span><span className="mt-1 block text-[11px] text-slate-500">{description}</span></span><ArrowRight size={15} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" /></button>;
}

function SectionContent({ section, onNavigate, documents, comparisons, selectedComparisonId, onComparisonComplete, history, onDeleteHistory }: { section: SectionId; onNavigate: (id: SectionId) => void; documents: UploadedDocument[]; comparisons: ComparisonRun[]; selectedComparisonId: string | null; onComparisonComplete: (runs: ComparisonRun[], runId: string, openReport: boolean) => void; history: HistoryEntry[]; onDeleteHistory: (id: string) => void }) {
  if (section === 'library') return documents.length ? <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h3 className="font-semibold text-slate-900">Session documents</h3><p className="mt-1 text-xs text-slate-500">These files are available until this browser session ends.</p></div><div className="divide-y divide-slate-100">{documents.map(doc => <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{doc.name}</p><p className="mt-1 text-xs text-slate-500">{doc.wordCount.toLocaleString()} words · {doc.characterCount.toLocaleString()} characters · {doc.type}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">Ready</span></div>)}</div></div> : <EmptyState icon={FolderOpen} title="Your library is empty" description="Upload TXT or MD documents to see them organized here for this session." actionLabel="Upload documents" onAction={() => onNavigate('upload')} />;
  if (section === 'checker') return <SimilarityChecker documents={documents} onUpload={() => onNavigate('upload')} onComparisonComplete={onComparisonComplete} />;
  if (section === 'results') return <ComparisonResults documents={documents} comparisons={comparisons} selectedComparisonId={selectedComparisonId} onBack={() => onNavigate('checker')} />;
  if (section === 'history') return <DetectionHistory entries={history} onDelete={onDeleteHistory} />;
  if (section === 'overview') return null;
  if (section === 'overview') return null;
  if (section === 'algorithms') return <AlgorithmAnalysis />;
    if (section === 'profile') return <ProfilePage onLogout={async () => { await auth.signOut(); window.location.reload(); }} />;
  if (section === 'about') return <div className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"><span className="inline-flex rounded-2xl bg-indigo-600 p-3 text-white"><ShieldCheck size={25} /></span><h3 className="mt-5 text-xl font-bold text-slate-900">Explainable by design.</h3><p className="mt-3 text-sm leading-7 text-slate-600">TextGuard is a document similarity and plagiarism-detection project built around classical Data Structures and Algorithms. It is designed to surface matching passages and make the comparison process understandable rather than relying on an external AI model.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current release</p><p className="mt-2 font-semibold text-slate-800">Classical DSA comparison engine</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Detection engine</p><p className="mt-2 font-semibold text-slate-800">Local browser computation · No AI API</p></div></div></div>;
  const config: Record<Exclude<SectionId, 'overview' | 'algorithms' | 'about'>, { icon: typeof Files; title: string; body: string; action: string; target: SectionId }> = {
    upload: { icon: UploadCloud, title: 'Document upload is planned for the next phase', body: 'The dashboard is connected to the project data endpoint, but file intake and secure document storage are not active yet.', action: 'View document library', target: 'library' },
    library: { icon: FolderOpen, title: 'Your library is empty', body: 'Documents added in a future upload phase will be organized here.', action: 'Go to upload documents', target: 'upload' },
    checker: { icon: FileSearch, title: 'The comparison engine is not active yet', body: 'The analysis workflow will be enabled after document intake and the classical DSA detection engine are implemented.', action: 'Explore algorithm analysis', target: 'algorithms' },
    results: { icon: FileCheck2, title: 'No comparison reports yet', body: 'Completed comparisons will appear here with similarity percentages and highlighted matching passages.', action: 'Go to overview', target: 'overview' },
    history: { icon: Clock3, title: 'No activity to show', body: 'Your completed document comparisons will be listed here. There is no detection history yet.', action: 'Go to overview', target: 'overview' }
  };
  const item = config[section as keyof typeof config];
  return <EmptyState icon={item.icon} title={item.title} description={item.body} actionLabel={item.action} onAction={() => onNavigate(item.target)} />;
}

function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ userId: string; email?: string; name?: string } | null>(null);
  const [authError, setAuthError] = useState('');
  const [sessionSnapshot] = useState<WorkspaceSessionSnapshot>(() => readWorkspaceSession());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>(sessionSnapshot.uploadedDocuments);
  const [comparisonRuns, setComparisonRuns] = useState<ComparisonRun[]>(sessionSnapshot.comparisonRuns);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>(sessionSnapshot.historyEntries);
  const [selectedComparisonId, setSelectedComparisonId] = useState<string | null>(sessionSnapshot.selectedComparisonId);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function restoreSession() {
      try {
        const user = await auth.getUser();
        if (!mounted) return;
        setCurrentUser(user ? { userId: user.userId, email: user.email, name: user.name } : null);
        if (user) {
          const [statusResponse, dashboardResponse] = await Promise.all([
            api.get('/api/project/status'),
            api.get('/api/dashboard')
          ]);
          if (!mounted) return;
          setServiceStatus(statusResponse.data as ServiceStatus);
          const payload = dashboardResponse.data as DashboardData;
          setDashboard({ documents: Array.isArray(payload.documents) ? payload.documents : [], comparisons: Array.isArray(payload.comparisons) ? payload.comparisons : [] });
          setDashboardError(null);
        }
      } catch {
        if (mounted) {
          setAuthError('Your secure session could not be restored. Please retry sign-in.');
          setDashboardError('Dashboard data could not be loaded.');
        }
      } finally {
        if (mounted) { setAuthReady(true); setDashboardLoading(false); }
      }
    }
    restoreSession();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    if (!currentUser) return;
    try {
      window.sessionStorage.setItem(WORKSPACE_SESSION_KEY, JSON.stringify({
        uploadedDocuments,
        comparisonRuns,
        historyEntries,
        selectedComparisonId
      } satisfies WorkspaceSessionSnapshot));
    } catch (storageError) {
      console.warn('TextGuard could not persist the full workspace session in this browser tab.', storageError);
    }
  }, [currentUser, uploadedDocuments, comparisonRuns, historyEntries, selectedComparisonId]);

  const meta = sectionMeta[activeSection];
  const signOut = async () => {
    await auth.signOut();
    setCurrentUser(null);
    setUploadedDocuments([]);
    setComparisonRuns([]);
    setHistoryEntries([]);
    setSelectedComparisonId(null);
    window.sessionStorage.removeItem(WORKSPACE_SESSION_KEY);
    setActiveSection('overview');
  };
  if (!authReady) return <div className="flex min-h-screen items-center justify-center bg-[#F4F2F2] text-sm text-[#215E61]">Restoring your secure TextGuard session…</div>;
  if (!currentUser) return <AuthGate />;
  const filteredSections = search.trim() ? Object.entries(sectionMeta).filter(([, item]) => item.title.toLowerCase().includes(search.toLowerCase()) || item.description.toLowerCase().includes(search.toLowerCase())).map(([id]) => id as SectionId) : [];
  const navigate = (id: SectionId) => { setActiveSection(id); setMobileOpen(false); setSearch(''); setNotificationsOpen(false); setProfileOpen(false); };
  const chooseSearchResult = () => { if (filteredSections[0]) navigate(filteredSections[0]); };

  return <div className="min-h-screen bg-[#F4F2F2] text-[#1D2128]">
    <Sidebar activeSection={activeSection} onNavigate={navigate} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    {mobileOpen && <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-[2px] lg:hidden" onClick={() => setMobileOpen(false)} />}
    <div className="min-h-screen lg:pl-[264px]">
      <Topbar onMenuClick={() => setMobileOpen(true)} search={search} onSearchChange={setSearch} onSearchSubmit={chooseSearchResult} notificationsOpen={notificationsOpen} onNotificationsClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }} profileOpen={profileOpen} onProfileClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false); }} currentUser={currentUser} />
      {toastMessage && <div role="status" aria-live="polite" className="toast-enter fixed right-4 top-[84px] z-[75] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-xs font-semibold text-emerald-800 shadow-xl shadow-slate-900/10 sm:right-8">
        <CheckCircle2 size={17} className="shrink-0 text-emerald-600" />
        <span>{toastMessage}</span>
        <button type="button" aria-label="Dismiss notification" onClick={() => setToastMessage(null)} className="ml-1 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={15} /></button>
      </div>}
      {(search.trim() || notificationsOpen || profileOpen) && <div className="relative z-20 mx-5 mt-3 flex justify-end sm:mx-8">
        {search.trim() && <div className="absolute right-0 top-0 w-full max-w-md rounded-xl border border-slate-200 bg-white p-2 shadow-xl">{filteredSections.length ? filteredSections.map(id => <button key={id} onClick={() => navigate(id)} className="flex w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">{sectionMeta[id].title}</button>) : <p className="px-3 py-2 text-sm text-slate-500">No matching sections found.</p>}</div>}
        {notificationsOpen && <div className="absolute right-0 top-0 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10">
          <p className="text-sm font-semibold text-slate-900">Workspace activity</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Live counts from this browser session.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-50 p-3"><p className="text-lg font-bold tabular-nums text-slate-900">{uploadedDocuments.length}</p><p className="text-[10px] text-slate-500">Uploaded files</p></div>
            <div className="rounded-lg bg-slate-50 p-3"><p className="text-lg font-bold tabular-nums text-slate-900">{historyEntries.length}</p><p className="text-[10px] text-slate-500">Completed reports</p></div>
          </div>
          <button onClick={() => navigate('history')} className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700">Open detection history</button>
        </div>}
        {profileOpen && <div className="absolute right-0 top-0 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10">
          <p className="text-sm font-semibold text-slate-900">Your TextGuard account</p>
          <p className="mt-1 break-all text-xs text-slate-500">{currentUser?.email || currentUser?.name || 'Authenticated account'}</p>
          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-[11px] text-slate-600">
            <div className="flex justify-between"><span>Document files in this session</span><b>{uploadedDocuments.length}</b></div>
            <div className="flex justify-between"><span>Completed reports</span><b>{historyEntries.length}</b></div>
          </div>
          <button onClick={() => navigate('profile')} className="mt-4 w-full rounded-lg border border-[#215E61] px-3 py-2.5 text-xs font-semibold text-[#215E61] transition hover:bg-[#EAF2F1]">Manage account profile</button>
          <button onClick={signOut} className="mt-2 w-full rounded-lg bg-[#1D2128] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#303640]">Sign out</button>
          <p className="mt-3 text-[10px] leading-4 text-slate-400">Documents and comparison history remain in this browser session only.</p>
        </div>}
      </div>}
      <main className="mx-auto max-w-[1440px] px-4 pb-12 pt-6 sm:px-7 sm:pt-8 lg:px-8">
        {activeSection !== 'overview' && <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[0.2em] text-indigo-600">{meta.eyebrow}</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">{meta.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{meta.description}</p></div><div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"><span className={`h-2 w-2 rounded-full ${serviceStatus?.status === 'ready' ? 'bg-emerald-500' : serviceStatus?.status === 'offline' ? 'bg-red-500' : 'bg-amber-400'}`} />{serviceStatus?.status === 'ready' ? 'Service connected' : serviceStatus?.status === 'offline' ? 'Service unavailable' : 'Connecting service'}</div></div>}
        <div key={activeSection} className="page-enter">{activeSection === 'overview' ? <Overview data={{ ...dashboard, documents: [...dashboard.documents, ...uploadedDocuments.map(doc => ({ id: doc.id, name: doc.name, createdAt: doc.uploadedAt }))] }} loading={dashboardLoading} errorMessage={dashboardError} onNavigate={navigate} /> : activeSection === 'upload' ? <UploadModule documents={uploadedDocuments} onDocumentsChange={setUploadedDocuments} onContinue={() => navigate('checker')} /> : <SectionContent section={activeSection} onNavigate={navigate} documents={uploadedDocuments} comparisons={comparisonRuns} selectedComparisonId={selectedComparisonId} history={historyEntries} onDeleteHistory={id => setHistoryEntries(current => current.filter(entry => entry.id !== id))} onComparisonComplete={(runs, runId, openReport) => {
          const detectedAt = new Date().toISOString();
          const snapshots = runs.flatMap((run, index) => {
            const a = uploadedDocuments.find(doc => doc.id === run.result.documentA.id);
            const b = uploadedDocuments.find(doc => doc.id === run.result.documentB.id);
            if (!a || !b) return [];
            return [{
              id: runId + '-' + (index + 1), detectedAt, elapsedMs: run.elapsedMs, result: run.result,
              documentA: { id: a.id, name: a.name, text: a.text, wordCount: a.wordCount, characterCount: a.characterCount, type: a.type, size: a.size },
              documentB: { id: b.id, name: b.name, text: b.text, wordCount: b.wordCount, characterCount: b.characterCount, type: b.type, size: b.size }
            }];
          });
          setHistoryEntries(current => {
            const known = new Set(current.map(entry => entry.id));
            return [...snapshots.filter(entry => !known.has(entry.id)), ...current];
          });
          const identifiedRuns = runs.map((run, index) => ({ ...run, id: runId + '-' + (index + 1) }));
          setComparisonRuns(identifiedRuns);
          setSelectedComparisonId(identifiedRuns[0]?.id ?? null);
          if (openReport) navigate('results');
          else if (snapshots.length) setToastMessage(`${snapshots.length} completed comparison${snapshots.length === 1 ? '' : 's'} added to session history.`);
        }} />}</div>
        <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-5 text-xs text-slate-400"><span>© 2026 TextGuard · Document Similarity Workspace</span><span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> Built with classical DSA principles</span></footer>
      </main>
    </div>
  </div>;
}

export default App;
