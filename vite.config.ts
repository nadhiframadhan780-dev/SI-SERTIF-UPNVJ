import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function runGit(command: string): string {
  try {
    return execSync(command, {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();
  } catch {
    return '';
  }
}

function collectBuildMetadata() {
  let version = '1.4.0';
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')
    ) as { version?: string };
    if (pkg.version && pkg.version !== '0.0.0') {
      version = pkg.version;
    }
  } catch {
    // fallback to default version
  }

  const builtAt = new Date().toISOString();
  const vercelSha = (process.env.VERCEL_GIT_COMMIT_SHA || '').trim();
  const gitSha = runGit('git rev-parse --short HEAD');
  const commitSha = (vercelSha ? vercelSha.slice(0, 7) : '') || gitSha;

  const vercelMessage = (process.env.VERCEL_GIT_COMMIT_MESSAGE || '').trim();
  const gitMessage = runGit('git log -1 --pretty=%s');
  const commitMessage = vercelMessage || gitMessage;

  const rawLog = runGit('git log -n 8 --pretty=format:%h||%cI||%s');
  const recentCommits = rawLog
    ? rawLog
        .split('\n')
        .map((line) => {
          const [sha = '', date = '', ...rest] = line.split('||');
          return {
            sha: sha.trim(),
            date: date.trim(),
            message: rest.join('||').trim(),
          };
        })
        .filter((item) => item.sha && item.message)
    : commitSha && commitMessage
    ? [{ sha: commitSha, date: builtAt, message: commitMessage }]
    : [];

  const buildId = `${version}-${commitSha || 'local'}-${builtAt}`;

  return {
    version,
    buildId,
    commitSha,
    commitMessage,
    builtAt,
    recentCommits,
  };
}

let cachedBuildMetadata: ReturnType<typeof collectBuildMetadata> | null = null;

function getBuildMetadata() {
  if (!cachedBuildMetadata) {
    cachedBuildMetadata = collectBuildMetadata();
  }
  return cachedBuildMetadata;
}

function siSertifVersionPlugin(
  buildInfo: ReturnType<typeof collectBuildMetadata>
): Plugin {
  const payload = JSON.stringify(buildInfo, null, 2);

  return {
    name: 'si-sertif-version-manifest',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const cleanPath = (req.url || '').split('?')[0];
        if (cleanPath === '/version.json') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          res.end(payload);
          return;
        }
        next();
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: payload,
      });
    },
  };
}

export default defineConfig(() => {
  const buildInfo = getBuildMetadata();
  process.env.VITE_APP_BUILD_INFO = JSON.stringify(buildInfo);

  return {
    plugins: [
      react(),
      tailwindcss(),
      siSertifVersionPlugin(buildInfo),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.png',
          'logo.png',
          'apple-touch-icon.png',
          'pdf.worker.min.mjs',
        ],
        manifest: {
          id: '/',
          name: 'SI-SERTIF UPNVJ — Sistem Informasi Sertifikat',
          short_name: 'SI-SERTIF',
          description:
            'Sistem Informasi Sertifikat Mahasiswa UPN Veteran Jakarta untuk penyimpanan, pengelolaan, dan pemantauan syarat skripsi.',
          theme_color: '#0D9488',
          background_color: '#FAFBF9',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          lang: 'id',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,mjs,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          navigateFallbackDenylist: [/^\/api\//, /^\/version\.json/],
          runtimeCaching: [
            {
              urlPattern: /\/version\.json/,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      ...(process.env.DISABLE_HMR === 'true' ? { ws: false as const } : {}),
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
