import type { ReleaseNote } from '../types/update';

export const APP_VERSION = '1.4.0';

export const APP_RELEASES: ReleaseNote[] = [
  {
    version: '1.4.0',
    dateLabel: '18 November 2026',
    title: 'Sistem Deteksi Pembaruan & Ekspansi Telusuri Cepat',
    summary:
      'Menambahkan detektor pembaruan otomatis saat ada perubahan baru dari GitHub/Vercel beserta halaman rincian fitur yang diimplementasikan, plus 3 portal baru mahasiswa Akuntansi UPNVJ.',
    highlights: [
      'Tombol Implementasikan Pembaruan Terbaru otomatis muncul saat ada build/deploy baru dari GitHub, lengkap dengan animasi progres penerapan dan ringkasan perubahan.',
      'Kapasitas unggah dokumen sertifikat PDF ditingkatkan hingga 1 GB dengan pemuatan streaming hemat memori serta arsip .upnvjdats v2 tanpa batas string.',
      'Pemantau sisa penyimpanan perangkat (Storage Manager API) beserta saran batas maksimal GB yang aman disimpan dan opsi Penyimpanan Persisten.',
      'Format arsip backup resmi .upnvjdats dengan verifikasi integritas CRC32 streaming yang kompatibel saat dipulihkan di perangkat apa pun.',
      'Panel Riwayat Pembaruan menampilkan kapan aplikasi terakhir diperbarui, kode commit, serta daftar fitur yang sudah diimplementasikan.',
      'Penambahan menu Jadwal Kuliah S1 Akuntansi, Kalender UPNVJ 2026/2027, dan Planner Mhs Akuntansi di halaman Telusuri Cepat.',
    ],
  },
  {
    version: '1.3.0',
    dateLabel: '18 November 2026',
    title: 'Percepatan Ekstraksi AI & Dukungan Serverless Vercel',
    summary:
      'Mengoptimalkan model AI agar pengisian nama dan deskripsi sertifikat berjalan jauh lebih cepat serta menyiapkan endpoint serverless untuk deployment Vercel.',
    highlights: [
      'Beralih ke model cepat Gemini dengan pemrosesan ringan sehingga waktu baca sertifikat turun dari belasan detik menjadi beberapa detik.',
      'Kompresi otomatis gambar pindaian PDF (maksimal 1024px) agar unggahan scan tetap cepat dan tidak gagal ukuran.',
      'Penambahan endpoint serverless /api/extract-certificate untuk deployment langsung di Vercel.',
    ],
  },
  {
    version: '1.2.0',
    dateLabel: '15 November 2026',
    title: 'Peningkatan Pratinjau PDF, Restore, dan Stabilitas',
    summary:
      'Penyempurnaan tampilan pembaca sertifikat PDF agar proporsional di semua ukuran layar serta opsi pemulihan cadangan yang lebih fleksibel.',
    highlights: [
      'Pratinjau PDF menyesuaikan lebar kontainer otomatis sehingga tepi sertifikat tidak terpotong.',
      'Opsi Gabungkan atau Ganti Semua pada proses Restore cadangan data.',
      'Tombol Isi Manual saat analisis AI berlangsung agar pengguna bebas menyunting kapan saja.',
    ],
  },
  {
    version: '1.0.0',
    dateLabel: '12 November 2026',
    title: 'Peluncuran Awal SI-SERTIF UPNVJ',
    summary:
      'Rilis perdana Sistem Informasi Sertifikat Mahasiswa UPN Veteran Jakarta berbasis PWA dengan penyimpanan offline IndexedDB.',
    highlights: [
      'Penyimpanan file sertifikat PDF hingga 10 MB langsung di IndexedDB perangkat.',
      'Pemantau progres Syarat Wajib Skripsi (minimal 5 sertifikat) dengan indikator status visual.',
      'Ekspor & impor seluruh arsip PDF beserta metadata melalui fitur Backup & Restore.',
    ],
  },
];
