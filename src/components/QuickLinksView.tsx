import React from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  GraduationCap,
} from 'lucide-react';

type PortalKey = 'leads' | 'siakad' | 'website';

const PORTAL_URLS: Record<PortalKey, string> = {
  leads: 'https://leads.upnvj.ac.id/login/index.php',
  siakad: 'https://akademik.upnvj.ac.id/',
  website: 'https://www.upnvj.ac.id/',
};

const QUICK_LINKS: Array<{
  key: PortalKey;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  accentBg: string;
  accentText: string;
}> = [
  {
    key: 'leads',
    label: 'LEADS UPNVJ',
    Icon: BookOpen,
    accentBg: 'bg-teal-50 group-hover:bg-teal-600',
    accentText: 'text-teal-700 group-hover:text-white',
  },
  {
    key: 'siakad',
    label: 'SIAKAD UPNVJ',
    Icon: GraduationCap,
    accentBg: 'bg-emerald-50 group-hover:bg-emerald-600',
    accentText: 'text-emerald-700 group-hover:text-white',
  },
  {
    key: 'website',
    label: 'Website UPNVJ',
    Icon: Building2,
    accentBg: 'bg-amber-50 group-hover:bg-yellow-500',
    accentText: 'text-amber-700 group-hover:text-slate-900',
  },
];

export const QuickLinksView: React.FC = () => {
  const openPortal = (key: PortalKey) => {
    const targetUrl = PORTAL_URLS[key];
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Telusuri Cepat
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Akses cepat portal akademik resmi UPN Veteran Jakarta melalui tab
          baru.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {QUICK_LINKS.map(({ key, label, Icon, accentBg, accentText }) => (
          <button
            key={key}
            type="button"
            onClick={() => openPortal(key)}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-teal-600"
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${accentBg} ${accentText}`}
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <span className="text-base font-bold text-slate-900">
                {label}
              </span>
            </div>
            <ArrowUpRight
              className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-teal-700"
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </div>
  );
};
