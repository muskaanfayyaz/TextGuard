import {
  Activity,
  BookOpen,
  Clock3,
  FileCheck2,
  FileSearch,
  Files,
  LayoutDashboard,
  ShieldCheck,
  UploadCloud,
  X
} from 'lucide-react';
import { UserRound } from 'lucide-react';

export type SectionId =
  | 'overview'
  | 'upload'
  | 'library'
  | 'checker'
  | 'results'
  | 'algorithms'
  | 'history'
  | 'about'
  | 'profile';

const navigation = [
  {
    label: 'WORKSPACE',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'upload', label: 'Upload Documents', icon: UploadCloud },
      { id: 'library', label: 'Document Library', icon: Files }
    ]
  },
  {
    label: 'ANALYSIS',
    items: [
      { id: 'checker', label: 'Similarity Checker', icon: FileSearch },
      { id: 'results', label: 'Comparison Results', icon: FileCheck2 },
      { id: 'algorithms', label: 'Algorithm Analysis', icon: Activity },
      { id: 'history', label: 'Detection History', icon: Clock3 },
      { id: 'profile', label: 'Account Profile', icon: UserRound }
    ]
  },
  {
    label: 'INFORMATION',
    items: [{ id: 'about', label: 'About Project', icon: BookOpen }]
  }
] as const;

export function Sidebar({
  activeSection,
  onNavigate,
  mobileOpen,
  onClose
}: {
  activeSection: SectionId;
  onNavigate: (id: SectionId) => void;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  return (
    <aside
      aria-label="Main navigation"
      className={`fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col border-r border-white/10 bg-[#1D2128] text-[#F4F2F2] shadow-2xl shadow-black/20 transition-transform duration-300 ease-out lg:translate-x-0 lg:shadow-none ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-white/10 px-5">
        <button
          type="button"
          onClick={() => onNavigate('overview')}
          className="flex items-center gap-3 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-[#FF9E20] focus-visible:ring-offset-4 focus-visible:ring-offset-[#1D2128]"
          aria-label="TextGuard overview"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF9E20] text-[#1D2128] shadow-lg shadow-black/20">
            <ShieldCheck size={20} strokeWidth={2.2} />
          </span>
          <span>
            <span className="block text-[17px] font-bold tracking-tight text-white">TextGuard</span>
            <span className="mt-0.5 block text-[9px] font-semibold tracking-[0.17em] text-white/50">DOCUMENT INTELLIGENCE</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sidebar"
          className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9E20] lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 py-6">
        {navigation.map(group => (
          <div key={group.label} className="mb-7 last:mb-0">
            <p className="mb-2.5 px-3 text-[9px] font-bold tracking-[0.2em] text-white/40">{group.label}</p>
            <nav aria-label={group.label} className="space-y-1">
              {group.items.map(item => {
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`group relative flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#FF9E20] ${active ? 'bg-[#215E61] text-white shadow-inner shadow-black/10' : 'text-white/65 hover:translate-x-0.5 hover:bg-white/[0.07] hover:text-white'}`}
                  >
                    {active && <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-[#FF9E20]" />}
                    <item.icon size={16} strokeWidth={active ? 2.2 : 1.8} className={active ? 'text-[#FF9E20]' : 'text-white/45 transition-colors group-hover:text-white/80'} />
                    <span className="flex-1">{item.label}</span>
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-[#FF9E20] shadow-[0_0_10px_rgba(255,158,32,0.65)]" />}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-white/10 p-4">
        <div className="rounded-xl border border-[#215E61] bg-[#215E61]/25 p-3.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-white/90">
            <span className="h-2 w-2 rounded-full bg-[#FF9E20]" />
            Local analysis ready
          </div>
          <p className="mt-2 text-[10px] leading-[1.6] text-white/60">
            Documents are processed in your browser. Comparison history is retained for this session only.
          </p>
        </div>
        <p className="mt-4 px-1 text-[9px] font-medium tracking-[0.12em] text-white/35">TEXTGUARD · DSA WORKSPACE</p>
      </div>
    </aside>
  );
}
