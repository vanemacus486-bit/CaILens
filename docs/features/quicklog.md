# IMPL.md — QuickLog 功能实现规格

> 本文档是 PM 设计稿之后的工程实施规格，替换 PM 那份"工程规格"。
> 目标：Claude Code 按本文档从上到下执行，不需中途回头问决策。
> 配套文档：`PLAN.md`（项目宪法）、`Chris_Dzombak.md`（哲学基础）。

---

## 0. 决策记录（已拍板）

| 决策点 | 结论 | 理由 |
|---|---|---|
| Dialog 容器 | **新增 `@radix-ui/react-dialog`** + `npx shadcn add dialog` | shadcn 标配、零维护成本、AlertDialog 语义不对 |
| Collapsible 容器 | **不加包**，用 `useState` + `max-height` CSS transition | 真的不值得一个依赖 |
| 撤销提示 | **手写 Snackbar 组件**（约 30 行），不加 sonner | 一次性需求，包大于价值 |
| 移动端 bottom sheet | **v1 不做**，统一桌面居中 modal | PLAN.md 明确 v1 不含 PWA |
| Esc 行为 | **v1 直接关闭**，不做 dirty 确认 | 草稿丢失成本低于额外按键成本 |
| 入口快捷键 | 全局 `n`（无修饰键）+ 顶部栏 `+` 按钮 | 快捷键 + 可发现性双保险 |
| 分类切换快捷键 | `Alt+1..6` | 避开 title 输入冲突 |

---

## 1. 文件清单

### 新增

```
src/
├── domain/
│   ├── quickLog.ts                      # 纯函数：默认时间 / 默认颜色
│   └── __tests__/quickLog.test.ts
├── features/
│   └── quick-log/
│       ├── QuickLogDialog.tsx           # 主面板，< 200 行
│       ├── useQuickLog.ts               # 状态编排 hook
│       ├── QuickLogTrigger.tsx          # 顶部栏 + 按钮
│       └── index.ts
├── components/ui/
│   ├── dialog.tsx                       # shadcn add dialog 生成
│   └── snackbar.tsx                     # 自写，撤销 toast
└── lib/hooks/
    └── useGlobalShortcut.ts
```

### 修改

```
src/data/eventRepository.ts              # 加 getLatest()
src/stores/eventStore.ts                 # 加 createEvent action（如未存在）
src/App.tsx                              # 挂载 QuickLogDialog + 全局快捷键
src/features/week-view/...               # 顶部栏插入 QuickLogTrigger
package.json                             # 加 @radix-ui/react-dialog
```

---

## 2. Phase 0 — 准备（串行，约 5 min）

```bash
npm i @radix-ui/react-dialog
npx shadcn@latest add dialog
```

确认 `src/components/ui/dialog.tsx` 已生成。`npm run lint && npm test` 仍通过。提交：

```
chore: add @radix-ui/react-dialog for QuickLog
```

---

## 3. Phase 1 — 四轨并行

> 四个 Track 之间无依赖，可分四个 PR 并行。建议命名：`feat/quicklog-domain`、`feat/quicklog-repo`、`feat/quicklog-ui`、`feat/quicklog-shortcut`。

### Track A · Domain（最先起跑）

**`src/domain/quickLog.ts`**

```typescript
import type { Event, EventColor } from './event';

export const SAFE_GAP_MS = 4 * 60 * 60 * 1000;       // 4 hours
export const DEFAULT_DURATION_MS = 60 * 60 * 1000;   // 1 hour

export interface DefaultTimes {
  start: number;
  end: number;
}

/**
 * Derive default start/end times for a new quick-log entry.
 *
 * - No prior event → [now - 1h, now]
 * - Prior event ended within SAFE_GAP_MS → [lastEvent.endTime, now]
 * - Prior event too old or in the future (clock drift) → fallback to [now - 1h, now]
 */
export function deriveDefaultTimes(
  lastEvent: Event | null,
  now: number = Date.now(),
): DefaultTimes {
  if (!lastEvent) return { start: now - DEFAULT_DURATION_MS, end: now };
  const gap = now - lastEvent.endTime;
  if (gap < 0 || gap > SAFE_GAP_MS) {
    return { start: now - DEFAULT_DURATION_MS, end: now };
  }
  return { start: lastEvent.endTime, end: now };
}

export function deriveDefaultColor(lastEvent: Event | null): EventColor {
  return lastEvent?.color ?? 'accent';
}
```

**`src/domain/__tests__/quickLog.test.ts`** — 必须覆盖：

