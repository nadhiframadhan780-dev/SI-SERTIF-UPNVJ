import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Menu, PlusCircle, RefreshCw, Sparkles } from 'lucide-react';
import type {
  CertificateFormValues,
  CertificateRecord,
  NavPage,
} from './types/certificate';
import type { AppBuildInfo, JustUpdatedRecord } from './types/update';
import {
  calculateSkripsiProgress,
  collectJenisSuggestions,
  computeCategoryStats,
} from './utils/certificateLogic';
import {
  deleteCertificateById,
  getAllCertificates,
  saveCertificate,
} from './utils/db';
import { createSamplePdfBlob } from './utils/pdfService';
import { FeedbackProvider, useFeedback } from './components/ToastProvider';
import { LogoMark, Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CertificatesView } from './components/CertificatesView';
import { AddCertificateView } from './components/AddCertificateView';
import { SkripsiView } from './components/SkripsiView';
import { QuickLinksView } from './components/QuickLinksView';
import { BackupRestoreView } from './components/BackupRestoreView';
import { AboutView } from './components/AboutView';
import {
  CertificateDetailModal,
  CertificateEditModal,
} from './components/CertificateModals';
import { OfflineIndicator } from './components/PWAInstallButton';
import {
  JUST_UPDATED_STORAGE_KEY,
  UpdateManagerModal,
} from './components/UpdateManagerModal';
import {
  getLocalBuildInfo,
  hasNewerServerBuild,
  isValidBuildManifest,
} from './utils/updateLogic';

const PAGE_TITLES: Record<NavPage, string> = {
  beranda: 'Beranda',
  sertifikat: 'Sertifikat Saya',
  tambah: 'Tambah Sertifikat',
  skripsi: 'Syarat Wajib Skripsi',
  telusuri: 'Telusuri Cepat',
  backup: 'Backup & Restore',
  tentang: 'Tentang SI-SERTIF UPNVJ',
};

const SAMPLE_ITEMS: Array<{
  namaSertifikat: string;
  deskripsi: string;
  jenisSertifikat: string;
  tanggalDiperoleh: string;
  isSyaratSkripsi: boolean;
  organizer: string;
  recipient: string;
  fileName: string;
}> = [
  {
    namaSertifikat: 'Seminar Nasional Keamanan Siber & AI UPNVJ 2026',
    deskripsi:
      'Seminar nasional mengenai ketahanan siber dan implementasi kecerdasan buatan yang diselenggarakan oleh Fakultas Ilmu Komputer UPN Veteran Jakarta.',
    jenisSertifikat: 'Seminar',
    tanggalDiperoleh: '2026-09-18',
    isSyaratSkripsi: true,
    organizer: 'Fakultas Ilmu Komputer UPNVJ',
    recipient: 'Mahasiswa UPNVJ',
    fileName: 'seminar-nasional-keamanan-siber-upnvj.pdf',
  },
  {
    namaSertifikat: 'Pelatihan Cloud Architecture & DevOps Fundamental',
    deskripsi:
      'Pelatihan intensif perancangan infrastruktur cloud modern dan deployment otomatis oleh Himpunan Mahasiswa Informatika UPNVJ.',
    jenisSertifikat: 'Pelatihan',
    tanggalDiperoleh: '2026-07-12',
    isSyaratSkripsi: true,
    organizer: 'HIMATIKA UPNVJ',
    recipient: 'Mahasiswa UPNVJ',
    fileName: 'pelatihan-cloud-devops-upnvj.pdf',
  },
  {
    namaSertifikat: 'Juara 2 Lomba Karya Tulis Ilmiah Nasional Bela Negara',
    deskripsi:
      'Penghargaan Juara 2 tingkat nasional pada kompetisi karya tulis ilmiah inovasi digital bertema Bela Negara di UPN Veteran Jakarta.',
    jenisSertifikat: 'Lomba',
    tanggalDiperoleh: '2026-05-24',
    isSyaratSkripsi: true,
    organizer: 'LPPM UPN Veteran Jakarta',
    recipient: 'Mahasiswa UPNVJ',
    fileName: 'juara-2-lkti-bela-negara.pdf',
  },
  {
    namaSertifikat: 'Sertifikat Kompetensi Bahasa Inggris TOEFL ITP (Skor 550)',
    deskripsi:
      'Sertifikat hasil tes kemampuan bahasa Inggris resmi yang diterbitkan oleh Lembaga Bahasa UPN Veteran Jakarta sebagai syarat kelulusan.',
    jenisSertifikat: 'Bahasa',
    tanggalDiperoleh: '2026-04-08',
    isSyaratSkripsi: true,
    organizer: 'UPT Bahasa UPNVJ',
    recipient: 'Mahasiswa UPNVJ',
    fileName: 'sertifikat-toefl-upnvj.pdf',
  },
  {
    namaSertifikat: 'Sertifikat Magang Industri Software Engineer',
    deskripsi:
      'Pengakuan penyelesaian program magang MBKM selama satu semester sebagai Software Engineer di mitra industri teknologi.',
    jenisSertifikat: 'Magang',
    tanggalDiperoleh: '2025-12-20',
    isSyaratSkripsi: false,
    organizer: 'Program MBKM UPNVJ',
    recipient: 'Mahasiswa UPNVJ',
    fileName: 'sertifikat-magang-mbkm.pdf',
  },
];

