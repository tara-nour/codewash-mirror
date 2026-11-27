import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import App from '../src/App'

/**
 * Characterization tests on the profile and save flow.
 *
 * This is the most critical state path in the game: everything a child earns
 * lives in localStorage and nowhere else. There is no server, no export, no
 * second copy. A regression here loses real progress.
 *
 * The logic is not importable — `getStorageKey` and `loadSkills` are declared
 * inside the `App` component — so the only way to cover it without refactoring
 * blind is to render the application and observe what it writes. That is what
 * these tests do, and it is also the worked example to copy for any component
 * test the missions will need.
 *
 * They record current behaviour, bugs included. QUIRK marks a behaviour that
 * is asserted on purpose and belongs in docs/DEBT.md, not in a drive-by fix.
 */

const SKILL_IDS = ['reading', 'math', 'writing', 'cleaning', 'memory', 'patterns']

const readJSON = (key) => JSON.parse(localStorage.getItem(key))

describe('first launch', () => {
  it('writes the six keys a fresh install needs', () => {
    render(<App />)

    expect(Object.fromEntries(
      Array.from({ length: localStorage.length }, (_, i) => {
        const key = localStorage.key(i)
        return [key, typeof localStorage.getItem(key)]
      }),
    )).toEqual({
      currentProfile_v1: 'string',
      heroProfileNames_v1: 'string',
      heroParentStatus_v1: 'string',
      heroSkills_v23_p1: 'string',
      borderEffect_p1: 'string',
      borderColor_p1: 'string',
    })
  })

  it('starts on profile 1, with three unnamed players and no parental unlock', () => {
    render(<App />)

    expect(localStorage.getItem('currentProfile_v1')).toBe('1')
    expect(readJSON('heroProfileNames_v1')).toEqual({
      1: 'Player 1',
      2: 'Player 2',
      3: 'Player 3',
    })
    expect(readJSON('heroParentStatus_v1')).toEqual({ 1: false, 2: false, 3: false })
  })

  it('creates the six skills at level 1, difficulty 1, no XP and no badge', () => {
    render(<App />)

    const { skills } = readJSON('heroSkills_v23_p1')
    expect(Object.keys(skills).sort()).toEqual([...SKILL_IDS].sort())

    for (const id of SKILL_IDS) {
      expect(skills[id]).toMatchObject({
        level: 1,
        xp: 0,
        difficulty: 1,
        earnedBadges: [],
      })
    }
  })

  it('saves the theme and the stats alongside the skills', () => {
    render(<App />)

    const save = readJSON('heroSkills_v23_p1')
    expect(Object.keys(save).sort()).toEqual(['skills', 'stats', 'theme'])
    expect(save.stats).toMatchObject({ totalMobsDefeated: 0, achievementsUnlocked: [] })
  })

  it('QUIRK: draws the starting mob at random, so no two fresh saves are alike', () => {
    // A brand new profile is already non-deterministic. Any test asserting a
    // full save blob would be flaky, and two children starting the game get
    // different content with no way to reproduce a bug report.
    const mobs = new Set()
    for (let run = 0; run < 12; run += 1) {
      localStorage.clear()
      const { unmount } = render(<App />)
      mobs.add(readJSON('heroSkills_v23_p1').skills.reading.currentMob)
      unmount()
    }
    expect(mobs.size).toBeGreaterThan(1)
  })
})

describe('loading an existing profile', () => {
  it('restores a saved profile instead of resetting it', () => {
    localStorage.setItem(
      'heroSkills_v23_p1',
      JSON.stringify({ skills: { reading: { level: 42, xp: 7, difficulty: 3 } } }),
    )

    render(<App />)

    const { skills } = readJSON('heroSkills_v23_p1')
    expect(skills.reading).toMatchObject({ level: 42, xp: 7, difficulty: 3 })
    // Skills absent from the save fall back to their defaults.
    expect(skills.math).toMatchObject({ level: 1, xp: 0 })
  })

  it('backfills fields a saved profile predates', () => {
    // A save written before difficulty and badges existed must still load.
    localStorage.setItem(
      'heroSkills_v23_p1',
      JSON.stringify({ skills: { reading: { level: 10, xp: 3 } } }),
    )

    render(<App />)

    expect(readJSON('heroSkills_v23_p1').skills.reading).toMatchObject({
      level: 10,
      xp: 3,
      difficulty: 1,
      earnedBadges: [],
    })
  })
})

describe('legacy save migration', () => {
  it('adopts the pre-profile `heroSkills_v23` key into profile 1', () => {
    localStorage.setItem(
      'heroSkills_v23',
      JSON.stringify({ skills: { math: { level: 23, xp: 11 } } }),
    )

    render(<App />)

    expect(readJSON('heroSkills_v23_p1').skills.math).toMatchObject({
      level: 23,
      xp: 11,
    })
  })

  it('accepts the older shape where skills sat at the top level', () => {
    localStorage.setItem('heroSkills_v23', JSON.stringify({ math: { level: 5 } }))

    render(<App />)

    expect(readJSON('heroSkills_v23_p1').skills.math).toMatchObject({ level: 5 })
  })

  it('QUIRK: migrates by copy and never deletes the legacy key', () => {
    // The old key survives forever. It is only read when no profile 1 save
    // exists, so a player who resets profile 1 silently travels back in time
    // to their pre-migration progress.
    localStorage.setItem(
      'heroSkills_v23',
      JSON.stringify({ skills: { math: { level: 23 } } }),
    )

    render(<App />)

    expect(localStorage.getItem('heroSkills_v23')).not.toBeNull()
  })

  it('QUIRK: only profile 1 can inherit the legacy save', () => {
    // Profiles 2 and 3 ignore it entirely, by an explicit `profileId === 1`.
    localStorage.setItem('currentProfile_v1', '2')
    localStorage.setItem(
      'heroSkills_v23',
      JSON.stringify({ skills: { math: { level: 23 } } }),
    )

    render(<App />)

    expect(readJSON('heroSkills_v23_p2').skills.math).toMatchObject({ level: 1 })
  })
})

describe('corrupt storage', () => {
  it('falls back to a fresh profile rather than crashing on invalid JSON', () => {
    localStorage.setItem('heroSkills_v23_p1', 'not json at all')

    expect(() => render(<App />)).not.toThrow()
    expect(readJSON('heroSkills_v23_p1').skills.reading).toMatchObject({ level: 1 })
  })
})
