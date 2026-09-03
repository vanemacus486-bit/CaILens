# CaILens 发版 Checklist

每次发版请严格按以下步骤操作，缺一不可。Windows 已安装版通过
Tauri 的**签名自动更新器**升级；不能发布缺少签名或 `latest.json` 的 Release。

---

## 前置条件

- [ ] 确认当前分支为 `main` / `master`，工作区干净（`git status` 无未提交更改）
- [ ] 确认 CI 最新一次构建通过（若有 CI）

---

## 1. 版本号 Bump

只修改 `package.json` 的 `.version`，它是**唯一版本源**：Vite 从这里注入 About 页面，
`src-tauri/tauri.conf.json` 也直接引用该文件来生成 Windows 安装包和 updater 版本。
`Cargo.toml` 的 crate 版本不参与桌面发行版本判断。

```powershell
# PowerShell 示例
(Get-Content package.json) -replace '"version": "\d+\.\d+\.\d+"', '"version": "X.Y.Z"' | Set-Content package.json
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

### 4a: 本地出包（用于手动安装或本机验证）

```powershell
# 先关掉正在运行的 CaILens（否则产物覆盖失败）
Stop-Process -Name CaILens -Force -ErrorAction SilentlyContinue

# 私钥是安全校验的一部分。它必须与 tauri.conf.json 中的 pubkey 配对；
# 不要将私钥提交到仓库。
$env:TAURI_SIGNING_PRIVATE_KEY = "D:\Dev\CaILens_keys\cailens.key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "<生成密钥时的密码>"
npm run tauri:build
```

产物在 `release/`：
- `CaILens.exe` — 绿色便携版（~21MB）
- `CaILens_<版本>_x64-setup.exe` — NSIS 安装包（~17MB）
- `CaILens_<版本>_x64-setup.exe.sig` — 安装包签名（自动更新必需）

### 4b: CI 发版（推荐）

一次性在 GitHub 仓库 Settings → Secrets and variables → Actions 中设置：

| Secret 名称 | 值 |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | 与 `tauri.conf.json` 公钥配对的私钥全文（或 CI 可访问的密钥路径） |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 生成密钥时的密码；无密码则留空 |

> **密钥迁移警告：** 不要更换 `src-tauri/tauri.conf.json` 中的 `pubkey`。已安装客户端
> 只信任这把公钥；若丢失其配对私钥或密码，无法通过自动更新给旧客户端换新密钥，
> 只能让旧客户端手动安装一次新的基线版本。

推送一个与 `package.json` **完全相同**的 `vX.Y.Z` tag，即自动触发 `.github/workflows/release.yml`：

```powershell
git tag vX.Y.Z
git push origin vX.Y.Z
```

CI 会自动：
1. 构建并签名 Windows NSIS 安装包；
2. 创建 `latest.json`，其中包含版本、Release 说明、安装包 URL 和 `.sig` 内容；
3. 将安装包、`.sig` 与 `latest.json` 一起发布到 GitHub Release。

---

## 5. 确认 GitHub Release

CI 会在构建成功后直接发布 Release。必须确认 Release Assets 同时存在：

- `CaILens_<版本>_x64-setup.exe`
- `CaILens_<版本>_x64-setup.exe.sig`
- `latest.json`

若手动发布：
1. 打开 https://github.com/vanemacus486-bit/CaILens/releases/new
2. Tag 填 `vX.Y.Z`（**必须大于上一版**）
3. Release title 填 `CaILens vX.Y.Z`
4. 将 `CHANGELOG.md` 对应条目粘贴到 description
5. 上传 `release/CaILens_<版本>_x64-setup.exe` 和同名 `.sig`，并用该 `.sig` 内容及
   安装包 URL 生成符合 Tauri v2 格式的 `latest.json` 后一并上传。

> ⚠️ 优先使用 CI 发版。手动发布最容易漏掉或写错 `latest.json`，会导致客户端安全地拒绝更新。

---

## 6. 发版后

- [ ] 打开 `https://github.com/vanemacus486-bit/CaILens/releases/latest/download/latest.json`，确认其中的 `version`、`notes`、`windows-x86_64.url` 和 `signature` 均正确
- [ ] 在已安装旧版的 Windows 桌面端：启动应用 → 看到新版本与更新内容 → 点击「立即更新」→ 等待自动重启 → About 显示新版本
- [ ] 更新 `README.md` / `README.en.md` 中的状态行（版本号 + 描述）