function MainAppContent() {
  const { showToast, confirm } = useFeedback();

  const [activePage, setActivePage] = useState<NavPage>('beranda');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [loadingSamples, setLoadingSamples] = useState(false);

  const [detailCert, setDetailCert] = useState<CertificateRecord | null>(null);
  const [editCert, setEditCert] = useState<CertificateRecord | null>(null);

  const localBuildInfo = useMemo(() => getLocalBuildInfo(), []);
  const [remoteBuildInfo, setRemoteBuildInfo] = useState<AppBuildInfo | null>(
    null
  );
  const [swHasUpdate, setSwHasUpdate] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [autoStartApply, setAutoStartApply] = useState(false);
  const [justUpdated, setJustUpdated] = useState<JustUpdatedRecord | null>(
    null
  );

  const hasPendingUpdate = useMemo(
    () =>
      swHasUpdate ||
      hasNewerServerBuild(localBuildInfo.buildId, remoteBuildInfo),
    [swHasUpdate, localBuildInfo.buildId, remoteBuildInfo]
  );

  const checkForUpdates = useCallback(
    async (manual = false): Promise<boolean> => {
      setCheckingUpdate(true);
      try {
        const response = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!response.ok) {
          if (manual) {
            showToast(
              'info',
              'Versi Terbaru Aktif',
              'Anda sedang menggunakan versi terbaru yang tersimpan.'
            );
          }
          return false;
        }
        const data: unknown = await response.json();
        if (!isValidBuildManifest(data)) {
          return false;
        }
        setRemoteBuildInfo(data);
        const foundNew = hasNewerServerBuild(localBuildInfo.buildId, data);
        if (manual) {
          if (foundNew) {
            showToast(
              'info',
              'Pembaruan Terbaru Tersedia',
              `Versi ${data.version} siap diimplementasikan.`
            );
          } else {
            showToast(
              'success',
              'Sudah Versi Terbaru',
              `Aplikasi Anda sudah menggunakan versi v${localBuildInfo.version}.`
            );
          }
        }
        return foundNew;
      } catch {
        if (manual) {
          showToast(
            'warning',
            'Tidak Dapat Memeriksa Pembaruan',
            'Periksa koneksi internet untuk mengecek pembaruan dari server.'
          );
        }
        return false;
      } finally {
        setCheckingUpdate(false);
      }
    },
    [localBuildInfo.buildId, localBuildInfo.version, showToast]
  );

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(JUST_UPDATED_STORAGE_KEY);
      if (raw) {
        sessionStorage.removeItem(JUST_UPDATED_STORAGE_KEY);
        const parsed = JSON.parse(raw) as JustUpdatedRecord;
        setJustUpdated(parsed);
        setAutoStartApply(false);
        setUpdateModalOpen(true);
        showToast(
          'success',
          'Pembaruan Berhasil Diimplementasikan',
          `SI-SERTIF UPNVJ telah diperbarui ke versi v${parsed.toVersion}.`
        );
      }
    } catch {
      // ignore storage parse failures
    }
  }, [showToast]);

  useEffect(() => {
    void checkForUpdates(false);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void checkForUpdates(false);
      }
    }, 60000);

    const onFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        void checkForUpdates(false);
      }
    };

    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);

    let cleanupSw: (() => void) | undefined;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          if (!reg) return;
          if (reg.waiting) {
            setSwHasUpdate(true);
          }
          const onUpdateFound = () => {
            const installing = reg.installing;
            if (!installing) return;
            installing.addEventListener('statechange', () => {
              if (
                installing.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                setSwHasUpdate(true);
              }
            });
          };
          reg.addEventListener('updatefound', onUpdateFound);
          cleanupSw = () => reg.removeEventListener('updatefound', onUpdateFound);
        })
        .catch(() => {});
    }

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
      cleanupSw?.();
    };
  }, [checkForUpdates]);

  const refreshCertificates = useCallback(async () => {
    try {
      const items = await getAllCertificates();
      setCertificates(items);
    } catch {
      showToast(
        'error',
        'Gagal Memuat Database',
        'Tidak dapat membaca data sertifikat dari IndexedDB.'
      );
    } finally {
      setLoadingDb(false);
    }
  }, [showToast]);

  useEffect(() => {
    void refreshCertificates();
  }, [refreshCertificates]);

  const skripsiProgress = useMemo(
    () => calculateSkripsiProgress(certificates),
    [certificates]
  );

  const categoryStats = useMemo(
    () => computeCategoryStats(certificates),
    [certificates]
  );

  const jenisSuggestions = useMemo(
    () => collectJenisSuggestions(certificates),
    [certificates]
  );

  const handleSaveNewCertificate = async (record: CertificateRecord) => {
    const prevCount = skripsiProgress.completedCount;
    await saveCertificate(record);
    await refreshCertificates();

    const nextCount = prevCount + (record.isSyaratSkripsi ? 1 : 0);
    if (record.isSyaratSkripsi && prevCount < 5 && nextCount >= 5) {
      showToast(
        'success',
        'Selamat! Syarat Wajib Skripsi Terpenuhi',
        'Anda telah mengumpulkan 5 sertifikat syarat wajib skripsi.'
      );
    } else {
      showToast(
        'success',
        'Sertifikat Disimpan',
        `"${record.namaSertifikat}" berhasil disimpan ke arsip.`
      );
    }
  };

  const handleUpdateCertificate = async (
    id: string,
    values: CertificateFormValues
  ) => {
    const target = certificates.find((c) => c.id === id);
    if (!target) return;

    const prevSkripsiCount = skripsiProgress.completedCount;
    const updated: CertificateRecord = {
      ...target,
      ...values,
      updatedAt: new Date().toISOString(),
    };

    await saveCertificate(updated);
    await refreshCertificates();

    if (detailCert?.id === id) {
      setDetailCert(updated);
    }

    const becameSkripsi = !target.isSyaratSkripsi && updated.isSyaratSkripsi;
    if (becameSkripsi && prevSkripsiCount === 4) {
      showToast(
        'success',
        'Selamat! Syarat Wajib Skripsi Terpenuhi',
        'Total sertifikat syarat skripsi Anda kini mencapai 5 dokumen.'
      );
    } else {
      showToast(
        'success',
        'Perubahan Disimpan',
        `Data sertifikat "${updated.namaSertifikat}" telah diperbarui.`
      );
    }
  };

  const handleToggleSkripsi = async (cert: CertificateRecord) => {
    const prevSkripsiCount = skripsiProgress.completedCount;
    const nextFlag = !cert.isSyaratSkripsi;
    const updated: CertificateRecord = {
      ...cert,
      isSyaratSkripsi: nextFlag,
      updatedAt: new Date().toISOString(),
    };

    await saveCertificate(updated);
    await refreshCertificates();

    if (nextFlag && prevSkripsiCount === 4) {
      showToast(
        'success',
        'Selamat! Syarat Wajib Skripsi Terpenuhi',
        'Target minimal 5 sertifikat syarat wajib skripsi sudah tercapai.'
      );
    } else {
      showToast(
        'info',
        nextFlag
          ? 'Ditambahkan ke Syarat Skripsi'
          : 'Dikeluarkan dari Syarat Skripsi',
        `"${cert.namaSertifikat}" telah diperbarui.`
      );
    }
  };

  const handleDeleteCertificate = async (cert: CertificateRecord) => {
    const ok = await confirm({
      title: 'Hapus Sertifikat?',
      message: `Sertifikat "${cert.namaSertifikat}" beserta file PDF-nya akan dihapus permanen dari penyimpanan perangkat ini.`,
      confirmLabel: 'Ya, Hapus',
      cancelLabel: 'Batal',
      variant: 'danger',
    });

    if (!ok) return;

    await deleteCertificateById(cert.id);
    if (detailCert?.id === cert.id) {
      setDetailCert(null);
    }
    await refreshCertificates();
    showToast(
      'success',
      'Sertifikat Dihapus',
      `"${cert.namaSertifikat}" berhasil dihapus.`
    );
  };

  const handleDownloadPdf = (cert: CertificateRecord) => {
    const url = URL.createObjectURL(cert.pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = cert.fileName || `${cert.namaSertifikat}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(
      'info',
      'Mengunduh Sertifikat',
      `File "${cert.fileName}" sedang diunduh.`
    );
  };

  const handleLoadSampleData = async () => {
    setLoadingSamples(true);
    try {
      const now = new Date().toISOString();
      for (let i = 0; i < SAMPLE_ITEMS.length; i++) {
        const sample = SAMPLE_ITEMS[i];
        const pdfBlob = createSamplePdfBlob({
          title: sample.namaSertifikat,
          organizer: sample.organizer,
          recipient: sample.recipient,
          dateLabel: sample.tanggalDiperoleh,
          category: sample.jenisSertifikat,
        });
        const record: CertificateRecord = {
          id: `sample-upnvj-${i + 1}`,
          namaSertifikat: sample.namaSertifikat,
          deskripsi: sample.deskripsi,
          jenisSertifikat: sample.jenisSertifikat,
          tanggalDiperoleh: sample.tanggalDiperoleh,
          isSyaratSkripsi: sample.isSyaratSkripsi,
          fileName: sample.fileName,
          fileSize: pdfBlob.size,
          mimeType: 'application/pdf',
          pdfBlob,
          createdAt: now,
          updatedAt: now,
        };
        await saveCertificate(record);
      }
      await refreshCertificates();
      showToast(
        'success',
        '5 Data Contoh Dimuat',
        'Sertifikat contoh beserta file PDF siap dilihat dan diuji.'
      );
    } catch {
      showToast(
        'error',
        'Gagal Memuat Data Contoh',
        'Terjadi kesalahan saat menyimpan data contoh ke IndexedDB.'
      );
    } finally {
      setLoadingSamples(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBF9] text-slate-900 flex">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        skripsiProgress={skripsiProgress}
        totalCertificates={certificates.length}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200/90 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden shrink-0">
              <LogoMark className="h-8 max-w-[140px]" />
            </div>
            <span className="hidden lg:inline-block text-sm font-semibold text-slate-700 truncate">
              {PAGE_TITLES[activePage]}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setAutoStartApply(hasPendingUpdate);
                setUpdateModalOpen(true);
              }}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                hasPendingUpdate
                  ? 'bg-amber-400 text-slate-950 shadow-sm hover:bg-amber-500 ring-2 ring-amber-200'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50/60 hover:text-teal-800'
              }`}
            >
              {hasPendingUpdate ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="hidden md:inline">
                    Implementasikan Pembaruan Terbaru
                  </span>
                  <span className="md:hidden">Update Baru</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-teal-600" />
                  <span className="hidden sm:inline">Info Pembaruan</span>
                  <span className="sm:hidden">Update</span>
                </>
              )}
            </button>

            {activePage !== 'tambah' && (
              <button
                type="button"
                onClick={() => setActivePage('tambah')}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 whitespace-nowrap"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Tambah Sertifikat</span>
                <span className="sm:hidden">Tambah</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {loadingDb ? (
            <div className="space-y-4">
              <div className="h-32 animate-pulse rounded-2xl bg-slate-200/70" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
                <div className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
                <div className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
                <div className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
              </div>
            </div>
          ) : (
            <>
              {activePage === 'beranda' && (
                <DashboardView
                  certificates={certificates}
                  skripsiProgress={skripsiProgress}
                  categoryStats={categoryStats}
                  onNavigate={setActivePage}
                  onSelectCertificate={setDetailCert}
                  onLoadSampleData={handleLoadSampleData}
                  loadingSamples={loadingSamples}
                />
              )}
              {activePage === 'sertifikat' && (
                <CertificatesView
                  certificates={certificates}
                  jenisSuggestions={jenisSuggestions}
                  onNavigate={setActivePage}
                  onViewDetail={setDetailCert}
                  onEdit={setEditCert}
                  onDelete={(cert) => void handleDeleteCertificate(cert)}
                  onDownload={handleDownloadPdf}
                />
              )}
              {activePage === 'tambah' && (
                <AddCertificateView
                  jenisSuggestions={jenisSuggestions}
                  certificatesTotalBytes={certificates.reduce(
                    (sum, c) => sum + c.fileSize,
                    0
                  )}
                  onSaveCertificate={handleSaveNewCertificate}
                  onSuccessNavigate={() => setActivePage('sertifikat')}
                />
              )}
              {activePage === 'skripsi' && (
                <SkripsiView
                  certificates={certificates}
                  skripsiProgress={skripsiProgress}
                  onNavigate={setActivePage}
                  onToggleSkripsi={handleToggleSkripsi}
                  onViewDetail={setDetailCert}
                  onEdit={setEditCert}
                  onDownload={handleDownloadPdf}
                />
              )}
              {activePage === 'telusuri' && <QuickLinksView />}
              {activePage === 'backup' && (
                <BackupRestoreView
                  certificates={certificates}
                  onRefreshCertificates={refreshCertificates}
                  onLoadSampleData={handleLoadSampleData}
                  loadingSamples={loadingSamples}
                />
              )}
              {activePage === 'tentang' && <AboutView />}
            </>
          )}
        </main>
      </div>

      {/* Detail + Edit Modals */}
      <CertificateDetailModal
        certificate={detailCert}
        onClose={() => setDetailCert(null)}
        onEdit={(cert) => {
          setDetailCert(null);
          setEditCert(cert);
        }}
        onDelete={(cert) => void handleDeleteCertificate(cert)}
        onDownload={handleDownloadPdf}
      />

      <CertificateEditModal
        certificate={editCert}
        jenisSuggestions={jenisSuggestions}
        onClose={() => setEditCert(null)}
        onSave={handleUpdateCertificate}
      />

      <UpdateManagerModal
        open={updateModalOpen}
        onClose={() => {
          setUpdateModalOpen(false);
          setAutoStartApply(false);
        }}
        localInfo={localBuildInfo}
        remoteInfo={remoteBuildInfo}
        hasUpdate={hasPendingUpdate}
        checking={checkingUpdate}
        justUpdated={justUpdated}
        autoStartApply={autoStartApply}
        onCheckNow={() => checkForUpdates(true)}
        onClearJustUpdated={() => setJustUpdated(null)}
      />

      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <FeedbackProvider>
      <MainAppContent />
    </FeedbackProvider>
  );
}
