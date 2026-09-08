import { createServices } from '../src/services/create-services.ts'
const services = createServices({ baseUrl: '/fitness-atlas/' })
const all = await services.exercises.search()
const chest = await services.exercises.search({ query: '哑铃 胸部' })
console.log(`动作总数：${all.length}，三帧素材：${all.length * 3}`)
console.table(
  chest.map((item) => ({
    id: item.id,
    name: item.name,
    measurement: item.measurement,
    load: item.load.label,
  })),
)
console.log('平板支撑图片地址：', await services.exercises.getFrameUrls('plank'))
console.log('初始用户档案：', await services.profile.get())
