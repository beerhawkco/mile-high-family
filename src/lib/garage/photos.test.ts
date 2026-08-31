import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decodePhoto, encodePhoto, isPhotoId, photoPath, safePhotoSrc, sniffType } from './photos.ts';

describe('garage photos', () => {
  it('accepts only our photo ids and https listing shots', () => {
    assert.equal(isPhotoId('pho_aabbccddeeff'), true);
    assert.equal(isPhotoId('pho_nope'), false);
    assert.equal(safePhotoSrc('/api/garage/photo/pho_aabbccddeeff'), '/api/garage/photo/pho_aabbccddeeff');
    assert.equal(safePhotoSrc('https://example.com/ad.jpg'), 'https://example.com/ad.jpg');
    assert.equal(safePhotoSrc('javascript:alert(1)'), '');
  });

  it('round-trips a jpeg blob', () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const stored = JSON.parse(encodePhoto(bytes, 'image/jpeg'));
    const decoded = decodePhoto(stored);
    assert.equal(decoded?.type, 'image/jpeg');
    assert.deepEqual([...decoded!.bytes], [1, 2, 3, 4]);
    assert.equal(photoPath('pho_aabbccddeeff'), '/api/garage/photo/pho_aabbccddeeff');
    assert.equal(sniffType({ name: 'ad.PNG' }), 'image/png');
  });
});
