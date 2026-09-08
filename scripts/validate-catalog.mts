import { prepareCatalog, checkOutputs } from './catalog-lib.mts'

const { catalog, outputs } = await prepareCatalog()
await checkOutputs(outputs)
console.log(
  JSON.stringify(
    {
      exercises: catalog.length,
      frames: catalog.length * 3,
      recommendationEligible: catalog.filter((item) => item.recommendationEligible).length,
      checks: [
        'schema',
        'Chinese content',
        'unique IDs',
        'frame order',
        'PNG dimensions',
        'SHA-256',
        'licenses',
        'reproducibility',
      ],
    },
    null,
    2,
  ),
)
