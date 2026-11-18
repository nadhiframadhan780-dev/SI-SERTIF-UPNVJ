import type { AppBuildInfo } from '../types/update';
import { APP_VERSION } from '../data/changelog';

export function getLocalBuildInfo(): AppBuildInfo {
  try {
    const metaEnv = (
      import.meta as ImportMeta & {
        env?: Record<string, string | undefined>;
      }
    ).env;
    const raw = metaEnv?.VITE_APP_BUILD_INFO;
    if (typeof raw === 'string' && raw.trim()) {
      const parsed = JSON.parse(raw) as Partial<AppBuildInfo>;
      if (parsed && typeof parsed.buildId === 'string') {
        return {
          version: parsed.version || APP_VERSION,
          buildId: parsed.buildId,
          commitSha: parsed.commitSha || '',
          commitMessage: parsed.commitMessage || '',
          builtAt: parsed.builtAt || new Date().toISOString(),
          recentCommits: Array.isArray(parsed.recentCommits)
            ? parsed.recentCommits
            : [],
        };
      }
    }
  } catch {
    // fallback if env metadata cannot be parsed
  }

  return {
    version: APP_VERSION,
    buildId: 'local-dev',
    commitSha: '',
    commitMessage: '',
    builtAt: new Date().toISOString(),
    recentCommits: [],
  };
}

export function hasNewerServerBuild(
  localBuildId: string,
  remoteInfo: Partial<AppBuildInfo> | null | undefined
): boolean {
  if (!remoteInfo || !remoteInfo.buildId || !localBuildId) {
    return false;
  }
  return remoteInfo.buildId.trim() !== localBuildId.trim();
}

export function formatIndonesianDateTime(isoString: string): string {
  if (!isoString) return '-';
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return isoString;

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export function isValidBuildManifest(
  data: unknown
): data is AppBuildInfo {
  if (!data || typeof data !== 'object') return false;
  const candidate = data as Partial<AppBuildInfo>;
  return (
    typeof candidate.buildId === 'string' &&
    candidate.buildId.trim().length > 0 &&
    typeof candidate.version === 'string' &&
    typeof candidate.builtAt === 'string'
  );
}
