import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { muscleLabels } from '../src/types/exercise'
import { frontShapes, backShapes, muscleRegions } from '../src/data/muscle-map'
import { useExerciseStore } from '../src/stores/exercise.store'

describe('muscle diagram semantics', () => {
  it('covers every catalog label using actual drawable regions', () => {
    expect(Object.keys(muscleRegions).sort()).toEqual(Object.keys(muscleLabels).sort())
    const drawn = new Set([...frontShapes, ...backShapes].map((shape) => shape.region))
    for (const regions of Object.values(muscleRegions))
      expect(regions.every((region) => drawn.has(region))).toBe(true)
  })
  it('keeps chest and the two sides of the thigh separate', () => {
    expect(muscleRegions.Chest).toEqual(['chest'])
    expect(muscleRegions.Quads).toEqual(['quads'])
    expect(muscleRegions.Hamstrings).toEqual(['hamstrings'])
    expect(frontShapes.some((shape) => shape.region === 'chest')).toBe(true)
    expect(backShapes.some((shape) => shape.region === 'chest')).toBe(false)
    expect(backShapes.some((shape) => shape.region === 'hamstrings')).toBe(true)
  })
  it('does not pretend cardio or mobility are a single muscle', () => {
    expect(muscleRegions.Cardio).toEqual([])
    expect(muscleRegions.Mobility).toEqual([])
  })
})
describe('catalog state across navigation and filtering', () => {
  beforeEach(() => setActivePinia(createPinia()))
  it('preserves filters across repeat loads and resets pagination on filter changes', async () => {
    const store = useExerciseStore()
    await Promise.all([store.load(), store.load()])
    expect(store.items).toHaveLength(302)
    expect(store.visible).toHaveLength(12)
    store.showMore()
    expect(store.visible).toHaveLength(24)
    store.query = '卧推'
    expect(store.visible.length).toBeLessThanOrEqual(12)
    store.equipment = 'Dumbbell'
    await store.load()
    expect(store.query).toBe('卧推')
    expect(store.results.every((item) => item.equipment === 'Dumbbell')).toBe(true)
    expect(store.results.length).toBeGreaterThan(0)
    store.resetFilters()
    expect(store.results).toHaveLength(302)
    expect(store.visible).toHaveLength(12)
    expect(store.activeFilters).toBe(0)
    expect(store.find('not-an-id')).toBeNull()
  })
})
