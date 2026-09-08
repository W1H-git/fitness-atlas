# 阶段 6：PWA 与离线图鉴

## 新增文件

```text
src/pwa/{sw,register,cache-config,update-guards}.ts
src/services/offline-cache.service.ts
src/stores/offline.store.ts
src/components/pwa/{InstallHint,UpdatePrompt,OfflineDownload}.vue
src/styles/pwa.css
public/icons/{pwa-192,pwa-512,maskable-512}.png
scripts/generate-icons.mts
playwright.pwa.config.ts
tests/e2e/offline.spec.ts
```

修改 Vite、入口、档案页面、应用外框、草稿与计划编辑组件以及类型和测试配置。构建时从既有素材哈希清单生成 exercise-cache-manifest.json，无须手动维护 906 个路径。

依赖固定为 vite-plugin-pwa 1.3.0、Workbox 7.4.1；fast-uri 通过 overrides 限定为 3.1.6，修复构建依赖审计告警，现有直接依赖版本保持不变。

## 启动与验收

```powershell
npm run build
npm run preview -- --host 127.0.0.1
```

打开终端显示的生产预览地址，进入“我的”下方“离线动作图鉴”。npm run dev 保留热更新，默认不注册 Service Worker，不能用于验收离线功能。

1. 等待“应用已可离线打开”，确认可安装提示或浏览器菜单中的安装选项。
2. 点击“下载全部图解”，查看实际缓存数量。906 / 906 且显示完整缓存后，才能承诺全库图解离线可用。
3. 下载期间点“暂停下载”，再点“继续下载／重试”；已存图片无需重复下载。
4. 浏览器开发者工具设置离线，刷新首页、搜索动作并切换三帧图。填写训练结果并保存，刷新历史确认仍存在。
5. 未缓存的图解在离线时显示明确占位；恢复网络后会尝试加载。
6. 在开发者工具仅删除图解 Cache Storage，返回“我的”点击“检查缓存”，应显示实际缺失数量，允许重下；不要删除 IndexedDB 来测试图片缓存。
7. 有新版本时显示更新提示。点击“保存并更新”会先保存训练草稿；保存失败不刷新。正在编辑的档案或训练建议需要先保存／取消。若有此应用其他标签页或窗口，请关闭后更新，避免影响其他页面的未保存输入。
8. “稍后”关闭提示；以后可以从“我的”点击“检查应用更新”重新打开提示。

## 实现与边界

- 使用 vite-plugin-pwa 的 injectManifest 和手动更新模式，策略参考 [插件自定义 Service Worker 文档](https://vite-pwa-org.netlify.app/guide/inject-manifest) 与 [更新提示文档](https://vite-pwa-org.netlify.app/guide/prompt-for-update)。
- 预缓存全部应用 JS、CSS、HTML、文字目录、离线清单、安装图标和本地许可证，不在初次访问强制下载全部图片。
- 浏览图解按 Cache First 缓存；完整下载使用四个并发请求、SHA-256 校验，并支持暂停和重试。每次检查读取 Cache Storage，不依赖容易失真的“已完成”布尔标记。
- 图解缓存名称含部署子路径和素材清单哈希。不同子路径隔离缓存；仅 UI 更新时沿用同版本图片缓存，素材清单变化后清理旧图片版本。
- 静态缓存清理不访问 IndexedDB，也不修改 localStorage 档案。应用更新不会清空训练记录。
- 图标为本项目通过 SVG 图形代码绘制再渲染的黑白哑铃标志，红点呼应目标肌群。可用 npm exec tsx -- scripts/generate-icons.mts 重建。
- 手机安装需浏览器支持和 HTTPS，或本机 localhost 安全环境；首次访问仍需网络。离线安装能力不是公网部署，分享给同学的网址在第七阶段处理。
- 浏览器可能清理缓存；完整图解约 31 MB，不包含应用本身及浏览器缓存开销。训练仍建议定期导出 JSON 备份。
- 端口及主机名不同会隔离本地数据：生产预览地址与原开发地址的档案互不影响，需要时用备份导入／导出迁移。不要把生产与开发长期混用同一端口。
- 部署子路径通过 VITE_BASE_PATH 指定，例如 /fitness-atlas/；manifest、Service Worker scope、图片清单和缓存前缀一起适配。

## 自动检查

```powershell
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run test:e2e
npm run test:pwa
```

普通 UI 测试继续使用 5175 的开发服务；PWA 测试构建后使用 4176 的生产服务，覆盖完整离线图鉴、实际训练保存、续传、缓存清理检测和真实 Service Worker 更新。测试会临时修改 dist/sw.js 来模拟新版本，结束后恢复，不修改源码或用户数据。

2026-09-08 验证结果：85 项单元／数据测试、24 项普通浏览器测试通过；3 项 PWA 测试分别在根路径与 /fitness-atlas/ 子路径通过。涵盖 906 帧离线读取、暂停续传、图片缓存丢失检测、离线训练保存、更新前写入失败保护、多窗口更新阻止，以及更新后草稿和训练记录保留。生产构建预缓存约 1 MB 应用资源，图片单独缓存。构建仍有原有目录大分块提示及插件内部兼容选项弃用提示，不影响构建和上述验证。
