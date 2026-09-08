import { prepareCatalog, writeOutputs, checkOutputs } from './catalog-lib.mts'

const { catalog, outputs } = await prepareCatalog()
if (process.argv.includes('--check')) {
  await checkOutputs(outputs)
  console.log(
    'Catalog is reproducible; all generated files match the pinned package and local content.',
  )
} else {
  await writeOutputs(outputs)
  await checkOutputs(outputs)
  console.log(`Imported ${catalog.length} exercises and ${catalog.length * 3} original PNG frames.`)
}
