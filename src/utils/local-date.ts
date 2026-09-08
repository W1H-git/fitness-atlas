import type { Weekday } from '../types/profile'

function utcDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('日期格式必须为 YYYY-MM-DD')
  const [year, month, day] = value.split('-').map(Number) as [number, number, number]
  const result = new Date(0)
  result.setUTCHours(0, 0, 0, 0)
  result.setUTCFullYear(year, month - 1, day)
  if (
    result.getUTCFullYear() !== year ||
    result.getUTCMonth() !== month - 1 ||
    result.getUTCDate() !== day
  )
    throw new Error('日期无效')
  return result
}
export function localDate(now = new Date()): string {
  return [
    String(now.getFullYear()).padStart(4, '0'),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}
export function isLocalDate(value: string): boolean {
  try {
    utcDate(value)
    return true
  } catch {
    return false
  }
}
export function addDays(value: string, count: number): string {
  if (!Number.isInteger(count)) throw new Error('日期偏移必须为整数')
  const date = utcDate(value)
  date.setUTCDate(date.getUTCDate() + count)
  return date.toISOString().slice(0, 10)
}
export function weekday(value: string): Weekday {
  return (((utcDate(value).getUTCDay() + 6) % 7) + 1) as Weekday
}
export function weekStart(value: string): string {
  return addDays(value, 1 - weekday(value))
}
export function daysBetween(a: string, b: string): number {
  return (utcDate(b).getTime() - utcDate(a).getTime()) / 86_400_000
}
