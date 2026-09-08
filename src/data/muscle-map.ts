import type { Muscle } from '../types/exercise'

export type Region =
  | 'chest'
  | 'deltoids'
  | 'rear-delts'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'hip-flexors'
  | 'adductors'
  | 'quads'
  | 'calves'
  | 'upper-back'
  | 'lats'
  | 'lower-back'
  | 'glutes'
  | 'hamstrings'

/** Original, simplified body diagram. Broad upstream labels map to multiple regions. */
export const muscleRegions: Record<Muscle, readonly Region[]> = {
  Adductors: ['adductors'],
  Back: ['upper-back', 'lats', 'lower-back'],
  Biceps: ['biceps'],
  Calves: ['calves'],
  Cardio: [],
  Chest: ['chest'],
  Core: ['abs', 'obliques'],
  Forearms: ['forearms'],
  Glutes: ['glutes'],
  Grip: ['forearms'],
  Groin: ['adductors'],
  Hamstrings: ['hamstrings'],
  Hips: ['hip-flexors', 'glutes'],
  Lats: ['lats'],
  Legs: ['quads', 'hamstrings', 'adductors', 'calves'],
  'Lower Back': ['lower-back'],
  Mobility: [],
  'Posterior Chain': ['upper-back', 'lower-back', 'glutes', 'hamstrings', 'calves'],
  Quads: ['quads'],
  'Rear Delts': ['rear-delts'],
  Shoulders: ['deltoids', 'rear-delts'],
  Triceps: ['triceps'],
  'Upper Back': ['upper-back'],
}

export interface MuscleShape {
  region: Region
  d: string
}
export const frontShapes: MuscleShape[] = [
  { region: 'deltoids', d: 'M85 77 Q72 79 66 94 L64 112 Q73 110 80 98 Z' },
  { region: 'chest', d: 'M88 78 Q104 78 117 83 L117 112 Q99 121 81 107 L84 89 Z' },
  { region: 'biceps', d: 'M63 117 L76 108 Q75 133 67 149 L57 146 Z' },
  { region: 'forearms', d: 'M56 153 L65 157 Q57 188 48 209 L40 205 Z' },
  {
    region: 'abs',
    d: 'M108 120 L117 119 L117 137 L107 137 Z M107 142 L117 142 L117 158 L108 158 Z M108 163 L117 163 L117 182 L110 179 Z',
  },
  { region: 'obliques', d: 'M86 120 L102 123 L102 171 L95 177 L90 153 Z' },
  { region: 'hip-flexors', d: 'M94 184 L111 190 L116 211 L105 212 L93 202 Z' },
  { region: 'quads', d: 'M92 220 L105 224 L104 257 L108 284 L102 305 L91 302 Q85 259 92 220 Z' },
  { region: 'adductors', d: 'M110 221 L118 220 L116 267 L111 281 L109 254 Z' },
  { region: 'calves', d: 'M93 321 L106 321 Q112 339 103 366 L98 385 L91 382 L93 356 Z' },
]
export const backShapes: MuscleShape[] = [
  { region: 'rear-delts', d: 'M83 77 Q71 81 65 96 L65 111 L77 104 L84 88 Z' },
  { region: 'upper-back', d: 'M106 65 L117 66 L117 142 L91 116 L82 82 Z' },
  { region: 'lats', d: 'M84 109 L114 148 L108 177 L95 173 L89 148 Z' },
  { region: 'lower-back', d: 'M111 155 L117 152 L117 193 L100 184 L100 178 L108 180 Z' },
  { region: 'triceps', d: 'M64 117 L76 111 L72 138 L65 150 L56 145 Z' },
  { region: 'forearms', d: 'M55 153 L65 157 L48 209 L40 205 Z' },
  { region: 'glutes', d: 'M96 192 Q108 196 117 199 L117 224 Q103 237 89 224 L91 207 Z' },
  { region: 'hamstrings', d: 'M91 233 Q105 242 116 232 L114 279 L108 306 L93 304 L89 270 Z' },
  {
    region: 'calves',
    d: 'M93 320 L107 320 Q115 347 103 366 L99 386 L92 382 L94 360 Q88 342 93 320 Z',
  },
]
