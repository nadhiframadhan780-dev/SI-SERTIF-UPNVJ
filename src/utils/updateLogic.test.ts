import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatIndonesianDateTime,
  hasNewerServerBuild,
  isValidBuildManifest,
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
