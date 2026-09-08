# 阶段 5：训练记录与本地保存

## 文件结构

```text
src/
├─ types/local-data.ts
├─ infrastructure/storage/
│  ├─ database.ts
│  ├─ profile-storage.ts
│  └─ migrations.ts
├─ repositories/indexeddb-training.repository.ts
├─ services/
│  ├─ training.service.ts
│  └─ backup.service.ts
├─ stores/training.store.ts
├─ components/training/
│  ├─ SetLogger.vue
│  └─ BackupPanel.vue
├─ views/HistoryView.vue
├─ utils/validate-backup.ts
└─ styles/persistence.css
tests/
├─ persistence.test.ts
├─ backup.test.ts
└─ e2e/persistence.spec.ts
```

同时修改服务入口、内存仓库、档案与计划 store、训练数据类型、推荐服务、日程组件、路由、样式入口、README 和前一阶段的浏览器断言。依赖固定为 idb 8.0.3；测试使用 fake-indexeddb 6.2.5，已更新 lockfile。

## 使用与验证

1. 在 VSCode 终端运行 npm run dev，使用固定的本地网址。推荐一直使用 http://127.0.0.1:5173；localhost 与 127.0.0.1 是不同存储来源，端口变化也会隔离数据。
2. “我的”设置档案并生成计划，刷新后仍能看到个人日程及手动调整。
3. 打开今天或过去的训练日，点击“记录本次训练”。填写实际次数／时长、适用的重量、剩余能力，勾选实际完成的组。未勾选组不计入结果；不要用目标次数冒充实际完成数。
4. 页面显示“草稿已保存到本机”后刷新，点击“继续记录”，应恢复输入与勾选状态。保存失败会显示错误并保留输入，重试成功后再离开。
5. 点击“完成并保存训练”，记录写入后显示成功。同一档案、日期、动作使用稳定 ID，重复提交不会增加记录。当前按每个动作每天一条记录处理；完成后没有删除／编辑入口。
6. “我的”或“日程”进入训练历史，可查看结果和继续未完成草稿。当天全部计划动作提交后，日程显示已完成；部分组未勾选代表用户结束该动作时未完成那些组。
7. 在训练录入时填写具体器械标识，例如“学校划船机 A”，可用档位用逗号分隔。以后生成建议会使用最近完成记录的器械信息；不同机器请用不同标识。无档位时不会虚构加重档位。
8. 点击“导出 JSON 备份”。选择同一文件后先展示档案、计划、记录、草稿数量；点击“确认替换本机数据”才应用并刷新。取消不会改变数据。
9. 损坏 JSON、未知版本、重复记录、无效动作引用、错误计量口径、不同档案混入和不连续日程都应被拒绝，旧数据保持不变。

## 存储设计

- 组件 → Pinia → Service → Repository；组件不直接读写 localStorage 或 IndexedDB。无可用存储时显示失败，不静默退回易丢失的内存模式。
- localStorage 保存带版本的档案；IndexedDB v1 使用 records、plans、drafts、meta 四个存储。
- 页面先读取已有档案，再恢复匹配档案签名的周计划；不会用默认状态覆盖已保存的计划。
- 完成训练使用同一个 IndexedDB 事务写记录、移除草稿和更新完成状态，等待事务完成后报告成功。
- 恢复备份先做完整校验，在新的数据代号下写入档案与记录，最后在 IndexedDB 事务中切换 active 指针。失败仍读取旧代号，避免档案和记录一半新、一半旧。
- 上一次及更早的恢复代号暂时保留，不自动清理；反复恢复大备份会增加浏览器存储占用。只导出当前代号，不把旧数据混入备份。
- 支持 Web Locks 的浏览器串行化同源写入；不支持时至少串行化本实例写入。另一个页面恢复备份后，旧页面的写入会被拒绝并提示刷新。
- 数据与备份格式均为版本 1。前四阶段只有内存数据，没有需要迁移的旧本地格式。未知新版本拒绝打开／恢复，不删除数据库；未来升级在 migrations.ts 中添加非破坏性迁移。
- 当前备份文件限 20 MB。没有账号与跨设备自动同步。离线页面及图片缓存尚未接入，进入第六阶段后实现。

## 工程检查

```powershell
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
npm run test:e2e
```

测试覆盖浏览器刷新恢复、草稿、幂等提交、损坏备份、导出再导入、写入异常、恢复事务中止、多标签旧写入、未知数据库版本与原有图鉴功能。日志与测试备份位于忽略的 work 目录。
