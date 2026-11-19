import { registerSW } from 'virtual:pwa-register';

let triggerSwUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null;
let initialized = false;

export function initPwaUpdater(onNeedRefresh: () => void): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  triggerSwUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      onNeedRefresh();
    },
  });
}

export async function applyPwaUpdate(): Promise<void> {
  if (!triggerSwUpdate) return;
  try {
    await Promise.race([
      triggerSwUpdate(true),
      new Promise<void>((resolve) => window.setTimeout(resolve, 1200)),
    ]);
  } catch {
    // fallback handled by caller reload
  }
}
