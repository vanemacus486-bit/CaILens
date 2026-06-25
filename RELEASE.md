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

### 4a: 本地出包（带签名）

> 自任务 D 起，`createUpdaterArtifacts: true` 要求签名。
> **以下两个环境变量缺一不可，否则 tauri build 报错。**

```powershell
# 先关掉正在运行的 CaILens（否则产物覆盖失败）
Stop-Process -Name CaILens -Force -ErrorAction SilentlyContinue

# 设置签名环境变量（两个都用同一个密码）
$env:TAURI_SIGNING_PRIVATE_KEY = "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25lcnNlY3JldCBrZXkgLS0tLS0g..."
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "your-password"

# 打包
npm run tauri:build
```

产物在 `release/`：
- `CaILens.exe` — 绿色便携版（~21MB）
- `CaILens_<版本>_x64-setup.exe` — NSIS 安装包（~17MB）
- `latest.json` — updater 清单（自动生成）

### 4b: CI 发版（推荐）

**前置条件（一次性）：** 在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加以下 Repository secrets：

| Secret 名称 | 值 |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | `D:\Dev\CaILens_keys\cailens.key` 文件内容（整个字符串） |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 生成密钥时使用的密码 |

推送一个 `vX.Y.Z` 格式的 tag 即自动触发 `.github/workflows/release.yml`：

```powershell
git tag vX.Y.Z
git push origin vX.Y.Z
```

CI 会自动：
1. 构建 Windows release
2. 生成 `latest.json`
3. 创建 GitHub Release Draft（含产物）

---

## 5. 建 GitHub Release

若使用 CI，Release 已自动创建为 Draft，只需检查产物 → 点击 Publish。

若手动发布：
1. 打开 https://github.com/vanemacus486-bit/CaILens/releases/new
2. Tag 填 `vX.Y.Z`（**必须大于上一版**，否则用户端不弹更新）
3. Release title 填 `CaILens vX.Y.Z`
4. 将 `CHANGELOG.md` 对应条目粘贴到 description
5. 上传 `release/CaILens.exe`、`release/CaILens_<版本>_x64-setup.exe`、`release/latest.json`

> ⚠️ Tag 版本号是 updater 检测更新的唯一依据。若新 tag ≤ 上一个 Release tag，桌面端不会弹出更新提示。

---

## 6. 发版后

- [ ] 确认 GitHub Release 页可正常下载
- [ ] 确认 `latest.json` 的 `version` 字段与发布版本一致
- [ ] 在已安装旧版的桌面端验证自动更新（启动 App → 应弹出更新横幅）
- [ ] 更新 `README.md` / `README.en.md` 中的状态行（版本号 + 描述）
