import type { LucideIcon } from 'lucide-react';
import { ArrowRight, FileText } from 'lucide-react';

export function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <section className="flex min-h-[390px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 text-indigo-600">
        <Icon size={29} strokeWidth={1.6} />
      </div>
      <h2 className="mt-6 text-lg font-semibold tracking-tight text-slate-900">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
      <button
        onClick={onAction}
        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
      >
        {actionLabel}
        <ArrowRight size={15} />
      </button>
    </section>
  );
}
