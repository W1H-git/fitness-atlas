import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import type { Exercise as UpstreamExercise } from '@bryllim/workout-guide'
import type { Exercise, ExerciseContent, LoadConvention } from '../src/types/exercise.ts'
import { contentSchema, parseCatalog } from '../src/utils/validate-catalog.ts'

export const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const packageRoot = path.dirname(require.resolve('@bryllim/workout-guide/package.json'))
export const expectedVersion = '1.0.0'
export const sha256 = (bytes: Uint8Array | string) =>
  createHash('sha256').update(bytes).digest('hex')

function loadConvention(item: UpstreamExercise): LoadConvention {
  if (item.equipment === 'Resistance Band')
    return { kind: 'band', label: '记录弹力带型号或阻力等级，不换算公斤' }
  if (item.exerciseType === 'assisted_bodyweight') {
    return {
      kind: 'assistance',
      unit: 'kg',
      basis: 'machine-stack',
      label: '辅助重量（公斤，越大通常越容易）',
    }
  }
  if (
    item.exerciseType === 'weight_reps' ||
    item.slug === 'farmer-carry' ||
    item.slug === 'cable-pallof-hold'
  ) {
    if (item.equipment === 'Barbell')
      return { kind: 'external', unit: 'kg', basis: 'total', label: '含杆总重（公斤）' }
    const singleImplement = new Set([
      'goblet-squat',
      'heel-elevated-goblet-squat',
      'dumbbell-sumo-squat',
      'dumbbell-glute-bridge',
      'dumbbell-hip-thrust',
      'single-dumbbell-skullcrusher',
      'dumbbell-overhead-tricep-extension',
      'weighted-russian-twist',
    ])
    if (item.equipment === 'Dumbbell' && !singleImplement.has(item.slug)) {
      return { kind: 'external', unit: 'kg', basis: 'per-hand', label: '每只哑铃重量（公斤）' }
    }
    if (item.slug.startsWith('smith-machine-')) {
      return {
        kind: 'external',
        unit: 'kg',
        basis: 'total',
        label: '该史密斯机有效杆重＋杠铃片（公斤，仅同机比较）',
      }
    }
    if (item.equipment === 'Cable' || item.equipment === 'Machine') {
      return {
        kind: 'external',
        unit: 'kg',
        basis: 'machine-stack',
        label: '该器械标示重量（公斤，仅同机同设置比较）',
      }
    }
    return {
      kind: 'external',
      unit: 'kg',
      basis: 'total',
      label: item.slug.startsWith('weighted-')
        ? '额外负重（公斤，不含体重）'
        : '所持器械总重（公斤）',
    }
  }
  if (
    item.exerciseType === 'bodyweight_reps' ||
    item.equipment === 'Bodyweight' ||
    item.equipment === 'Pull-up Bar'
  ) {
    return { kind: 'bodyweight', label: '自重，不填写外加公斤数' }
  }
  return { kind: 'none', label: '不适用公斤负重' }
}

