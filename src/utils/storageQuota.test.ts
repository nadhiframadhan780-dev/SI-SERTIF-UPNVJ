import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PDF_SIZE_BYTES } from './certificateLogic.ts';
import {
  buildDeviceStorageEstimate,
  formatStorageCapacity,
} from './storageQuota.ts';

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

test('buildDeviceStorageEstimate handles unsupported browsers gracefully', () => {
  const result = buildDeviceStorageEstimate({
    quotaBytes: null,
    usageBytes: null,
    certificatesTotalBytes: 25 * MB,
    persisted: null,
  });

  assert.equal(result.supported, false);
  assert.equal(result.status, 'tidak-tersedia');
  assert.equal(result.availableBytes, null);
  assert.equal(result.recommendedSafeAdditionalBytes, null);
  assert.equal(result.effectiveMaxSingleFileBytes, MAX_PDF_SIZE_BYTES);
});

test('buildDeviceStorageEstimate recommends 70% safe headroom when ample storage is available', () => {
  const result = buildDeviceStorageEstimate({
    quotaBytes: 50 * GB,
    usageBytes: 10 * GB,
    certificatesTotalBytes: 2 * GB,
    persisted: true,
  });

  assert.equal(result.supported, true);
  assert.equal(result.status, 'aman');
  assert.equal(result.availableBytes, 40 * GB);
  assert.equal(result.usagePercent, 20);
  assert.equal(result.recommendedSafeAdditionalBytes, Math.floor(40 * GB * 0.7));
  assert.equal(result.recommendedTotalArchiveBytes, 2 * GB + Math.floor(40 * GB * 0.7));
  assert.equal(result.effectiveMaxSingleFileBytes, MAX_PDF_SIZE_BYTES);
  assert.equal(result.estimatedOneGbFiles, 28);
  assert.equal(formatStorageCapacity(result.recommendedSafeAdditionalBytes!), '28.00 GB');
});

test('buildDeviceStorageEstimate flags sedang status and caps effective single-file size when < 1 GB remains', () => {
  const result = buildDeviceStorageEstimate({
    quotaBytes: 2 * GB,
    usageBytes: 1400 * MB,
    certificatesTotalBytes: 300 * MB,
    persisted: false,
  });

  const expectedAvail = 2 * GB - 1400 * MB; // 648 MB
  assert.equal(result.supported, true);
  assert.equal(result.status, 'sedang');
  assert.equal(result.availableBytes, expectedAvail);
  assert.equal(result.effectiveMaxSingleFileBytes, expectedAvail);
  assert.equal(result.estimatedOneGbFiles, 0);
});

test('buildDeviceStorageEstimate flags kritis status when remaining space is under 100 MB or usage >= 90%', () => {
  const result = buildDeviceStorageEstimate({
    quotaBytes: 1 * GB,
    usageBytes: 970 * MB,
    certificatesTotalBytes: 500 * MB,
    persisted: false,
  });

  assert.equal(result.supported, true);
  assert.equal(result.status, 'kritis');
  assert.ok(result.availableBytes! < 100 * MB);
  assert.ok(result.headlineAdvice.includes('hampir penuh'));
});
