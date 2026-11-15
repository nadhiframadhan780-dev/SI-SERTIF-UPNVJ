import React from 'react';
import {
  Award,
  CheckSquare,
  Compass,
  FolderArchive,
  GraduationCap,
  Home,
  Info,
  PlusCircle,
  X,
} from 'lucide-react';
import type { NavPage, SkripsiProgress } from '../types/certificate';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
  skripsiProgress: SkripsiProgress;
  totalCertificates: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: NavPage;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'beranda', label: 'Beranda', Icon: Home },
  { id: 'sertifikat', label: 'Sertifikat Saya', Icon: Award },
  { id: 'tambah', label: 'Tambah Sertifikat', Icon: PlusCircle },
  { id: 'skripsi', label: 'Syarat Skripsi', Icon: GraduationCap },
  { id: 'telusuri', label: 'Telusuri Cepat', Icon: Compass },
  { id: 'backup', label: 'Backup & Restore', Icon: FolderArchive },
  { id: 'tentang', label: 'Tentang', Icon: Info },
];

export const LogoMark: React.FC<{ className?: string }> = ({
  className = 'h-10 w-auto',
}) => {
  const [imgError, setImgError] = React.useState(false);

  if (imgError) {
    return (
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-sm">
          SS
        </div>
        <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
          SI-SERTIF UPNVJ
        </span>
      </div>
    );
  }

  return (
    <img
      src="/logo.png"
      alt="Logo SI-SERTIF UPNVJ"
      onError={() => setImgError(true)}
      className={`${className} object-contain object-left`}
    />
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  skripsiProgress,
  totalCertificates,
  mobileOpen,
  onCloseMobile,
}) => {
  const handleSelect = (page: NavPage) => {
    onNavigate(page);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200/90">
      {/* Brand Logo Slot */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <button
          type="button"
          onClick={() => handleSelect('beranda')}
          className="flex items-center focus-visible:outline-2 focus-visible:outline-teal-600 rounded-lg"
          aria-label="Ke Beranda SI-SERTIF UPNVJ"
        >
          <LogoMark className="h-11 max-w-[190px]" />
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Tutup menu navigasi"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main Navigation */}
      <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const isActive = activePage === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => handleSelect(id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/20'
                      : 'text-slate-700 hover:bg-teal-50/70 hover:text-teal-800'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`h-4.5 w-4.5 shrink-0 ${
                        isActive ? 'text-white' : 'text-teal-700/80'
                      }`}
                    />
                    <span className="truncate">{label}</span>
                  </span>

                  {id === 'sertifikat' && totalCertificates > 0 && (
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        isActive ? 'text-teal-100' : 'text-slate-400'
                      }`}
                    >
                      {totalCertificates}
                    </span>
                  )}

                  {id === 'skripsi' && (
                    <span
                      className={`font-mono text-xs font-semibold tabular-nums ${
                        isActive
                          ? 'text-yellow-200'
                          : skripsiProgress.isFulfilled
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {skripsiProgress.completedCount}/{skripsiProgress.targetCount}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Summary & PWA Install */}
      <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50/60">
        <button
          type="button"
          onClick={() => handleSelect('skripsi')}
          className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-colors hover:border-teal-300"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <CheckSquare
                className={`h-3.5 w-3.5 ${
                  skripsiProgress.isFulfilled
                    ? 'text-emerald-600'
                    : 'text-amber-600'
                }`}
              />
              Syarat Skripsi
            </span>
            <span
              className={`font-mono text-xs font-semibold tabular-nums ${
                skripsiProgress.isFulfilled
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}
            >
              {skripsiProgress.completedCount} / {skripsiProgress.targetCount}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                skripsiProgress.isFulfilled ? 'bg-emerald-500' : 'bg-yellow-400'
              }`}
              style={{ width: `${skripsiProgress.percentage}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            {skripsiProgress.isFulfilled
              ? 'Target minimal terpenuhi'
              : `Kurang ${skripsiProgress.remainingCount} sertifikat lagi`}
          </p>
        </button>

        <PWAInstallButton />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]"
          />
          <div className="relative z-10 h-full w-72 max-w-[85vw]">{navContent}</div>
        </div>
      )}
    </>
  );
};
