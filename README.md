# 健身动作图鉴 · Fitness Atlas

公网已发布：[打开健身动作图鉴](https://w1h-git.github.io/fitness-atlas/)。部署与线上验证结果见 docs/stage-7.md；真机安装及人工验收待确认，详见 docs/acceptance-checklist.md。

当前进度：阶段 6，PWA 与离线图鉴已实现。支持302个动作的三帧详情、主要肌群标红、个人日程、训练记录、草稿恢复和 JSON 备份，以及应用安装、906 帧图解下载与手动更新。运行 npm run build，再运行 npm run preview，在生产预览的“我的”中下载完整图鉴。开发模式不启用离线缓存。第六阶段验证见 docs/stage-6.md；公网网址现在可以分享给同学。

## VSCode 启动

在 VSCode 中选择「文件 → 打开文件夹」，打开本 README 所在的 fitness-atlas 文件夹。
选择「终端 → 新建终端」，执行：

```powershell
npm ci
npm run dev
```

打开终端显示的本地网址。按 Ctrl+C 停止服务。依赖已安装时可以直接运行 npm run dev。

## 从零初始化的命令（本项目已执行，不要再次嵌套创建）

```powershell
npm create vite@latest fitness-atlas -- --template vue-ts
cd fitness-atlas
npm install
npm install --save-exact pinia vue-router
```

工程使用 create-vite 的 Vue + TypeScript 模板；实际版本以 package.json 和 package-lock.json 为准。
安装版本已固定，后续使用 npm ci 复现依赖，不要删除 lockfile。

## 验证

```powershell
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run preview
```

打开 preview 显示的网址检查生产构建。
开发模式下修改 src/views/HomeView.vue 的标题并保存，应立即更新，无须重新启动。
在浏览器模拟手机宽度，检查文字不溢出。检查完成后恢复标题。

## 与 Java 的对应

- src/main.ts：类似程序入口，创建应用并注册 Pinia 和路由。
- src/App.vue：根组件，使用 RouterView 渲染当前页面。
- src/router/index.ts：URL 到页面的映射，采用 hash 路由。
- src/views/HomeView.vue：首页展示层；其他页面在 src/views 中。
- src/styles/base.css：全局样式与黑白主题变量。
- tsconfig*.json：严格类型检查配置。
- eslint.config.js：代码规范；Prettier 负责统一格式。

后续遵循：页面 → Pinia → Service → Repository；算法使用独立纯函数。
Pinia 管理动作筛选、档案与周计划，服务由应用内部共享，页面不直接访问存储。

## 阶段约定

完成当前阶段的验证后暂停，得到确认再进入下一阶段。
阶段 2 已添加领域接口、完整动作数据、三帧素材和来源署名。验证步骤见 docs/stage-2.md，数据来源与已知图解差异见 docs/content-sources.md。
