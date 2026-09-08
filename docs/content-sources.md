# 动作数据、素材和本地说明

## 锁定来源

- 包：@bryllim/workout-guide，固定版本 1.0.0（开发依赖）。
- 项目：https://github.com/bryllim/workout-guide
- 集成指南：https://bryllim.github.io/workout-guide/guide/
- 以 npm 实际发布的 manifest.json 和 assets 为准。网站现有指南描述 SVG，但 1.0.0 包实际是 906 张透明背景白线 PNG，均为 512 × 512。
- 本地素材原样复制到 public/exercises/<slug>/1.png、2.png、3.png，不转码、不改色。
- src/data/catalog-source.json 保存源 manifest 的 SHA-256、每张图片的 SHA-256、数量与总字节数。
- npm lockfile 额外记录发布包下载地址及完整性信息。更换来源版本必须重新审核差异，不追随 main 分支自动更新。

## 上游字段与本地字段

上游提供：英文名、ID、slug、主次肌群、器械、运动计量类型、是否拉伸、三帧图片和每帧署名。
本地使用 slug 作为稳定动作 ID，同时保留 upstreamId；名称更新不能改变已保存记录的动作引用。

本地编写：中文名与别名、难度、动作类别、动作模式、三段文字步骤、常见错误、变式说明、必要器械和推荐资格。
这些字段放在 exercise-content.zh-CN.json，editorialSource 明确为 fitness-atlas，不声称来自上游。
说明按动作类别编写，并补充具体变式差异；是首版教学摘要，未经过专业教练逐项认证。

以 JSON 为本地内容的唯一编辑入口。不要手改 exercises.generated.json。
修改 JSON 后运行 npm run catalog:import，再运行 npm run catalog:check 和 npm test。

## 视觉核对结果与第三阶段展示约束

本阶段逐批查看了完整目录的六批三帧缩略图，并另外查看了推荐候选集合。

1. 图解为白色线条，必须放在深色底板上。白色页面可保留，但图片容器使用 #1c1c1c。
2. 三帧不是统一的准备／执行／返回顺序，部分静态动作三帧变化很小。图片使用“图 1、图 2、图 3”，文字步骤单独排列，不将 steps[i] 当作 frames[i] 的图注。
3. illustrationNotes 记录发现的图文或器械差异；第三阶段详情页须显示这些说明。不要把这类动作作为连续动画教学。
4. 保留完整上游图鉴，不擅自更换图片或改变上游 ID。存在差异的条目全部 recommendationEligible=false。
5. catalog-reviewed 表示已进行目录与缩略图核对，并不代表图解无误；recommendation-reviewed 表示另外核对了文字、器械、计量方式，纳入首版保守候选集，并非医疗或专业认证。
6. 目前 23 个动作可参与后续排课，22 个条目带有明确的图解差异说明。其余条目可浏览，但没有自动排课资格。

可用此命令核对当前数量：

```powershell
npm run catalog:check
```

差异示例：游泳使用陆上模拟器图；海豹开合跳显示双杠支撑；站姿躯干活动图中包含负重坐姿转体；部分下拉图帧与胸前下拉说明不一致。具体差异保存在对应动作 illustrationNotes 中。

## 计量口径

- measurement 和 load 分开建模：绳索静态保持是计时动作，但仍记录配重。
- 自重动作不填公斤；徒手辅助单腿蹲不是配重辅助机。
- 辅助引体、辅助臂屈伸记录辅助重量，越大通常越容易。
- 双哑铃按每只记重；单只哑铃双手持握的高脚杯蹲、单哑铃臂屈伸等按该只总重记录。
- 哑铃相扑硬拉在本图鉴采用双哑铃版本，按每只记重；哑铃相扑深蹲为单只版本。
- 杠铃按含杆总重；史密斯注明该机器有效杆重加片，不能跨机器直接比较。
- 配重片、绳索、器械记录显示重量，同一动作也须以 TrainingRecord.equipmentKey 区分机器与设置。
- 弹力带使用型号／阻力等级，不强行换算公斤。
- 英文主器械字段保持上游原值；requiredEquipment 补充排课所需的凳、架、单杠等。

## 导入与验证

npm run catalog:import：先完整验证输入与906张PNG，再生成目录、来源清单和许可证文件。
npm run catalog:import -- --check：只检查，不写入。
npm run catalog:check：检查类型结构、中文非空、唯一 ID、三帧顺序、路径、512×512尺寸、全部哈希及可复现性。

导入无需运行时网络访问。首次 npm ci 下载依赖；之后从固定版本 node_modules 复制。
格式化工具跳过生成文件与原始许可证，避免更改原始内容或影响字节级验证。

## 署名

每个动作和每一帧都保留 attribution；原始许可证复制到 public/licenses/workout-guide/。
第三阶段应在图鉴界面显示可访问的署名链接，支持 Vite BASE_URL 子路径。