- `deriveDefaultTimes(null)` → `[now - 1h, now]`
- `deriveDefaultTimes` 上一条 1h 前结束 → `[lastEvent.endTime, now]`
- `deriveDefaultTimes` 上一条 5h 前结束（> SAFE_GAP_MS）→ fallback
- `deriveDefaultTimes` 上一条 endTime > now（时钟漂移）→ fallback
- `deriveDefaultColor(null)` → `'accent'`
- `deriveDefaultColor({ color: 'sage', ... })` → `'sage'`

**DoD**：所有测试通过，`tsc --noEmit` 无错。

---

### Track B · Data

**`src/data/eventRepository.ts`** 新增方法：

```typescript
async getLatest(): Promise<Event | null> {
  const ev = await db.events.orderBy('endTime').reverse().first();
  return ev ?? null;
}
```

**测试**（`fake-indexeddb` 已在 devDep）：

- 空库 → `null`
- 三条事件，endTime 不同 → 返回 endTime 最大的
- 两条事件 endTime 相同 → 返回任一（断言非 null 即可）

**DoD**：测试通过，`getLatest` 在 store 里没有缓存，每次直查 IndexedDB（这个调用一天最多几十次，不需要优化）。

---

### Track C · UI 壳（不接 store，本地 demo 验证）

**`src/features/quick-log/QuickLogDialog.tsx`** 接口：

```typescript
interface QuickLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTimes: DefaultTimes;
  defaultColor: EventColor;
  onSave: (input: NewEventInput) => Promise<string>;  // 返回新事件 id
}
```

**布局结构**：

```
┌─────────────────────────────────────┐
│ Title input (autofocus, large)      │  <- 唯一必填
├─────────────────────────────────────┤
│ ⏱ [start time] → [end time]         │  <- 默认填好可编辑
│ 🎨 [● ● ● ● ● ●]  ⌥1 ⌥2 ⌥3 ⌥4 ⌥5 ⌥6 │  <- 颜色 chip + 快捷键提示
├─────────────────────────────────────┤
│ ▸ Details                           │  <- 可展开，默认折叠
│   (collapsed by default)            │
├─────────────────────────────────────┤
│              [Cancel]  [Save (↵)]   │
└─────────────────────────────────────┘
```

**键盘交互**：

- `Alt+1..6`：切换颜色（在 dialog 任何 focus 状态下都生效）
- `Enter`：保存（当 focus **不在** description textarea 时）
- `Esc`：关闭（v1 不做 dirty 确认）
- `Tab`：title → start → end → color row → details toggle → save。details 展开后，多两步：description → location

**Details 折叠实现**：

```tsx
<div
  style={{
    maxHeight: detailsOpen ? '400px' : '0px',
    overflow: 'hidden',
    transition: 'max-height 200ms ease-out',
  }}
>
  {/* description textarea + location input */}
</div>
```

**校验**：

- title.trim() 非空才能 Save（按钮 disabled，Enter 也无效）
- endTime > startTime（不满足时 Save disabled，红字提示一行）

**保存行为**：调用 `onSave`，成功后 `onOpenChange(false)`，state 重置。失败则保留 dialog 并显示错误一行（不要 toast）。

**DoD**：在 `App.tsx` 临时挂一个 demo 按钮验证：键盘流畅、布局符合 mockup、details 展开动画 200ms ease-out、Tab 顺序正确。

---

### Track D · 全局快捷键 hook

**`src/lib/hooks/useGlobalShortcut.ts`**：

```typescript
import { useEffect } from 'react';

interface Options {
  enabled?: boolean;
}

/** Register a single-key global shortcut, ignored when typing in form fields. */
export function useGlobalShortcut(
  key: string,
  handler: () => void,
  options: Options = {},
): void {
  useEffect(() => {
    if (options.enabled === false) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t instanceof HTMLInputElement) return;
      if (t instanceof HTMLTextAreaElement) return;
      if (t instanceof HTMLElement && t.isContentEditable) return;
      if (e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        handler();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, handler, options.enabled]);
}
```

**测试**（jsdom 已在）：

- 按 `n` 触发 handler
- 在 input focus 时按 `n` 不触发
- `Cmd+n` / `Ctrl+n` 不触发（避免与浏览器新窗口冲突）
- `enabled: false` 时不绑定

**DoD**：测试通过。**注意**：dialog 打开时本 hook 自动失效（`enabled` 由父组件传 `!dialogOpen`）。

---

## 4. Phase 2 — 集成 + Snackbar（串行）

### 4.1 `useQuickLog.ts` 编排

```typescript
export function useQuickLog() {
  const [open, setOpen] = useState(false);
  const [defaults, setDefaults] = useState<{ times: DefaultTimes; color: EventColor } | null>(null);

  const openDialog = useCallback(async () => {
    const last = await eventRepository.getLatest();
    setDefaults({
      times: deriveDefaultTimes(last),
      color: deriveDefaultColor(last),
    });
    setOpen(true);
  }, []);

  const handleSave = useCallback(async (input: NewEventInput) => {
    const id = await eventStore.createEvent(input);
    showUndoSnackbar(id);   // 见 4.2
    return id;
  }, []);

  return { open, setOpen, defaults, openDialog, handleSave };
}
```

