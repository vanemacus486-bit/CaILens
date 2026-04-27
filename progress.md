# CaILens 进度档案(progress.md)

> 每次新会话只读两个文件:本文件 + `spec.md`。不读历史对话。
> 每次会话结束前更新本文件。

---

## 当前阶段

**第二版 — Step 2(data 层)已完成,等 PM review 进入 Step 3。**

---

## 已完成

### 第一版(全部完成)
- 周视图、24 小时一屏、URL 周参数同步
- 点击空白创建、双击 inline 改名、拖拽移动、边缘 resize、跨天拖拽
- 右键菜单(删除/复制/改色)
- 6 色分类、深浅模式、当前时间红线
- 100+ 单元测试

### 第二版 — Step 1(domain 层) ✅
- `domain/category.ts` — `CategoryName {zh,en}` 类型、DEFAULT_CATEGORIES 更新为柳比歇夫风格双语名
- `domain/settings.ts` — `AppLanguage`、`AppSettings` 单例类型、`DEFAULT_SETTINGS`
- `domain/stats.ts` — `mergeIntervals`(半开区间, O(n log n)) + `computeWeekStats`(并集分母)
- `domain/__tests__/stats.test.ts` — 27 个测试，覆盖全部必须 case

### 第二版 — Step 2(data 层) ✅
- `data/db.ts` — v1→v3 schema(跳过 v2)，on('populate') 播种 categories，upgrade 处理 v2 dev 迁移
- `data/categoryRepository.ts` — `getAll()` + `updateName()`，无 create/delete
- `data/settingsRepository.ts` — `get()`(默认返回 DEFAULT_SETTINGS) + `update()`
- 对应测试:17 个 repo 测试全通
- ESLint 三条规则降级(详见 decisions.md)
- decisions.md 初始化

### 第二版 — 待完成
- Step 3:stores 层(categoryStore, settingsStore)
- Step 4:UI 层(SettingsPopover, WeekStats, EventEditCard 分类选择器, Sidebar 激活)

---

## 下一步

**Step 3 — stores 层**

1. `src/stores/categoryStore.ts` — `{categories, isLoaded, loadCategories, updateCategoryName}`
2. `src/stores/settingsStore.ts` — `{settings, isLoaded, loadSettings, setLanguage}`
3. 三件套全过后 commit，直接进 Step 4

---

## 遗留决策 / 待澄清

- [ ] 统计视图的视觉细节(高度、条形样式)— Step 4 实现时决定
- [ ] 事件创建时默认分类:已定为 `stone`(其他)
- [ ] 改名字数提示样式:超限阻止输入即可

---

## 会话日志

### 2026-04-27
- 完成 Step 1(domain 层):category 双语化、settings 类型、stats 纯函数 + 27 个测试
- ESLint 3 条规则降级 + decisions.md 初始化
- 完成 Step 2(data 层):v1→v3 schema、两个 repository + 测试
- 发现并解决 Dexie v4 upgrade async 函数内 categories.put() 失效问题(on('populate') 方案)
- 三件套:0 errors / 166 passed / build ✓
