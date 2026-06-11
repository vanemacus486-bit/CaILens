# 设置页面优化 — 详细设计

## 目标

1. 为设置页建立**信息层级**（分组），让用户快速定位核心设置
2. 补充 **3 个已有 store 支持的缺失 UI**：语言切换、克制模式、档案编辑
3. 在 Tauri 环境下隐藏无意义的存储 Tab（浏览器端不显示）
4. 保持现有组件结构，改动范围可控

## 新的 Tab 结构

```
偏好 ───────────────────────  ← 高频日常操作
  分类      分配每周 168 小时
  外观      主题与字体
  语言      界面语言          ← 新增

高级 ───────────────────────  ← 低频但重要
  克制模式    减少视觉刺激     ← 新增
  快捷键      键盘操作

数据 ───────────────────────  ← 中低频数据管理
  数据       导入与导出
  档案       身体数据          ← 新增/迁移

其他 ───────────────────────  ← 最低频
  存储       文件存储路径      ← Tauri 条件显示
  关于       版本与技术栈
```

## 改动清单

| # | 文件 | 操作 | 改动量 |
|---|---|---|---|
| 1 | `src/stores/uiStore.ts` | 修改 | ~5 行 |
| 2 | `src/features/settings/SettingsLanguage.tsx` | 新建 | ~40 行 |
| 3 | `src/features/settings/SettingsRestrained.tsx` | 新建 | ~50 行 |
| 4 | `src/features/settings/SettingsProfile.tsx` | 新建 | ~120 行 |
| 5 | `src/features/settings/SettingsPage.tsx` | 重构 | ~80 行 |
| 6 | `src/features/settings/MobileSettingsPage.tsx` | 重构 | ~30 行 |
| 7 | `src/pages/ProfilePage.tsx` | 降级修改 | ~40 行 |

## 详细设计

### 1. uiStore.ts — 扩展 SettingsTab 类型

**当前：**
```ts
export type SettingsTab = 'categories' | 'appearance' | 'data' | 'storage' | 'about' | 'shortcuts'
```

**改为：**
```ts
export type SettingsTab = 'categories' | 'appearance' | 'language' | 'restrained' | 'shortcuts' | 'data' | 'profile' | 'storage' | 'about'
```

新增：`language`、`restrained`、`profile`
默认值改为 `'categories'`（不变）

### 2. SettingsLanguage.tsx — 语言设置

复用 SettingsAppearance 的 toggle-switch 模式。

