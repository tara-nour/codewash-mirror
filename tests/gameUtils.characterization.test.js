import { describe, it, expect } from 'vitest'
import {
  getDifficultyMultiplier,
  calculateDamage,
  calculateMobHealth,
  getExpectedDifficulty,
  calculateXPReward,
  calculateXPToLevel,
  getEncounterType,
} from '../src/utils/gameUtils'

/**
 * Characterization tests — they record what the code DOES, not what it SHOULD do.
 *
 * Every expectation below was read off the received version of the project
 * (baseline commit 03b3be6). If one of them breaks during a refactoring, the
 * behaviour changed: either that was intended, and the test is updated in the
 * same commit with a note, or it was not, and the refactoring is wrong.
 *
 * Quirks of the current implementation are asserted on purpose and marked
 * QUIRK. Do not "fix" them here — they belong in docs/DEBT.md.
 */

describe('getDifficultyMultiplier', () => {
  it('grows as 3^(difficulty-1) across the seven difficulties', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(getDifficultyMultiplier)).toEqual([
      1, 3, 9, 27, 81, 243, 729,
    ])
  })
})

describe('combat scaling', () => {
  it('deals 12 damage at difficulty 1, scaled by the difficulty multiplier', () => {
    expect(calculateDamage(1, 1)).toBe(12)
    expect(calculateDamage(1, 3)).toBe(108)
  })

  it('QUIRK: ignores playerLevel entirely — the parameter is dead', () => {
    expect(calculateDamage(1, 4)).toBe(calculateDamage(999, 4))
  })

  it('gives mobs exactly five hits of health at every difficulty', () => {
    for (const difficulty of [1, 2, 3, 4, 5, 6, 7]) {
      expect(calculateMobHealth(difficulty)).toBe(calculateDamage(1, difficulty) * 5)
    }
  })
})

describe('getExpectedDifficulty', () => {
  it('unlocks one difficulty every 20 levels', () => {
    expect(getExpectedDifficulty(1)).toBe(1)
    expect(getExpectedDifficulty(20)).toBe(1)
    expect(getExpectedDifficulty(21)).toBe(2)
    expect(getExpectedDifficulty(40)).toBe(2)
    expect(getExpectedDifficulty(121)).toBe(7)
  })

  it('caps at difficulty 7 however high the level goes', () => {
    expect(getExpectedDifficulty(999)).toBe(7)
  })
})

describe('XP economy', () => {
  it('keeps the "one kill, one level" invariant on the optimal path', () => {
    // Playing at exactly the expected difficulty, one mob is worth one level.
    for (const level of [1, 21, 41, 61]) {
      const difficulty = getExpectedDifficulty(level)
      expect(calculateXPReward(difficulty, level)).toBe(
        calculateXPToLevel(difficulty, level),
      )
    }
  })

  it('penalises playing below the expected difficulty by 70 % per step', () => {
    // At level 21 the expected difficulty is 2.
    expect(calculateXPReward(2, 21)).toBe(596) // on the optimal path
    expect(calculateXPReward(1, 21)).toBe(59) // one step below: 198 * 0.3
  })

  it('grants the full reward when playing above the expected difficulty', () => {
    // At level 1 the expected difficulty is 1, so difficulty 5 is overkill
    // and pays in full: 100 base XP times the 81x difficulty multiplier.
    expect(calculateXPReward(5, 1)).toBe(8100)
    expect(calculateXPReward(1, 1)).toBe(100)
  })

  it('QUIRK: falls back to a different, level-free formula when playerLevel is omitted', () => {
    expect(calculateXPReward(1)).toBe(100)
    expect(calculateXPReward(3)).toBe(900)
    expect(calculateXPToLevel(1)).toBe(100)
    expect(calculateXPToLevel(3)).toBe(900)
  })
})

describe('getEncounterType', () => {
  it('runs a 20-level cycle: miniboss on 10, boss on 20, hostile otherwise', () => {
    const cycle = Array.from({ length: 20 }, (_, i) => getEncounterType(i + 1))
    expect(cycle[9]).toBe('miniboss')
    expect(cycle[19]).toBe('boss')
    expect(cycle.filter((t) => t === 'hostile')).toHaveLength(18)
  })

  it('repeats the same cycle on the next twenty levels', () => {
    for (let level = 1; level <= 20; level += 1) {
      expect(getEncounterType(level + 20)).toBe(getEncounterType(level))
    }
  })
})
