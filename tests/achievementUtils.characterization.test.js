import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getDefaultStats,
  isAchievementUnlocked,
  getCurrentTier,
  getNextTier,
  getTierProgress,
  getNewlyUnlockedAchievements,
  getNewTierAchievements,
  addUniqueToArray,
  recordLoginDate,
  getAchievementDisplayName,
} from '../src/utils/achievementUtils'

/**
 * Characterization tests — they record what the code DOES, not what it SHOULD do.
 *
 * Achievements sit under every mini-game, so this module is on the path of every
 * mission. Freezing it is what makes those missions safe to write.
 *
 * Quirks of the current implementation are asserted on purpose and marked QUIRK.
 * Do not "fix" them here — they belong in docs/DEBT.md.
 */

// Six skills, as SKILL_DATA defines them. `level` is all these helpers read.
const skillsAtLevel = (level) =>
  Object.fromEntries(
    ['reading', 'math', 'writing', 'cleaning', 'memory', 'patterns'].map((id) => [
      id,
      { level },
    ]),
  )

describe('getDefaultStats', () => {
  it('starts every counter at zero and every collection empty', () => {
    expect(getDefaultStats()).toEqual({
      phantomsCaught: 0,
      totalMobsDefeated: 0,
      totalBossesDefeated: 0,
      totalMinibossesDefeated: 0,
      totalDeaths: 0,
      uniqueMobsDefeated: [],
      uniqueBossesDefeated: [],
      uniqueMinibossesDefeated: [],
      themeChanges: 0,
      borderChanges: 0,
      battlesThisSession: 0,
      loginDates: [],
      perfectMemoryGames: 0,
      achievementsUnlocked: [],
    })
  })

  it('hands out a fresh object on every call, so profiles cannot share state', () => {
    const a = getDefaultStats()
    const b = getDefaultStats()
    a.uniqueMobsDefeated.push('Zombie')
    expect(b.uniqueMobsDefeated).toEqual([])
  })
})

describe('isAchievementUnlocked', () => {
  it('returns false for an unknown achievement id', () => {
    expect(isAchievementUnlocked('does_not_exist', getDefaultStats(), {})).toBe(false)
  })

  it('unlocks a one-shot achievement as soon as its condition holds', () => {
    const stats = getDefaultStats()
    expect(isAchievementUnlocked('first_steps', stats, {})).toBe(false)
    stats.totalMobsDefeated = 1
    expect(isAchievementUnlocked('first_steps', stats, {})).toBe(true)
  })

  it('unlocks a tiered achievement only once its FIRST tier is reached', () => {
    const stats = getDefaultStats()
    // phantom_hunter tier 1 is 5 phantoms, so 4 is still locked.
    stats.phantomsCaught = 4
    expect(isAchievementUnlocked('phantom_hunter', stats, {})).toBe(false)
    stats.phantomsCaught = 5
    expect(isAchievementUnlocked('phantom_hunter', stats, {})).toBe(true)
  })
})

describe('tier helpers', () => {
  it('reports -1 until the first tier is reached, then the tier index', () => {
    const stats = getDefaultStats()
    expect(getCurrentTier('phantom_hunter', stats, {})).toBe(-1)
    stats.phantomsCaught = 5
    expect(getCurrentTier('phantom_hunter', stats, {})).toBe(0)
    stats.phantomsCaught = 100
    expect(getCurrentTier('phantom_hunter', stats, {})).toBe(7)
  })

  it('walks the tiers in order and stops at the last one', () => {
    const stats = getDefaultStats()
    stats.phantomsCaught = 5
    expect(getNextTier('phantom_hunter', stats, {})).toEqual({
      level: 10,
      tierName: 'Silver Ghost Buster',
    })
    stats.phantomsCaught = 100
    expect(getNextTier('phantom_hunter', stats, {})).toBeNull()
  })

  it('measures progress inside the current tier, not overall', () => {
    const stats = getDefaultStats()
    // Between tier 1 (5) and tier 2 (10): 7 phantoms is 2 of the 5 needed.
    stats.phantomsCaught = 7
    expect(getTierProgress('phantom_hunter', stats, {})).toBe(40)
    stats.phantomsCaught = 100
    expect(getTierProgress('phantom_hunter', stats, {})).toBe(100)
  })

  it('QUIRK: cannot tell "unknown achievement" from "not tiered"', () => {
    // Both answer with the same value, so a typo in an id is silent.
    expect(getCurrentTier('does_not_exist', getDefaultStats(), {})).toBe(-1)
    expect(getCurrentTier('first_steps', getDefaultStats(), {})).toBe(-1)
    expect(getNextTier('does_not_exist', getDefaultStats(), {})).toBeNull()
    expect(getNextTier('first_steps', getDefaultStats(), {})).toBeNull()
    expect(getTierProgress('does_not_exist', getDefaultStats(), {})).toBe(0)
    expect(getTierProgress('first_steps', getDefaultStats(), {})).toBe(0)
  })
})

