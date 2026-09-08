import type { ExerciseFilters, ExerciseFrame } from '../types/exercise'
import type { ExerciseRepository } from '../types/repository'
import { matchesExercise } from '../utils/search'

export function resolveFrameUrl(frame: ExerciseFrame, baseUrl = '/'): string {
  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'
  return base + frame.path
}

export function createExerciseService(repository: ExerciseRepository, baseUrl = '/') {
  return {
    async search(filters: ExerciseFilters = {}) {
      return (await repository.list()).filter((exercise) => matchesExercise(exercise, filters))
    },
    getById(id: string) {
      return repository.findById(id)
    },
    async getFrameUrls(id: string): Promise<[string, string, string] | null> {
      const exercise = await repository.findById(id)
      if (!exercise) return null
      return [
        resolveFrameUrl(exercise.frames[0], baseUrl),
        resolveFrameUrl(exercise.frames[1], baseUrl),
        resolveFrameUrl(exercise.frames[2], baseUrl),
      ]
    },
  }
}
