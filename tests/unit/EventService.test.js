// tests/unit/EventService.test.js
// Unit tests for EventService — all DB calls are mocked via jest.mock

const fc = require('fast-check');

// Mock the database module before requiring EventService
jest.mock('../../database');

const db = require('../../database');
const EventService = require('../../services/EventService');

// =====================================================================
// computeMatchResult
// =====================================================================

describe('EventService.computeMatchResult', () => {
  test('retourne "win" quand le score domicile est supérieur', () => {
    expect(EventService.computeMatchResult(3, 1)).toBe('win');
    expect(EventService.computeMatchResult(1, 0)).toBe('win');
    expect(EventService.computeMatchResult(10, 9)).toBe('win');
  });

  test('retourne "loss" quand le score domicile est inférieur', () => {
    expect(EventService.computeMatchResult(0, 1)).toBe('loss');
    expect(EventService.computeMatchResult(1, 3)).toBe('loss');
    expect(EventService.computeMatchResult(9, 10)).toBe('loss');
  });

  test('retourne "draw" quand les scores sont égaux', () => {
    expect(EventService.computeMatchResult(0, 0)).toBe('draw');
    expect(EventService.computeMatchResult(2, 2)).toBe('draw');
    expect(EventService.computeMatchResult(5, 5)).toBe('draw');
  });
});

// =====================================================================
// Propriété 4 : Résultat de match
// Validates: Requirements 3.9
// =====================================================================

describe('Propriété 4 : Résultat de match', () => {
  test(
    'computeMatchResult retourne exactement "win", "loss" ou "draw" selon la comparaison des scores',
    () => {
      fc.assert(
        fc.property(
          fc.nat(),
          fc.nat(),
          (scoreHome, scoreAway) => {
            const result = EventService.computeMatchResult(scoreHome, scoreAway);

            if (scoreHome > scoreAway) {
              return result === 'win';
            } else if (scoreHome < scoreAway) {
              return result === 'loss';
            } else {
              return result === 'draw';
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
