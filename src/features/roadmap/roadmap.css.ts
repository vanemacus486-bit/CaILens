/**
 * # roadmap.css — 路线图 feature scoped CSS
 *
 * 遵循设计系统：所有主题色变量在 :root 和 .dark 各一套。
 */

const ROADMAP_CSS = `
/* ── MainGoalSwitcher ────────────────────────── */
.roadmap-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.roadmap-switcher::-webkit-scrollbar {
  display: none;
}
.roadmap-pill {
  flex-shrink: 0;
  padding: 6px 18px;
  border-radius: 999px;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-tertiary);
  background: transparent;
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease;
  white-space: nowrap;
}
.roadmap-pill:hover {
  color: var(--text-primary);
  border-color: var(--border-default);
  background: var(--surface-sunken);
}
.roadmap-pill-active {
  color: var(--surface);
  border-color: transparent;
}
.roadmap-pill-add {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px dashed var(--border-default);
  cursor: pointer;
  color: var(--text-quaternary);
  transition: color 0.2s ease, border-color 0.2s ease;
  flex-shrink: 0;
}
.roadmap-pill-add:hover {
  color: var(--text-secondary);
  border-color: var(--text-tertiary);
}
.roadmap-pill-input {
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: 999px;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 14px;
  border: 1px solid var(--accent);
  background: var(--surface);
  color: var(--text-primary);
  outline: none;
  width: 180px;
}
.roadmap-pill-input::placeholder {
  color: var(--text-quaternary);
}

/* ── Goal Tree ──────────────────────────────── */
.roadmap-tree {
  margin-top: 16px;
}
.roadmap-tree-node {
  display: flex;
  flex-direction: column;
}
.roadmap-tree-node-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 8px;
  border-radius: 6px;
  cursor: default;
  transition: background-color 0.15s ease;
  min-height: 36px;
}
.roadmap-tree-node-content:hover {
  background: var(--surface-sunken);
}
.roadmap-tree-node-content:hover .roadmap-node-actions {
  opacity: 1;
  pointer-events: auto;
}
.roadmap-node-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}
.roadmap-node-action-btn {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-quaternary);
  transition: color 0.15s ease, background-color 0.15s ease;
}
.roadmap-node-action-btn:hover {
  color: var(--text-secondary);
  background: var(--surface-raised);
}

/* ── Expand arrow ───────────────────────────── */
.roadmap-expand-btn {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-quaternary);
  transition: transform 200ms ease-out, color 0.15s ease;
  padding: 0;
  flex-shrink: 0;
}
.roadmap-expand-btn:hover {
  color: var(--text-secondary);
}
.roadmap-expand-btn-open {
  transform: rotate(90deg);
}

/* ── Leaf todo checkbox ──────────────────────── */
.roadmap-todo-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid var(--border-default);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease;
  background: transparent;
  padding: 0;
}
.roadmap-todo-checkbox:hover {
  border-color: var(--text-tertiary);
}
.roadmap-todo-checkbox-done {
  border-color: var(--accent);
  background: var(--accent);
}
.roadmap-todo-title {
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.4;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.roadmap-todo-title-done {
  text-decoration: line-through;
  color: var(--text-quaternary);
}

/* ── Goal node title ─────────────────────────── */
.roadmap-goal-title {
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Mini progress ring ──────────────────────── */
.roadmap-mini-ring {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}
.roadmap-mini-ring-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

/* ── Indent guide lines ──────────────────────── */
.roadmap-children {
  position: relative;
}
.roadmap-children::before {
  content: '';
  position: absolute;
  left: 23px;
  top: 0;
  bottom: 0;
  border-left: 1px solid var(--border-subtle);
}

/* ── Empty states ────────────────────────────── */
.roadmap-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}
.roadmap-empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--surface-sunken);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: var(--text-quaternary);
}
.roadmap-empty-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 15px;
  color: var(--text-tertiary);
  margin-bottom: 8px;
}
.roadmap-empty-desc {
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 12px;
  color: var(--text-quaternary);
  margin-bottom: 20px;
}
.roadmap-empty-btn {
  padding: 8px 22px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--surface);
  border: none;
  cursor: pointer;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 14px;
  font-weight: 500;
  transition: opacity 0.2s ease;
}
.roadmap-empty-btn:hover {
  opacity: 0.85;
}

/* ── Tooltip for inline input ────────────────── */
.roadmap-inline-input {
  flex: 1;
  min-width: 0;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--accent);
  background: var(--surface);
  color: var(--text-primary);
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 14px;
  outline: none;
  transition: color 0.2s ease;
}
.roadmap-inline-input:focus {
  color: var(--accent);
}
.roadmap-inline-input::placeholder {
  color: var(--text-quaternary);
}
.roadmap-goal-title-editable {
  cursor: text;
}
.roadmap-goal-title-editable:hover {
  color: var(--text-secondary);
}
.roadmap-title-input {
  font-size: 15px;
  font-weight: 500;
}
.roadmap-goal-title-root.roadmap-goal-title-editable {
  cursor: text;
}
.roadmap-title-input.roadmap-goal-title-root {
  font-size: 17px;
  font-weight: 600;
}

/* ── Category binding chips ──────────────────── */
.roadmap-cat-section {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}
.roadmap-cat-chip {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0.85;
  transition: opacity 0.15s ease, transform 0.15s ease;
  padding: 0;
}
.roadmap-cat-chip:hover {
  opacity: 0.5;
  transform: scale(1.2);
}
.roadmap-cat-picker-wrap {
  position: relative;
}
.roadmap-cat-add-btn {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px dashed var(--border-default);
  cursor: pointer;
  color: var(--text-quaternary);
  transition: color 0.15s ease, border-color 0.15s ease;
  padding: 0;
}
.roadmap-cat-add-btn:hover {
  color: var(--text-secondary);
  border-color: var(--text-tertiary);
}
.roadmap-cat-picker {
  position: absolute;
  top: 22px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--surface-raised);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  gap: 5px;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
  white-space: nowrap;
}
.roadmap-cat-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
  opacity: 0.4;
  padding: 0;
}
.roadmap-cat-dot:hover {
  opacity: 0.75;
  transform: scale(1.15);
}
.roadmap-cat-dot-active {
  opacity: 1;
  border-color: var(--surface-base);
  outline: 2px solid var(--border-default);
  transform: scale(1.1);
}

/* ── Event binding chips (replaces category dots) ── */
.roadmap-event-chip {
  width: auto;
  height: auto;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  color: #fff;
  opacity: 1;
}
.roadmap-event-chip:hover {
  opacity: 0.7;
  transform: none;
}
.roadmap-event-chip-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 72px;
  display: inline-block;
  vertical-align: middle;
}
.roadmap-event-picker {
  min-width: 200px;
  max-width: 280px;
  flex-direction: column;
  gap: 0;
  padding: 0;
  border-radius: 8px;
  overflow: hidden;
  left: 0;
  transform: none;
}
.roadmap-event-search {
  padding: 6px 8px;
  border-bottom: 1px solid var(--border-subtle);
}
.roadmap-event-search-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12px;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  color: var(--text-primary);
  padding: 2px 4px;
}
.roadmap-event-search-input::placeholder {
  color: var(--text-quaternary);
}
.roadmap-event-list {
  max-height: 180px;
  overflow-y: auto;
  padding: 4px 0;
}
.roadmap-event-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 5px 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  color: var(--text-primary);
  transition: background 0.12s ease;
  text-align: left;
}
.roadmap-event-item:hover {
  background: var(--surface-sunken);
}
.roadmap-event-item-active {
  color: var(--accent);
}
.roadmap-event-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.roadmap-event-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.roadmap-event-check {
  color: var(--accent);
  flex-shrink: 0;
}
.roadmap-event-empty {
  padding: 12px 10px;
  text-align: center;
  font-size: 12px;
  color: var(--text-quaternary);
}

/* ── Section cards ───────────────────────────── */
.roadmap-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 18px;
}
.roadmap-section {
  background: var(--surface-raised);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 20px 24px;
}

/* ── Root (main goal) header row ─────────────── */
.roadmap-node-root {
  min-height: 30px;
  margin-bottom: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-subtle);
  border-radius: 0;
}
.roadmap-node-root:hover {
  background: transparent;
}
.roadmap-goal-title-root {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}
.roadmap-node-root .roadmap-node-actions {
  opacity: 1;
  pointer-events: auto;
}

/* ══════════════════════════════════════════════
   横向脑图 (GoalMindMap)
   ══════════════════════════════════════════════ */
.roadmap-mindmap-section {
  padding: 8px 0 4px;
}
.mm-scroll {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 14px 20px 18px 6px;
  scrollbar-width: thin;
}
.mm-scroll:focus {
  outline: none;
}
.mm-scroll::-webkit-scrollbar {
  height: 6px;
}
.mm-scroll::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: 999px;
}
.mm-canvas {
  position: relative;
}
.mm-edges {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}
.mm-edge {
  fill: none;
  stroke: var(--border-default);
  stroke-width: 1.5;
  opacity: 0.7;
}
.mm-edge-ghost {
  stroke: var(--accent);
  stroke-dasharray: 4 4;
  opacity: 0.5;
}
.mm-edge-focused {
  stroke: var(--accent);
  stroke-width: 2;
  opacity: 1;
}
/* 外层定位盒（overflow 可见，承载右缘按钮 / 悬停操作 / 聚焦光环） */
.mm-node {
  position: absolute;
  cursor: pointer;
  box-sizing: border-box;
  transition: transform 0.2s ease;
}
.mm-node:hover {
  transform: translateY(-1px);
}
.mm-node-focused {
  transform: translateY(-2px);
  z-index: 5;
}

/* 卡片本体（圆角 + 淡染底 + 裁剪色条/进度条） */
.mm-node-card {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 14px;
  background: var(--surface-raised);
  border: 1px solid var(--border-subtle);
  box-shadow: inset 0 1px 0 var(--surface-lit), 0 1px 3px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  transition: box-shadow 0.2s ease, background-color 0.25s ease, border-color 0.2s ease;
}
.mm-node:hover .mm-node-card {
  box-shadow: inset 0 1px 0 var(--surface-lit), 0 4px 14px rgba(0, 0, 0, 0.12);
}
.mm-node-root .mm-node-card {
  box-shadow: inset 0 1px 0 var(--surface-lit), 0 2px 8px rgba(0, 0, 0, 0.10);
}
.mm-node-focused .mm-node-card {
  border-color: transparent;
  box-shadow: inset 0 1px 0 var(--surface-lit), 0 0 0 2px var(--accent), 0 6px 18px rgba(0, 0, 0, 0.16);
}

/* 正文两行 */
.mm-node-body {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  padding: 0 12px;
}
.mm-node-title {
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 14px;
  line-height: 1.25;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mm-node-root .mm-node-title {
  font-size: 15px;
  font-weight: 600;
}
.mm-node-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mm-node-meta-sub {
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
}
.mm-node-input {
  width: 100%;
  border: none;
  background: transparent;
  outline: none;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 14px;
  color: var(--text-primary);
  padding: 0;
}

/* 标题行（圆圈 + 文字） */
.mm-node-title-row {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

/* 左侧进度圆圈 */
.mm-node-ring {
  flex-shrink: 0;
  transform: rotate(-90deg);
}
.mm-node-ring-track {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  opacity: 0.15;
}
.mm-node-ring-fill {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  transition: stroke-dasharray 400ms ease-out;
}

/* 悬停操作（加子目标 / 删除）右上角 */
.mm-node-actions {
  position: absolute;
  top: 4px;
  right: 6px;
  display: flex;
  align-items: center;
  gap: 1px;
  opacity: 0;
  transition: opacity 0.15s ease;
  background: color-mix(in srgb, var(--surface-raised) 82%, transparent);
  border-radius: 6px;
  z-index: 3;
}
.mm-node:hover .mm-node-actions {
  opacity: 1;
}
.mm-node-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-quaternary);
  transition: color 0.15s ease, background-color 0.15s ease;
  padding: 0;
}
.mm-node-btn:hover {
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.06);
}
.mm-node-btn-danger:hover {
  color: var(--color-text-danger);
}

/* 右缘常驻按钮（折叠 / 展开 / 加子目标） */
.mm-node-edge-btn {
  position: absolute;
  right: -11px;
  top: 50%;
  transform: translateY(-50%);
  min-width: 22px;
  height: 22px;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: 999px;
  border: 1px solid var(--border-default);
  background: var(--surface-raised);
  color: var(--text-tertiary);
  cursor: pointer;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  line-height: 1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
  z-index: 4;
}
.mm-node-edge-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}

/* ghost 新子目标 */
.mm-node-ghost .mm-node-card {
  border: 1px dashed var(--accent);
  box-shadow: none;
}
.mm-node-ghost .mm-node-body {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.mm-node-dragging {
  opacity: 0.35;
  cursor: grabbing;
}
.mm-node-dragover .mm-node-card {
  outline: 2px dashed var(--accent);
  outline-offset: 2px;
}
.mm-ghost-check {
  color: var(--accent);
  cursor: pointer;
  flex-shrink: 0;
}

/* ══════════════════════════════════════════════
   通用卡片 (TaskCard / KeyMetricsCard)
   ══════════════════════════════════════════════ */
.rm-card {
  background: var(--surface-raised);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow:
    inset 0 1px 0 var(--surface-lit),
    0 1px 2px rgba(45,30,18,0.04),
    0 8px 18px -14px rgba(45,30,18,0.16);
}
.rm-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.rm-card-head-left {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}
.rm-card-head-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.rm-card-title {
  font-family: 'Noto Serif SC', 'Source Serif 4', serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rm-icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  transition: color 0.15s ease, background-color 0.15s ease;
  flex-shrink: 0;
}
.rm-icon-btn:hover {
  color: var(--text-primary);
  background: var(--surface-sunken);
}

/* ── 状态筛选 ── */
.rm-filter-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.rm-filter-pill {
  padding: 4px 13px;
  border-radius: 999px;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 13px;
  color: var(--text-tertiary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}
.rm-filter-pill:hover {
  color: var(--text-secondary);
  background: var(--surface-sunken);
}
.rm-filter-pill-active {
  color: var(--text-primary);
  background: var(--surface-sunken);
  font-weight: 500;
}

/* ── 进度 ── */
.rm-progress-block {
  margin-bottom: 18px;
}
.rm-progress-label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 13px;
  color: var(--text-tertiary);
}
.rm-progress-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

/* ── 任务点阵 ── */
.rm-dotgrid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  align-items: center;
  max-width: 300px;
  margin: 0 auto 18px;
  padding: 8px 0;
}
.rm-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--surface-sunken);
  transition: background-color 0.25s ease, transform 0.2s ease;
}
.rm-dot-placeholder {
  opacity: 0.45;
}
.rm-dot-done {
  transform: scale(1.05);
}
.rm-dot-more {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-tertiary);
  align-self: center;
}

/* ── 任务列表 ── */
.rm-task-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.rm-task-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 8px;
  transition: background-color 0.15s ease;
}
.rm-task-row:hover {
  background: var(--surface-sunken);
}
.rm-task-row:hover .rm-task-del {
  opacity: 1;
}
.rm-task-check,
.rm-task-check-slot {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.rm-task-check {
  border-radius: 50%;
  border: 1.5px solid var(--border-default);
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  cursor: pointer;
  padding: 0;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}
.rm-task-check:hover {
  border-color: var(--text-tertiary);
}
.rm-task-title {
  flex: 1;
  min-width: 0;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 14px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rm-task-title-done {
  text-decoration: line-through;
  color: var(--text-quaternary);
}
.rm-task-del {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-quaternary);
  opacity: 0;
  transition: opacity 0.15s ease, color 0.15s ease;
  flex-shrink: 0;
}
.rm-task-del:hover {
  color: var(--color-text-danger);
}
.rm-task-input {
  flex: 1;
  min-width: 0;
  border: none;
  border-bottom: 1px solid var(--accent);
  background: transparent;
  outline: none;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 14px;
  color: var(--text-primary);
  padding: 2px 0;
}
.rm-task-input::placeholder {
  color: var(--text-quaternary);
}
.rm-task-empty {
  padding: 18px 8px;
  text-align: center;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 13px;
  color: var(--text-quaternary);
}

/* ── 未分配收件箱：归到目标下拉 ── */
.rm-assign-select {
  flex-shrink: 0;
  max-width: 96px;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 12px;
  color: var(--text-tertiary);
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 2px 4px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.rm-task-row:hover .rm-assign-select {
  opacity: 1;
}
.rm-assign-select:hover {
  color: var(--text-secondary);
  border-color: var(--border-default);
}
.rm-assign-select:focus {
  opacity: 1;
  outline: none;
  border-color: var(--accent);
}

/* ══════════════════════════════════════════════
   关键指标 (KeyMetricsCard)
   ══════════════════════════════════════════════ */
.rm-metrics-agg {
  display: flex;
  align-items: center;
  gap: 6px;
}
.rm-metrics-agg-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}
.rm-metric-add-row {
  margin-bottom: 12px;
}
.rm-metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.rm-metric {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  padding: 12px 14px 14px;
  background: color-mix(in srgb, var(--metric-color) 9%, var(--surface-sunken));
  border: 1px solid color-mix(in srgb, var(--metric-color) 16%, transparent);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rm-metric-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
}
.rm-metric-top {
  display: flex;
  align-items: center;
  gap: 7px;
}
.rm-metric-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.rm-metric-label {
  flex: 1;
  min-width: 0;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: text;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rm-metric-label-input {
  flex: 1;
  min-width: 0;
  border: none;
  border-bottom: 1px solid var(--accent);
  background: transparent;
  outline: none;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  padding: 0;
}
.rm-metric-tools {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;
  flex-shrink: 0;
}
.rm-metric:hover .rm-metric-tools {
  opacity: 1;
}
.rm-metric-tool {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-quaternary);
  transition: color 0.15s ease, background-color 0.15s ease;
  padding: 0;
}
.rm-metric-tool:hover {
  color: var(--text-secondary);
  background: var(--surface-raised);
}
.rm-metric-tool-active {
  color: var(--accent);
  opacity: 1;
}
.rm-metric-picker {
  top: 26px;
  right: 0;
  left: auto;
}
.rm-metric-stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.rm-step-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-raised);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  color: var(--text-secondary);
  transition: background-color 0.15s ease, color 0.15s ease;
  flex-shrink: 0;
}
.rm-step-btn:hover {
  background: var(--surface-base);
  color: var(--text-primary);
}
.rm-metric-nums {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-family: 'JetBrains Mono', monospace;
}
.rm-metric-current {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}
.rm-metric-arrow {
  color: var(--text-quaternary);
  font-size: 13px;
}
.rm-metric-target {
  font-size: 14px;
  color: var(--text-secondary);
  cursor: text;
}
.rm-metric-target-input {
  width: 42px;
  border: none;
  border-bottom: 1px solid var(--accent);
  background: transparent;
  outline: none;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  color: var(--text-primary);
  text-align: center;
  padding: 0;
}
.rm-metric-unit {
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 12px;
  color: var(--text-tertiary);
}
.rm-metric-track {
  height: 4px;
  border-radius: 999px;
  background: var(--surface-raised);
  overflow: hidden;
}
.rm-metric-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  transition: width 400ms ease-out;
}

/* ══════════════════════════════════════════════
   右键菜单 (ContextMenu)
   ══════════════════════════════════════════════ */
.roadmap-ctx-menu {
  background: var(--surface-raised);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.18);
  padding: 4px 0;
  min-width: 160px;
  z-index: 1000;
  animation: roadmap-ctx-in 0.12s ease-out;
  user-select: none;
}
@keyframes roadmap-ctx-in {
  from { opacity: 0; transform: scale(0.94) translateY(-4px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.roadmap-ctx-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 13px;
  color: var(--text-primary);
  text-align: left;
  transition: background 0.1s ease;
  white-space: nowrap;
}
.roadmap-ctx-item:hover {
  background: var(--surface-sunken);
}
.roadmap-ctx-item-danger {
  color: #B53535;
}
.roadmap-ctx-item-danger:hover {
  background: rgba(181, 53, 53, 0.08);
}
.roadmap-ctx-divider {
  height: 1px;
  background: var(--border-subtle);
  margin: 4px 0;
}
.roadmap-ctx-label {
  padding: 4px 14px 2px;
  font-size: 11px;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  color: var(--text-quaternary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ══════════════════════════════════════════════
   颜色选择器
   ══════════════════════════════════════════════ */
.roadmap-color-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 14px 8px;
}
.roadmap-color-btn {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  padding: 0;
  flex-shrink: 0;
}
.roadmap-color-btn:hover {
  transform: scale(1.2);
}
.roadmap-color-btn-active {
  border-color: var(--surface-base);
  box-shadow: 0 0 0 2px var(--border-default);
  transform: scale(1.15);
}
.roadmap-color-btn-sm {
  width: 15px;
  height: 15px;
}
.roadmap-color-btn-clear {
  background: var(--surface-sunken);
  border-color: var(--border-default);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
}
.roadmap-color-btn-clear:hover {
  background: var(--border-subtle);
}

/* ══════════════════════════════════════════════
   主目标新建包装
   ══════════════════════════════════════════════ */
.roadmap-pill-new-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}
.roadmap-pill-color-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px;
}

/* ── Pill drag states ── */
.roadmap-pill-dragging {
  opacity: 0.4;
  cursor: grabbing;
}
.roadmap-pill-dragover {
  outline: 2px dashed var(--accent);
  outline-offset: 2px;
}

/* ══════════════════════════════════════════════
   脑图 ghost 颜色行
   ══════════════════════════════════════════════ */
.mm-ghost-colors {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: var(--surface-raised);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  box-shadow: 0 3px 10px rgba(0,0,0,0.1);
  z-index: 10;
}

/* ══════════════════════════════════════════════
   任务列表拖动 & 重命名
   ══════════════════════════════════════════════ */
.rm-task-drag {
  width: 16px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-quaternary);
  cursor: grab;
  opacity: 0;
  transition: opacity 0.15s ease;
  flex-shrink: 0;
}
.rm-task-row:hover .rm-task-drag {
  opacity: 1;
}
.rm-task-drag:active {
  cursor: grabbing;
}
.rm-task-row-dragging {
  opacity: 0.35;
}
.rm-task-row-dragover {
  background: color-mix(in srgb, var(--accent) 8%, transparent) !important;
  border-radius: 8px;
}
.rm-task-edit-input {
  flex: 1;
}

/* 子目标颜色小点（聚合模式） */
.rm-task-goal-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.rm-task-goal-dot-empty {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
}

/* ── Responsive ──────────────────────────────── */
@media (max-width: 719px) {
  .roadmap-section {
    padding: 16px;
  }
  .roadmap-pill {
    font-size: 13px;
    padding: 5px 14px;
  }
  .roadmap-pill-input {
    width: 140px;
  }
  .roadmap-children {
    padding-left: 11px !important;
  }
  .roadmap-children::before {
    left: 11px;
  }
  .roadmap-node-actions {
    opacity: 1;
    pointer-events: auto;
  }
  .rm-metrics-grid {
    grid-template-columns: 1fr;
  }
  .mm-node-actions,
  .rm-metric-tools {
    opacity: 1;
  }
  .rm-assign-select {
    opacity: 1;
  }
  .rm-card {
    padding: 16px;
  }
}
`

export default ROADMAP_CSS