### 4.2 Snackbar — `src/components/ui/snackbar.tsx`

最小实现：单例 + portal + 3 秒 timeout。约 30–50 行。接口：

```typescript
showUndoSnackbar(eventId: string): void;
```

行为：

- 显示 "Event saved · Undo"，右下角 fixed 定位
- 3 秒后自动消失
- 点击 Undo → `eventRepository.delete(eventId)` + 立即关闭
- **并发规则**：3 秒内连保存两条，新的覆盖旧的：清掉旧 timeout、不撤销旧事件、显示新 toast。一个 module-level `let timeoutRef` + `let currentId` 即可。

**测试**：可选，UI 行为简单，集成测试覆盖即可。

### 4.3 App.tsx 挂载

```tsx
const { open, setOpen, defaults, openDialog, handleSave } = useQuickLog();

useGlobalShortcut('n', openDialog, { enabled: !open });

return (
  <>
    {/* 现有 week view */}
    {defaults && (
      <QuickLogDialog
        open={open}
        onOpenChange={setOpen}
        defaultTimes={defaults.times}
        defaultColor={defaults.color}
        onSave={handleSave}
      />
    )}
    <SnackbarHost />
  </>
);
```

### 4.4 顶部栏 + 按钮

`QuickLogTrigger.tsx` 一个 `<button onClick={openDialog}>` 带 `Plus` icon，插入到周视图顶部"上一周/本周/下一周"那一行的右侧。Tooltip 显示 "New entry (n)"。

---

## 5. Phase 3 — 不做（明确 YAGNI）

- 移动端 bottom sheet
- 语音输入、AI 分类、模板
- 撤销之外的 toast 系统
- dirty 状态确认
- 快捷键自定义
- 多入口（FAB / 命令面板等）

---

## 6. 验收标准

功能层面：

1. 桌面 Chrome：按 `n` → dialog 打开 → autofocus title → 输入 → Enter 保存 → dialog 关闭 → 周视图出现新事件 → Snackbar 三秒后消失。秒表实测全程 ≤ 5 秒（含敲字时间）。
2. 上一条事件 30 分钟前结束 → 默认 start = 上一条 endTime，end = now。
3. 上一条事件昨天结束 → 默认 start = now - 1h，end = now。
4. `Alt+3` 切换到第三个颜色。颜色按钮也可点击切换。
5. 点击"▸ Details" → description 和 location 200ms 动画展开。
6. 保存后立即按 Snackbar 的 Undo → 事件从周视图消失。
7. 在 title 输入框中按 `n` → 正常输入字符 "n"，dialog 不重复打开。
8. dialog 打开时按 `n` → 不触发任何额外行为。

代码层面：

- `tsc --noEmit` 无错，`eslint` 无 warning。
- `domain/quickLog.ts` 单测覆盖率 100%（仅两个函数，应当容易）。
- `QuickLogDialog.tsx` < 200 行；`useQuickLog.ts` < 80 行。
- 新增依赖**仅** `@radix-ui/react-dialog` 一个。
- 组件不直接 import dexie，所有数据访问走 `eventRepository`。

---

## 7. 实施顺序总览

```
Phase 0 ──┐
          ↓
Phase 1   ├─ Track A (Domain)        ─┐
          ├─ Track B (Repo)            ├─→ Phase 2 ──→ Verify ──→ Done
          ├─ Track C (UI shell)        │
          └─ Track D (Shortcut hook)  ─┘
```

- Phase 0：5 min。
- Phase 1：四轨并行，各自约 1–2 小时（含测试）。
- Phase 2：1–2 小时。
- 验证：30 min 实测 + 改 bug。

预计总工时（单人串行）：6–9 小时；四 agent 并行：3–4 小时。

---

## 8. Commit 规范

每个 Track 一个 PR，commit 信息英文：

- `feat(quicklog): add domain helpers for default times and color`
- `feat(quicklog): add eventRepository.getLatest()`
- `feat(quicklog): add QuickLogDialog UI shell`
- `feat(quicklog): add useGlobalShortcut hook`
- `feat(quicklog): wire dialog, store and undo snackbar`
- `feat(quicklog): mount in App and add header trigger button`

---

**实现完成后，把本文件移到 `docs/features/quicklog.md`**，作为该功能的"出生档案"。后续若 v1.1 加分类可选/语音输入等，写新的 IMPL 文档，不修改本文件。