export interface OutputFile {
  relativePath: string
  bytes: Buffer
}
export async function prepareCatalog(): Promise<{ catalog: Exercise[]; outputs: OutputFile[] }> {
  const packageInfo = JSON.parse(
    await readFile(path.join(packageRoot, 'package.json'), 'utf8'),
  ) as { version: string }
  if (packageInfo.version !== expectedVersion)
    throw new Error('Unexpected upstream package version')
  const rawManifest = await readFile(path.join(packageRoot, 'manifest.json'))
  const upstream = JSON.parse(rawManifest.toString('utf8')) as UpstreamExercise[]
  if (!Array.isArray(upstream) || upstream.length !== 302)
    throw new Error('Unexpected upstream catalog size')
  const content = z
    .record(z.string(), contentSchema)
    .parse(
      JSON.parse(await readFile(path.join(root, 'src/data/exercise-content.zh-CN.json'), 'utf8')),
    ) as Record<string, ExerciseContent>
  const ids = upstream.map((item) => item.slug)
  if (Object.keys(content).length !== ids.length || ids.some((id) => !content[id])) {
    throw new Error('Local content IDs must exactly match the upstream catalog')
  }
  const outputs: OutputFile[] = []
  const hashes: Record<string, string> = {}
  const unparsed = []
  for (const item of upstream) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)) throw new Error('Invalid upstream slug')
    if (item.frames.length !== 3) throw new Error('Missing upstream frames: ' + item.slug)
    const frames = []
    for (const [offset, frame] of item.frames.entries()) {
      const index = offset + 1
      const expectedPath = `assets/${item.slug}/frame-${index}.png`
      if (frame.path !== expectedPath || frame.index !== index || frame.format !== 'png') {
        throw new Error('Unexpected upstream frame: ' + item.slug)
      }
      const bytes = await readFile(path.join(packageRoot, expectedPath))
      if (
        bytes.length < 24 ||
        bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
        bytes.readUInt32BE(16) !== 512 ||
        bytes.readUInt32BE(20) !== 512
      ) {
        throw new Error('Invalid PNG or dimensions: ' + expectedPath)
      }
      const framePath = `exercises/${item.slug}/${index}.png`
      outputs.push({ relativePath: 'public/' + framePath, bytes })
      hashes[framePath] = sha256(bytes)
      frames.push({ ...frame, path: framePath })
    }
    unparsed.push({
      ...content[item.slug],
      id: item.slug,
      upstreamId: item.id,
      nameEn: item.name,
      primaryMuscle: item.primaryMuscle,
      secondaryMuscles: item.secondaryMuscles,
      equipment: item.equipment,
      isStretch: item.isStretch,
      measurement:
        item.exerciseType === 'duration'
          ? 'duration'
          : item.exerciseType === 'distance_duration'
            ? 'distance-duration'
            : 'reps',
      load: loadConvention(item),
      frames,
      attribution: item.attribution,
      sourceVersion: expectedVersion,
    })
  }
  const catalog = parseCatalog(unparsed)
  const addJson = (relativePath: string, value: unknown) => {
    outputs.push({ relativePath, bytes: Buffer.from(JSON.stringify(value, null, 2) + '\n') })
  }
  addJson('src/data/exercises.generated.json', catalog)
  addJson('src/data/catalog-source.json', {
    package: '@bryllim/workout-guide',
    version: expectedVersion,
    repository: 'https://github.com/bryllim/workout-guide',
    upstreamManifestSha256: sha256(rawManifest),
    exerciseCount: catalog.length,
    frameCount: Object.keys(hashes).length,
    totalImageBytes: outputs
      .filter((file) => file.relativePath.endsWith('.png'))
      .reduce((sum, file) => sum + file.bytes.length, 0),
    assetsSha256: hashes,
  })
  for (const name of ['LICENSE', 'LICENSE-ASSETS', 'LICENSES.md', 'ATTRIBUTION.md']) {
    outputs.push({
      relativePath: 'public/licenses/workout-guide/' + name,
      bytes: await readFile(path.join(packageRoot, name)),
    })
  }
  return { catalog, outputs }
}

export async function checkOutputs(outputs: OutputFile[]): Promise<void> {
  for (const output of outputs) {
    const actual = await readFile(path.join(root, output.relativePath))
    if (!actual.equals(output.bytes))
      throw new Error('Stale or modified output: ' + output.relativePath)
  }
  const actualFrames = (
    await readdir(path.join(root, 'public/exercises'), { recursive: true })
  ).filter((name) => /\.(png|svg)$/i.test(name))
  if (actualFrames.length !== 906) throw new Error('Unexpected extra or missing frame files')
}

export async function writeOutputs(outputs: OutputFile[]): Promise<void> {
  // Preflight reads and validates every source before any output is written.
  for (const output of outputs) {
    const target = path.join(root, output.relativePath)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, output.bytes)
  }
}
