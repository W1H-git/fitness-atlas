# 阶段 2：数据层学习与验收

## 本阶段的分层

```text
types/          数据契约，对应 Java interface / DTO
data/           固定目录、中文内容和周计划模板
repositories/   读取或保存数据，对应 Repository / DAO
services/       对外提供数据能力，通过参数接收 Repository
utils/          搜索与数据校验纯函数
scripts/        在 Node.js 中运行的导入与校验程序
tests/          Vitest 单元测试及数据集集成测试
```

createServices() 为每个应用实例组装独立的服务。传入替代 Repository 就能进行测试；
以后把内存实现换成 IndexedDB，不需要重写搜索服务。

内存仓库仅在当前进程里保存数据，重启会清空。本地持久化按原计划在阶段5完成。

## TypeScript 要点

- interface 表达数据结构，不需要 new。数据存入 JSON 后也不丢失类方法，因为本来就没有类方法。
- Triple<T> 是固定三项元组；普通 T[] 可以任意长，元组用于确保三帧完整。
- 联合类型通过 measurement 或 load.kind 区分分支。计时组必须有 seconds，不能用 reps 替代。
- TypeScript 只提供编译期检查；JSON 运行时通过 Zod 验证，再交给 Repository。
- 存取时 structuredClone 防止调用方修改对象后偷偷改变数据库；同 ID 保存采用更新语义。

## 在 VSCode 终端验证

先确认当前目录是 E:\Vscode\JS\fitness-atlas。

```powershell
npm run catalog:check
npm run data:demo
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
```

预期：

- catalog:check 输出 302 个动作、906 张图、23 个推荐候选。
- data:demo 展示“哑铃 胸部”查询结果；平板支撑图片 URL 带 /fitness-atlas/ 前缀。
- 初始档案为 null，这是尚未设置档案的正常状态。
- 全部测试通过，类型、规范和构建无错误。

浏览器仍是阶段1首页，进度标记更新为阶段2；动作列表和筛选界面在阶段3实现。

运行 npm run dev 后，在网页地址后追加 /exercises/bench-press/1.png 可以直接访问已导入图片。
白色线条需要深色背景才能看清；正式图解容器将在阶段3添加黑色底板。

## 后续阶段必须保留的约束

- UI 通过 Pinia 调用服务，不直接操作 JSON 或浏览器存储。
- createServices({ baseUrl: import.meta.env.BASE_URL }) 用于实际应用，避免部署到子目录时丢图。
- recommendationEligible=false 的条目不参与自动排课。
- 图1/2/3与准备/执行/返回文字步骤不自动一一对应；图解差异须显示。
- 训练记录保留稳定动作 ID、设备标识、计量模式与负重口径。

阶段2验收通过后暂停，确认后再开始阶段3。
