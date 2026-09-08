# 部署到 GitHub Pages

当前状态：本地工程已初始化 main 分支并关联 https://github.com/W1H-git/fitness-atlas.git，部署配置与本地验收已准备。尚未发布公网网址，第七阶段必须在线上验收后才算完成。

## 创建仓库

1. 登录自己的 GitHub，点击右上角加号 → New repository。
2. 建议仓库名 fitness-atlas，选择 Public。先不要勾选初始化 README、.gitignore 或 License，本地已有对应内容。
3. 创建后把仓库网址提供给协助开发者，再连接现有工程。不要上传 node_modules、dist 或 work 中的测试备份。
4. VSCode 应打开 E:\Vscode\JS\fitness-atlas。package.json 和 .github 应在仓库根目录，不能在 GitHub 再套一层 fitness-atlas 文件夹。

本地已初始化 Git 并添加 origin，无需重复执行 git init 或 git remote add。Git 登录请通过浏览器或 VSCode 完成，不要把密码或令牌粘贴到聊天中。

## 开启 Pages 与首次发布

推送代码后，在仓库 Settings → Pages → Build and deployment 中将 Source 设置为 GitHub Actions。回到 Actions，选择 Verify and deploy fitness atlas 并运行／重跑工作流；分支用 main。

如果首次推送时尚未开启 Pages，configure-pages 步骤可能失败。开启后重新运行即可，不需要改代码。GitHub Free 可使用公开仓库托管此类 Pages 站点，见 [官方自定义工作流说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

工作流执行：

1. 安装锁定依赖，执行类型、lint、格式、单元测试与动作素材校验。
2. 在 Linux 上安装 Playwright Chromium，验证设置档案、计划调整、训练记录、草稿与备份流程。
3. 读取 Pages 的实际 base_path，再构建并测试对应路径的 PWA。
4. 只把 dist 上传为站点工件，构建和测试成功后才发布。

主分支更新或手动运行会触发发布，其他分支不会发布。工作流没有保存账号密钥；发布使用 GitHub 提供的短期权限。依赖官方 [configure-pages 输出](https://github.com/actions/configure-pages/blob/v5/action.yml)，自动区分项目子路径和根站点。

最终网址以 Actions 部署结果和 Settings → Pages 显示的地址为准，不根据本地预览地址猜测已发布结果。只有打开这个 HTTPS 网址并完成验收，才可发给同学。

## 日常修改与回滚

- 本地开发：npm run dev；生产预览：npm run build 后 npm run preview。
- 更新动作库：先明确上游版本，再运行 npm run catalog:import 和 npm run catalog:check，核对中文与图解后提交变更。
- 提交并推送到 main 后等待 Actions。构建或测试失败不会进入发布步骤，已有站点继续使用上次成功发布的内容。
- 回滚应用：在 GitHub revert 有问题的提交，或在本地创建回退提交后推送 main。不要用 force push 改写共享历史。
- 更新失败或回滚不会主动删除浏览器训练数据。用户已有的 Service Worker 可能仍使用旧版，联网检查更新并确认刷新后才切换。
- 改域名、主机名或端口会改变浏览器存储来源；迁移前从旧地址导出 JSON，在新地址导入。应用代码回滚不能替代用户数据备份。

## 本地与 CI 差异

本机默认使用 Microsoft Edge 测试；工作流通过 PLAYWRIGHT_CHANNEL=chromium 使用已安装的 Chromium。首次在其他开发电脑运行浏览器测试，需要安装相应浏览器。

相关测试说明见 docs/stage-5.md、docs/stage-6.md。已有 recommendation.spec.ts、persistence.spec.ts 覆盖原计划中的首次设置与训练流程，不额外复制一套相同测试。线上待验收项目见 docs/acceptance-checklist.md。
