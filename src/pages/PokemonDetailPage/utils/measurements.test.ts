import { describe, expect, it } from 'vitest'
import { readBackSearch, statPercent, tenthsToUnit } from './measurements'

describe('measurements', () => {
  it('converts tenths to the display unit', () => {
    expect(tenthsToUnit(7)).toBe(0.7)
    expect(tenthsToUnit(69)).toBe(6.9)
  })

  it('scales stat bars against the maximum and caps at 100%', () => {
    expect(statPercent(0)).toBe(0)
    expect(statPercent(45)).toBe(18)
    expect(statPercent(255)).toBe(100)
    expect(statPercent(999)).toBe(100)
  })

  it('only accepts a query string as the way back', () => {
    expect(readBackSearch({ from: '?page=3&q=pi' })).toBe('?page=3&q=pi')
    expect(readBackSearch({ from: 'https://evil.example' })).toBe('')
    expect(readBackSearch({ from: 42 })).toBe('')
    expect(readBackSearch(null)).toBe('')
    expect(readBackSearch(undefined)).toBe('')
  })
})