describe('progress sources', () => {
  it('combined_levels adds the levels of every skill', () => {
    const stats = getDefaultStats()
    // 6 skills at 20 = 120, past the 100 of tier 1, short of the 200 of tier 2.
    expect(getCurrentTier('combined_levels', stats, skillsAtLevel(20))).toBe(0)
    expect(getCurrentTier('combined_levels', stats, skillsAtLevel(40))).toBe(1)
  })

  it('skill_mastery follows the WEAKEST skill, not the average', () => {
    const stats = getDefaultStats()
    const uneven = { ...skillsAtLevel(160), reading: { level: 1 } }
    expect(getCurrentTier('skill_mastery', stats, uneven)).toBe(-1)
    expect(getCurrentTier('skill_mastery', stats, skillsAtLevel(20))).toBe(0)
  })

  it('QUIRK: skill_mastery on an empty skill set yields Infinity, so every tier unlocks', () => {
    // Math.min() of nothing is Infinity. No caller does this today, but nothing
    // prevents it either.
    expect(getCurrentTier('skill_mastery', getDefaultStats(), {})).toBe(7)
  })
})

describe('transition detection', () => {
  it('reports only achievements that went from locked to unlocked', () => {
    const before = getDefaultStats()
    const after = { ...getDefaultStats(), totalMobsDefeated: 1 }
    expect(getNewlyUnlockedAchievements(before, after, {}, {})).toEqual(['first_steps'])
    // Already unlocked before: not reported again.
    expect(getNewlyUnlockedAchievements(after, after, {}, {})).toEqual([])
  })

  it('reports a tier change only when the tier actually goes up', () => {
    const before = { ...getDefaultStats(), phantomsCaught: 5 }
    const after = { ...getDefaultStats(), phantomsCaught: 10 }
    expect(getNewTierAchievements(before, after, {}, {})).toEqual([
      { achievementId: 'phantom_hunter', tierIndex: 1 },
    ])
    expect(getNewTierAchievements(after, after, {}, {})).toEqual([])
    // Going backwards reports nothing rather than a regression.
    expect(getNewTierAchievements(after, before, {}, {})).toEqual([])
  })
})

describe('addUniqueToArray', () => {
  it('appends a value that is not there yet, without touching the input', () => {
    const original = ['Zombie']
    const result = addUniqueToArray(original, 'Creeper')
    expect(result).toEqual(['Zombie', 'Creeper'])
    expect(original).toEqual(['Zombie'])
  })

  it('QUIRK: returns the SAME array reference when the value is already present', () => {
    // A caller that assumes it always gets a copy will mutate the original.
    const original = ['Zombie']
    expect(addUniqueToArray(original, 'Zombie')).toBe(original)
    expect(addUniqueToArray(original, 'Creeper')).not.toBe(original)
  })
})

describe('recordLoginDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('QUIRK: reads the system clock directly instead of taking a date', () => {
    // The only impure function of this module. It cannot be tested without
    // freezing time, which is exactly the seam the subject asks us to create.
    vi.setSystemTime(new Date('2026-11-25T10:00:00Z'))
    expect(recordLoginDate([])).toEqual(['2026-11-25'])
  })

  it('records a given day only once, however many times it is called', () => {
    vi.setSystemTime(new Date('2026-11-25T10:00:00Z'))
    const first = recordLoginDate([])
    expect(recordLoginDate(first)).toBe(first)

    vi.setSystemTime(new Date('2026-11-26T10:00:00Z'))
    expect(recordLoginDate(first)).toEqual(['2026-11-25', '2026-11-26'])
  })

  it('QUIRK: dates the login in UTC, not in the player\'s timezone', () => {
    // 23:30 UTC on the 25th is already 00:30 on the 26th in Paris, yet the
    // login is filed under the 25th. A child playing just after midnight loses
    // a day towards the `dedicated` achievement, which counts distinct dates.
    vi.setSystemTime(new Date('2026-11-25T23:30:00Z'))
    expect(recordLoginDate([])).toEqual(['2026-11-25'])
  })
})

describe('getAchievementDisplayName', () => {
  it('returns an empty string for an unknown achievement', () => {
    expect(getAchievementDisplayName('does_not_exist', getDefaultStats(), {})).toBe('')
  })

  it('returns the plain name for a one-shot achievement', () => {
    expect(getAchievementDisplayName('first_steps', getDefaultStats(), {})).toBe(
      'First Steps',
    )
  })

  it('swaps in the tier name once a tier is reached', () => {
    const stats = getDefaultStats()
    const base = getAchievementDisplayName('phantom_hunter', stats, {})
    stats.phantomsCaught = 5
    expect(getAchievementDisplayName('phantom_hunter', stats, {})).toBe(
      'Bronze Ghost Buster',
    )
    expect(base).not.toBe('Bronze Ghost Buster')
  })
})
