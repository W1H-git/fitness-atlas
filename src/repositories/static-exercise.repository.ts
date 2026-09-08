import catalog from '../data/exercises.generated.json'
import type { ExerciseRepository } from '../types/repository'
import { parseCatalog } from '../utils/validate-catalog'

export function createStaticExerciseRepository(): ExerciseRepository {
  const exercises = parseCatalog(catalog)
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  return {
    async list() {
      return structuredClone(exercises)
    },
    async findById(id) {
      return structuredClone(byId.get(id) ?? null)
    },
  }
}
