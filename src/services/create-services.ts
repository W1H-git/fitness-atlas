import { createStaticExerciseRepository } from '../repositories/static-exercise.repository'
import { createMemoryUserRepository } from '../repositories/memory-user.repository'
import type { ExerciseRepository } from '../types/repository'
import type { LocalDataRepository } from '../types/local-data'
import { createTrainingService } from './training.service'
import { createBackupService } from './backup.service'
import { createExerciseService } from './exercise.service'
import { createRecommendationService } from './recommendation.service'
import { parseProfile } from '../utils/validate-profile'

export function createServices(
  options: {
    exercises?: ExerciseRepository
    users?: LocalDataRepository
    baseUrl?: string
  } = {},
) {
  const users = options.users ?? createMemoryUserRepository()
  const exercises = options.exercises ?? createStaticExerciseRepository()
  return {
    exercises: createExerciseService(exercises, options.baseUrl),
    profile: {
      get: () => users.getProfile(),
      save: async (value: unknown) => users.saveProfile(parseProfile(value)),
    },
    recommendations: createRecommendationService(exercises, users),
    training: { ...createTrainingService(users, exercises), save: users.saveRecord.bind(users) },
    backup: createBackupService(users, exercises),
    plans: { get: users.getPlan.bind(users), save: users.savePlan.bind(users) },
  }
}
