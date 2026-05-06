/**
 * Property-based tests for Docker image tagging utility.
 *
 * Validates: Requirements 6.2
 * Feature: cicd-pipeline, Property 9: Tagging d'image Docker
 */

const fc = require('fast-check');
const { getShortSha } = require('../../utils/docker');

describe('getShortSha - Docker image tag generation', () => {
  /**
   * Property 9: Tagging d'image Docker
   * Validates: Requirements 6.2
   *
   * For any 40-character hexadecimal Git SHA, getShortSha must produce
   * exactly 7 hexadecimal characters without extra truncation or parasitic characters.
   */
  test('produces exactly 7 characters for any valid 40-char hex SHA', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[0-9a-f]{40}$/),
        (sha) => {
          const shortSha = getShortSha(sha);
          return shortSha.length === 7;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('result contains only hexadecimal characters for any valid 40-char hex SHA', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[0-9a-f]{40}$/),
        (sha) => {
          const shortSha = getShortSha(sha);
          return /^[0-9a-f]{7}$/.test(shortSha);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('result is the prefix of the original SHA', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[0-9a-f]{40}$/),
        (sha) => {
          const shortSha = getShortSha(sha);
          return sha.startsWith(shortSha);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Example-based tests for specific known values
  test('returns first 7 chars for a known SHA', () => {
    const sha = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
    expect(getShortSha(sha)).toBe('a1b2c3d');
  });

  test('returns first 7 chars for all-zeros SHA', () => {
    const sha = '0000000000000000000000000000000000000000';
    expect(getShortSha(sha)).toBe('0000000');
  });

  test('returns first 7 chars for all-f SHA', () => {
    const sha = 'ffffffffffffffffffffffffffffffffffffffff';
    expect(getShortSha(sha)).toBe('fffffff');
  });
});
