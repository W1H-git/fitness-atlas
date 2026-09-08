# 阶段 4：训练推荐与七天日程

## 文件结构

新增：

```text
src/
├─ algorithms/
│  ├─ recommend-muscles.ts
│  ├─ prescribe-exercise.ts
│  ├─ recommend-load.ts
│  └─ generate-week.ts
├─ data/recommendation-rules.ts
├─ services/recommendation.service.ts
├─ stores/
│  ├─ services.store.ts
│  ├─ profile.store.ts
│  └─ plan.store.ts
├─ components/training/
│  ├─ RecommendationCard.vue
│  ├─ PrescriptionPanel.vue
│  └─ WeekCalendar.vue
├─ utils/
│  ├─ local-date.ts
│  ├─ validate-profile.ts
│  └─ validate-prescription.ts
└─ styles/training.css
tests/
├─ recommendation.test.ts
├─ schedule.test.ts
└─ e2e/recommendation.spec.ts
docs/
├─ recommendation-policy.md
└─ stage-4.md
```

修改：src/types/training.ts、src/services/create-services.ts、src/stores/exercise.store.ts、src/views/HomeView.vue、src/views/ScheduleView.vue、src/views/ProfileView.vue、src/main.ts、tests/e2e/catalog.spec.ts、README.md。

未增加依赖。页面 → Pinia → Service → Repository 对应 Java 展示层、状态层、业务服务和 DAO；算法为独立纯函数。services.store 保证每个应用内共享同一组服务，避免多个页面各自创建空的内存仓库。

## 手动验证

1. 在工程目录运行 npm run dev，打开终端网址。
2. 打开“我的”，默认是增肌、新手、完整健身房、周一／三／五。点击“保存档案并生成计划”，进入本周日程。
3. 检查七个日期：三天训练、四天休息。点击未来训练日查看四个动作；若今天是休息日，首页应显示恢复安排。
4. 点选目标肌群，示意图相应部位标红。打开动作名称可查看三帧详情。
5. 外加负重动作应显示待试重，自重动作显示自重。点击“调整建议”，修改组数或确认计划重量，保存后首页同步。
6. 将次数下限改得高于上限，保存应显示错误并保留输入。过去的计划不显示调整按钮。
7. 回到档案，只选自重并生成，应显示缺少拉类动作的原因。改为中级＋完整健身房后，应有四天训练、三天休息。
8. 新手选择周一／三／日，应提示周日与下周一相邻，禁止保存。
9. 刷新后回到待设置状态是本阶段预期行为，页面已注明；第五阶段再接本地保存。

## 工程验证

```powershell
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run catalog:check
npm run build
npm run test:e2e
```

浏览器测试使用本机 Microsoft Edge，自动启动 5175 端口测试服务，不占用平时的 5173 开发服务。截图和测试日志写入已忽略的 work 目录。验证覆盖手机与桌面、输入校验、计划联动、辅助负重方向、日期边界、恢复过滤和历史保护。

推荐依据、简化假设与阶段边界见 recommendation-policy.md。生产构建仍可能提示动作数据分块大于 500 kB；这是完整目录的静态数据块，后续离线阶段再处理资源缓存。

2026-09-08 实际验证：类型检查、lint、格式检查、66 项单元／数据测试、302 个动作与 906 帧素材校验、生产构建、18 项桌面／手机浏览器测试通过。另在生产预览验证 1440、390、320 像素宽度无横向溢出；模拟跨日后休息安排正确，手动调整保留，跨周自动切换到新计划，未出现页面未处理异常。