```tsx
export function SettingsLanguage() {
  const language = useAppSettingsStore((s) => s.settings.language)
  const setLanguage = useAppSettingsStore((s) => s.setLanguage)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-[22px] ...">语言</h1>
        <p className="text-sm text-text-tertiary mt-1">自定义界面显示语言</p>
      </div>

      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="px-5 py-3.5">
          <h2 className="text-xs font-sans font-medium text-text-tertiary uppercase tracking-wider mb-3">
            界面语言
          </h2>
          <div className="flex gap-0.5 bg-surface-sunken rounded-lg p-0.5 w-fit">
            {(['zh', 'en'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={cn(
                  'px-5 py-1.5 rounded-md text-sm font-sans font-medium ...',
                  language === lang ? 'bg-surface-raised text-text-primary shadow-pill' : 'text-text-secondary',
                )}
              >
                {lang === 'zh' ? '中文' : 'English'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**依赖：** 需要在 settingsStore 中新增 `setLanguage` 方法。

### 3. SettingsRestrained.tsx — 克制模式

```tsx
export function SettingsRestrained() {
  const restrainedMode = useAppSettingsStore((s) => s.settings.restrainedMode)
  const setRestrained = useAppSettingsStore((s) => s.setRestrainedMode)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-[22px] ...">克制模式</h1>
        <p className="text-sm text-text-tertiary mt-1">减少视觉刺激，回归内容本身</p>
      </div>

      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="px-5 py-3.5">
          <h2 className="text-xs font-sans font-medium text-text-tertiary uppercase tracking-wider mb-3">
            克制模式
          </h2>
          <div className="flex gap-0.5 bg-surface-sunken rounded-lg p-0.5 w-fit">
            {([false, true] as const).map((on) => (
              <button
                key={on ? 'on' : 'off'}
                onClick={() => setRestrained(on)}
                className={cn(
                  'px-5 py-1.5 rounded-md text-sm ...',
                  restrainedMode === on ? 'bg-surface-raised text-text-primary shadow-pill' : 'text-text-secondary',
                )}
              >
                {on ? '开启' : '关闭'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 说明 */}
      <div className="rounded-lg bg-surface-raised border border-border-subtle px-4 py-3">
        <p className="text-xs text-text-secondary leading-relaxed">
          开启后：<br />
          • 降低色彩饱和度<br />
          • 简化过渡动画<br />
          • 减少装饰性元素
        </p>
      </div>
    </div>
  )
}
```

**注意：** 克制模式的实际视觉效果（降低饱和度、简化动画）后续在 `index.css` 中通过 CSS 变量实现，不在本次改动范围内。

### 4. SettingsProfile.tsx — 档案

从 ProfilePage 迁移身体数据编辑功能。

**结构：**
- Section 标题："身体"
- BodyMetrics 表单：身高(cm)、体重(kg)、体脂率(%)、静息心率(bpm)、收缩压(mmHg)、舒张压(mmHg)、左眼视力、右眼视力、最近验光时间
- 每个字段：label | input | 单位
- 底部保存按钮

**与 ProfilePage 的区别：**
- ProfilePage：只读展示，"编辑档案"按钮目前是 alert 占位
- SettingsProfile：可直接编辑 + 保存

**数据流：**
```
SettingsProfile 表单
  → useProfileStore.updateBodyMetrics(partial)
  → ProfileRepository.update()
  → Dexie DB
```

### 5. SettingsPage.tsx — 分组侧边栏重构

**新的 TABS 结构：**

```ts
const TAB_GROUPS = [
  {
    labelZh: '偏好',
    labelEn: 'Preferences',
    tabs: [
      { key: 'categories',  labelZh: '分类',   labelEn: 'Categories',   descZh: '分配每周168小时',  descEn: 'Allocate 168 hours' },
      { key: 'appearance',  labelZh: '外观',   labelEn: 'Appearance',   descZh: '主题与字体',       descEn: 'Theme & font' },
      { key: 'language',    labelZh: '语言',   labelEn: 'Language',     descZh: '界面语言',         descEn: 'Interface language' },
    ],
  },
  {
    labelZh: '高级',
    labelEn: 'Advanced',
    tabs: [
      { key: 'restrained',  labelZh: '克制模式', labelEn: 'Restrained Mode', descZh: '减少视觉刺激', descEn: 'Reduce visual noise' },
      { key: 'shortcuts',   labelZh: '快捷键',   labelEn: 'Shortcuts',     descZh: '键盘操作',       descEn: 'Keyboard actions' },
    ],
  },
  {
    labelZh: '数据',
    labelEn: 'Data',
    tabs: [
      { key: 'data',      labelZh: '数据',   labelEn: 'Data',        descZh: '导入与导出',       descEn: 'Import & export' },
      { key: 'profile',   labelZh: '档案',   labelEn: 'Profile',     descZh: '身体数据',         descEn: 'Body metrics' },
    ],
  },
  {
    labelZh: '其他',
    labelEn: 'Other',
    tabs: [
      { key: 'storage',   labelZh: '存储',   labelEn: 'Storage',     descZh: '文件存储路径',     descEn: 'File storage path' },
      { key: 'about',     labelZh: '关于',   labelEn: 'About',       descZh: '版本与技术栈',     descEn: 'Version & stack' },
    ],
  },
]
```

**侧边栏渲染逻辑：**

```tsx
{TAB_GROUPS.map((group) => (
  <div key={group.labelZh} className="mb-4">
    {/* 分组标题 */}
    <div className="px-3 py-1.5 text-[10px] font-sans font-medium text-text-tertiary uppercase tracking-wider opacity-60">
      {t(group.labelZh, group.labelEn)}
    </div>
    {/* 分组内的 tab */}
    <div className="flex flex-col gap-0.5 px-2.5">
      {group.tabs.map((tab) => (
        <button key={tab.key} ...>
          {t(tab.labelZh, tab.labelEn)}
          <span className="text-[11px] text-text-tertiary">{t(tab.descZh, tab.descEn)}</span>
        </button>
      ))}
    </div>
  </div>
))}
```

**存储 Tab 条件显示：**

```ts
const isTauriApp = isTauri()

// 在"其他"分组中，条件渲染 storage tab
{...otherTabs.filter(t => isTauriApp || t.key !== 'storage')}
```

或者更优雅的方式：在构建 TABS 时过滤。

### 6. MobileSettingsPage.tsx — 同步修改

与桌面端相同的 tab 结构，只是布局改为横向滚动 tab bar。

- `MOBILE_TABS` 扩展为新 tab 列表
- `MOBILE_TAB_CONTENT` 映射新增组件
- 注意移动端存储 Tab 也条件隐藏

### 7. ProfilePage.tsx — 降级

保持路由 `/profile` 不变，但改为"快速查看"模式：

- 只读展示身体数据 + 作息基线（从事件派生）
- 移除"编辑档案"的 alert 占位
- 添加"去设置编辑"链接 → `/settings` → `profile` tab
- 保留 Esc → /stats 快捷键

---

## 依赖关系

本次改动**不依赖**任何新 store 方法，但需要：

1. **`settingsStore.setLanguage`** — 新增一个 `setLanguage(lang)` 方法，类似 `setTheme`/`setUiFont`
2. **克制模式视觉效果** — 不在本次改动范围，后续在 CSS 中实现

## 不做什么

- 不改克制模式的实际视觉效果（纯 UI 层面展示开关）
- 不改动现有 tab 内的子组件逻辑（BudgetBar / CategoryCard / SettingsData 等）
- 不改 ProfilePage 的 BodyMetrics 数据结构
- 不添加主题色选择器（那是另一个优化话题）
