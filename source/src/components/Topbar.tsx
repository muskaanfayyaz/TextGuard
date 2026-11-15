import { Bell, ChevronDown, Menu, Search, UserRound } from 'lucide-react';

export function Topbar({
  onMenuClick,
  search,
  onSearchChange,
  onSearchSubmit,
  notificationsOpen,
  onNotificationsClick,
  profileOpen,
  onProfileClick,
  currentUser
}: {
  onMenuClick: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  notificationsOpen: boolean;
  onNotificationsClick: () => void;
  profileOpen: boolean;
  onProfileClick: () => void;
  currentUser: { userId: string; email?: string; name?: string } | null;
}) {
  const displayName = currentUser?.name?.trim() || currentUser?.email?.split('@')[0] || 'Account';
  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-7">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button type="button" onClick={onMenuClick} aria-label="Open navigation" className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9E20] lg:hidden">
          <Menu size={19} />
        </button>
        <div className="relative hidden w-full max-w-md sm:block">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={event => onSearchChange(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') onSearchSubmit(); }} aria-label="Search workspace sections" placeholder="Search workspace sections..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 text-[12px] outline-none transition placeholder:text-slate-400 focus:border-[#215E61] focus:bg-white focus:ring-4 focus:ring-[#FF9E20]/15" />
        </div>
        <span className="truncate text-[13px] font-semibold text-slate-800 sm:hidden">TextGuard Workspace</span>
      </div>
      <div className="ml-3 flex items-center gap-1.5 sm:gap-3">
        <button type="button" onClick={onNotificationsClick} aria-label="Workspace activity" aria-expanded={notificationsOpen} title="Workspace activity" className={`relative rounded-xl p-2.5 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[#FF9E20] ${notificationsOpen ? 'bg-[#EAF2F1] text-[#215E61]' : 'text-slate-500'}`}>
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#FF9E20] ring-2 ring-white" />
        </button>
        <span className="h-7 w-px bg-slate-200" />
        <button type="button" onClick={onProfileClick} aria-label="Account menu" aria-expanded={profileOpen} title="Account menu" className={`flex items-center gap-2 rounded-xl p-1.5 pr-2 outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#FF9E20] ${profileOpen ? 'bg-[#EAF2F1]' : ''}`}>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EAF2F1] text-[#215E61]"><UserRound size={16} /></span>
          <span className="hidden max-w-[150px] text-left sm:block">
            <span className="block truncate text-[11px] font-semibold text-slate-800">{displayName}</span>
            <span className="block text-[9px] text-[#215E61]">Signed in</span>
          </span>
          <ChevronDown size={13} className="hidden text-slate-400 sm:block" />
        </button>
      </div>
    </header>
  );
}
