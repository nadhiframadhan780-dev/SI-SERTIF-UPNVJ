import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatIndonesianDateTime,
  formatIndonesianReleaseDate,
  hasNewerServerBuild,
  isValidBuildManifest,
  resolveDisplayReleases,
} from './updateLogic.ts';

test('hasNewerServerBuild detects new buildId vs matching buildId', () => {
  assert.equal(
    hasNewerServerBuild('1.4.0-abc1234-2026-11-18T00:00:00Z', {
      buildId: '1.4.0-def5678-2026-11-18T01:00:00Z',
    }),
    true
  );
  assert.equal(
    hasNewerServerBuild('1.4.0-abc1234-2026-11-18T00:00:00Z', {
      buildId: '1.4.0-abc1234-2026-11-18T00:00:00Z',
    }),
    false
  );
  assert.equal(hasNewerServerBuild('1.4.0-abc1234', null), false);
});

test('isValidBuildManifest validates required manifest fields', () => {
  assert.equal(
    isValidBuildManifest({
      version: '1.4.0',
      buildId: '1.4.0-abc',
      commitSha: 'abc',
      commitMessage: 'feat: update',
      builtAt: '2026-11-18T03:00:00.000Z',
      recentCommits: [],
    }),
    true
  );
  assert.equal(isValidBuildManifest({ version: '1.4.0' }), false);
  assert.equal(isValidBuildManifest(null), false);
});

test('formatIndonesianDateTime formats ISO dates cleanly and handles empty strings', () => {
  assert.equal(formatIndonesianDateTime(''), '-');
  const formatted = formatIndonesianDateTime('2026-11-18T03:15:00.000Z');
  assert.match(formatted, /2026/);
});

test('resolveDisplayReleases prioritizes remote releases and uses live builtAt date for latest entry', () => {
  const localInfo = {
    version: '1.4.0',
    buildId: '1.4.0-old',
    commitSha: 'old111',
    commitMessage: 'old',
    builtAt: '2026-11-18T08:00:00.000Z',
    recentCommits: [],
  };
  const remoteInfo = {
    version: '1.5.0',
    buildId: '1.5.0-new',
    commitSha: 'new222',
    commitMessage: 'feat: pembaruan baru',
    builtAt: '2026-11-19T10:30:00.000Z',
    recentCommits: [],
    releases: [
      {
        version: '1.5.0',
        dateLabel: '18 November 2026', // intentionally stale static label
        title: 'Rilis Baru',
        summary: 'Ringkasan baru',
        highlights: ['Fitur baru 1'],
      },
    ],
  };

  const resolved = resolveDisplayReleases({
    remoteInfo,
    localInfo,
    fallbackReleases: [],
  });

  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].version, '1.5.0');
  assert.equal(resolved[0].title, 'Rilis Baru');
  assert.match(resolved[0].dateLabel, /19 November 2026/);
  assert.equal(formatIndonesianReleaseDate('', 'Fallback'), 'Fallback');
});
