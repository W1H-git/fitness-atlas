import type { Exercise } from '../types/exercise'
import type { Prescription } from '../types/training'
export function validatePrescription(value: Prescription, exercise: Exercise) {
  const integer = (n: number, min: number, max: number) =>
    Number.isInteger(n) && n >= min && n <= max
  if (
    !integer(value.sets, 1, 10) ||
    !integer(value.restSeconds, 15, 600) ||
    value.measurement !== exercise.measurement
  )
    throw new Error('组数需为1–10，休息需为15–600秒，计量方式需与动作一致')
  if (
    value.measurement === 'reps' &&
    (!integer(value.reps.min, 1, 100) || !integer(value.reps.max, value.reps.min, 100))
  )
    throw new Error('次数需为1–100的整数，且上限不能小于下限')
  if (
    value.measurement === 'duration' &&
    (!integer(value.seconds.min, 5, 3600) || !integer(value.seconds.max, value.seconds.min, 3600))
  )
    throw new Error('时长需为5–3600秒的整数，且上限不能小于下限')
  if (
    value.measurement === 'distance-duration' &&
    (!integer(value.seconds, 5, 3600) ||
      (value.meters !== null && (!Number.isFinite(value.meters) || value.meters <= 0)))
  )
    throw new Error('时间或距离无效')
  if (value.load.status === 'suggested') {
    const load = value.load.value
    if (load.kind !== exercise.load.kind) throw new Error('负重类型不匹配')
    if (load.kind === 'external' || load.kind === 'assistance') {
      if (
        (exercise.load.kind !== 'external' && exercise.load.kind !== 'assistance') ||
        load.basis !== exercise.load.basis ||
        !Number.isFinite(load.kg) ||
        load.kg < 0 ||
        load.kg > 1000 ||
        (load.kind === 'external' && load.kg === 0)
      )
        throw new Error('请填写正确的重量与计量口径')
    }
    if (load.kind === 'band' && !load.resistanceLabel.trim())
      throw new Error('请填写弹力带阻力等级')
  } else if (value.load.convention.kind !== exercise.load.kind) throw new Error('负重类型不匹配')
}
