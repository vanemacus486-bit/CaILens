# CaILens 发版 Checklist

每次发版请严格按以下步骤操作，缺一不可。

---

## 前置条件

- [ ] 确认当前分支为 `main` / `master`，工作区干净（`git status` 无未提交更改）
- [ ] 确认 CI 最新一次构建通过（若有 CI）

---

## 1. 版本号 Bump

三处版本号必须**同时**更新到同一个 `X.Y.Z`：

| 文件 | 字段 | 说明 |
|------|------|------|
| `package.json` | `.version` | npm 包版本，亦为 `__APP_VERSION__` 的构建时注入源 |
| `src-tauri/tauri.conf.json` | `.version` | Tauri 桌面应用版本，为 updater 版本比对基准 |
| `src-tauri/Cargo.toml` | `[package] version` | Rust crate 版本 |

> ⚠️ 三者不一致会导致：安装包文件名错、应用内显示版本错、自动更新检测不到新版本。

```powershell
# Bash/PowerShell 示例（三处替换为同一个 X.Y.Z）
(Get-Content package.json) -replace '"version": "\d+\.\d+\.\d+"', '"version": "X.Y.Z"' | Set-Content package.json
(Get-Content src-tauri/tauri.conf.json) -replace '"version": "\d+\.\d+\.\d+"', '"version": "X.Y.Z"' | Set-Content src-tauri/tauri.conf.json
(Get-Content src-tauri/Cargo.toml) -replace 'version = "\d+\.\d+\.\d+"', 'version = "X.Y.Z"' | Set-Content src-tauri/Cargo.toml
```

---

## 2. 更新 CHANGELOG.md

在文件顶部（`## [X.Y.Z] — YYYY-MM-DD` 格式）插入新版本条目。参照现有格式：

```markdown
## [X.Y.Z] — YYYY-MM-DD

### 新增

- 新功能描述

### 变更

- 变更描述

### 修复

- 修复描述
```

文件末尾添加对应链接：

```markdown
[X.Y.Z]: https://github.com/vanemacus486-bit/CaILens/releases/tag/vX.Y.Z
```

---

## 3. 验证三件套

```powershell
npm run lint
if ($?) { npx vitest run }
if ($?) { npx tsc -b }
```

- `npm run lint`：0 errors（warnings 可忽略，但不得新增 error）
- `npx vitest run`：全绿（当前基线 629 tests / 41 files）
- `npx tsc -b`：静默无输出 = 通过

---

## 4. 打包桌面 .exe

### 4a: 本地出包

```powershell
# 先关掉正在运行的 CaILens（否则产物覆盖失败）
Stop-Process -Name CaILens -Force -ErrorAction SilentlyContinue

# 打包
npm run tauri:build
```

产物在 `release/`：
- `CaILens.exe` — 绿色便携版（~21MB）
- `CaILens_<版本>_x64-setup.exe` — NSIS 安装包（~17MB）

### 4b: CI 发版（推荐）

推送一个 `vX.Y.Z` 格式的 tag 即自动触发 `.github/workflows/release.yml`：

```powershell
git tag vX.Y.Z
git push origin vX.Y.Z
```

CI 会自动：
1. 构建 Windows release
2. 发布 GitHub Release（含安装包）

---

## 5. 确认 GitHub Release

CI 会在构建成功后直接发布 Release。确认 Release 页面中的 Windows 安装包可正常下载。

若手动发布：
1. 打开 https://github.com/vanemacus486-bit/CaILens/releases/new
2. Tag 填 `vX.Y.Z`（**必须大于上一版**）
3. Release title 填 `CaILens vX.Y.Z`
4. 将 `CHANGELOG.md` 对应条目粘贴到 description
5. 上传 `release/CaILens.exe`、`release/CaILens_<版本>_x64-setup.exe`

> ⚠️ Tag 版本号必须大于上一版，避免用户混淆不同版本的下载包。

---

## 6. 发版后

- [ ] 确认 GitHub Release 页可正常下载
- [ ] 在已安装旧版的桌面端确认「检查更新」可跳转到 Release 下载页
- [ ] 更新 `README.md` / `README.en.md` 中的状态行（版本号 + 描述）
