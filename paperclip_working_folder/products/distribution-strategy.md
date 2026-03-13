# Paperclip 分发策略 (Distribution Strategy)

## 概述

本文档是 Paperclip 多渠道分发方案的完整技术规划，参照 OpenClaw 的分发模式，针对 Paperclip 的架构特点进行定制设计。

---

## 当前状态分析

### 已具备的基础设施

| 组件 | 状态 | 说明 |
|------|------|------|
| npm CLI 包 (`paperclipai`) | ✅ 已发布 | v0.3.0，含 bin 入口、esbuild 打包 |
| 发布系统 (Changesets) | ✅ 完善 | `scripts/release.sh` 支持 stable + canary |
| 嵌入式数据库 (embedded-postgres) | ✅ 集成 | 零外部 DB 依赖 |
| UI 嵌入 server | ✅ 支持 | `SERVE_UI=true` 模式 |
| Docker 镜像 | ✅ 已有 | Dockerfile 含完整构建流程 |
| 交互式 onboard 向导 | ✅ 已有 | `paperclipai onboard` |
| 诊断工具 | ✅ 已有 | `paperclipai doctor` |

### 需要新建的组件

| 组件 | 优先级 | 复杂度 |
|------|--------|--------|
| `install.sh` 一键安装脚本 | P0 | 中 |
| git clone 可开发模式 | P0 | 低 |
| macOS 桌面应用 | P1 | 高 |
| Windows PowerShell 安装器 | P2 | 中 |

---

## 方案一：`curl | bash` 一键安装

### 用法
```bash
curl -fsSL https://paperclipai.com/install.sh | bash
curl -fsSL https://paperclipai.com/install.sh | bash -s -- --install-method git
curl -fsSL https://paperclipai.com/install.sh | bash -s -- --install-method npm
```

### 架构设计

参照 OpenClaw 的 ~2600 行安装脚本，Paperclip 版本预计 ~800 行（因为不需要支持 40+ 扩展和消息平台）。

```
install.sh 流程图:
┌──────────────────┐
│ 检测 OS/架构      │
│ (macOS/Linux)     │
└────────┬─────────┘
         │
    ┌────▼────┐
    │ 选择模式 │ --install-method npm (默认) / git
    └────┬────┘
         │
    ┌────▼──────────────────────┐
    │ npm 路径:                  │
    │ 1. 检查/安装 Node.js 20+  │
    │ 2. npm i -g paperclipai   │
    │ 3. paperclipai doctor     │
    │ 4. paperclipai onboard    │
    └───────────────────────────┘
         │
    ┌────▼──────────────────────┐
    │ git 路径:                  │
    │ 1. 检查 pnpm (corepack)   │
    │ 2. git clone              │
    │ 3. pnpm install && build  │
    │ 4. 创建 wrapper script    │
    │ 5. paperclipai onboard    │
    └───────────────────────────┘
```

### 关键实现要点

**1. 环境检测和预装依赖**
```bash
#!/usr/bin/env bash
set -euo pipefail

# 操作系统检测
detect_platform() {
  local os arch
  os="$(uname -s)"
  arch="$(uname -m)"

  case "$os" in
    Darwin) PLATFORM="macos" ;;
    Linux)  PLATFORM="linux" ;;
    *)      echo "不支持的操作系统: $os"; exit 1 ;;
  esac

  case "$arch" in
    x86_64|amd64) ARCH="x64" ;;
    arm64|aarch64) ARCH="arm64" ;;
    *)              echo "不支持的架构: $arch"; exit 1 ;;
  esac
}

# Node.js 版本检查 (需要 20+)
ensure_node() {
  if command -v node &>/dev/null; then
    local ver
    ver="$(node -v | sed 's/v//' | cut -d. -f1)"
    if [ "$ver" -ge 20 ]; then
      return 0
    fi
  fi
  install_node
}
```

**2. macOS 上自动安装 Node.js**
```bash
install_node_macos() {
  if command -v brew &>/dev/null; then
    brew install node@22
  else
    echo "正在安装 Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    brew install node@22
  fi
}
```

**3. Linux 上通过 NodeSource 安装**
```bash
install_node_linux() {
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
}
```

**4. NVM 兼容性处理**
```bash
handle_nvm_conflicts() {
  if [ -n "${NVM_DIR:-}" ] || [ -d "$HOME/.nvm" ]; then
    echo "⚠️  检测到 NVM。请确保当前 Node 版本 >= 20："
    echo "   nvm install 22 && nvm use 22"
  fi
}
```

### 托管方式

- 脚本托管在 `https://paperclipai.com/install.sh`（或 `https://solounicornclub.com/install.sh`）
- 也同步保存在 GitHub repo: `scripts/install.sh`
- 每次 release 自动部署到 CDN

### 文件位置
```
scripts/
├── install.sh           # 主安装脚本 (~800行)
├── install.ps1          # Windows PowerShell 版 (P2)
└── install-lib.sh       # 共享函数库
```

---

## 方案二：`npm i -g paperclipai`

### 当前状态：✅ 已经可用

```bash
npm install -g paperclipai
paperclipai onboard     # 交互式设置
paperclipai run          # 启动服务
```

### 需要改进的地方

**1. 入口脚本增强（参照 OpenClaw 的 `openclaw.mjs`）**

当前直接用 esbuild 输出的 `dist/index.js`，建议增加版本检查 wrapper：

```javascript
#!/usr/bin/env node
// paperclipai.mjs — entry shim with Node version validation

const [major] = process.versions.node.split('.').map(Number);
if (major < 20) {
  console.error(`Paperclip 需要 Node.js 20+，当前版本: ${process.version}`);
  console.error('请升级 Node.js: https://nodejs.org/');
  process.exit(1);
}

// Enable module compile cache for faster cold starts (Node 22.8+)
if (typeof module !== 'undefined' && module.enableCompileCache) {
  module.enableCompileCache();
}

await import('./dist/index.js');
```

**2. 发布前自动 UI 构建**

在 `prepack` 或构建脚本中确保 `ui-dist` 被包含：
```json
{
  "scripts": {
    "prepack": "pnpm build && pnpm --filter @paperclipai/ui build"
  }
}
```

**3. 支持 canary 频道**
```bash
npm install -g paperclipai@canary    # 测试版
npm install -g paperclipai@latest    # 稳定版
```
> 这个已经由现有的 `release.sh --canary` 支持。

---

## 方案三：Git Clone 开发者模式

### 用法
```bash
git clone https://github.com/paperclipai/paperclip.git
cd paperclip
pnpm install
pnpm dev        # 开发模式
# 或
pnpm build && pnpm start  # 生产模式
```

### 需要改进的地方

**1. 添加 `pnpm dev` 一键启动脚本**

确保 `package.json` 根目录有:
```json
{
  "scripts": {
    "dev": "concurrently \"pnpm --filter @paperclipai/server dev\" \"pnpm --filter @paperclipai/ui dev\"",
    "start": "pnpm --filter @paperclipai/server start",
    "build": "pnpm -r build"
  }
}
```

**2. 创建 wrapper script（install.sh git 模式用）**

安装脚本的 git 路径会在 `~/.local/bin/paperclipai` 创建:
```bash
#!/usr/bin/env bash
PAPERCLIP_DIR="$HOME/.paperclip/source"
exec node "$PAPERCLIP_DIR/cli/dist/index.js" "$@"
```

**3. 首次运行文档**

README 应该有清晰的快速启动步骤（已经存在，可能需要更新）。

---

## 方案四：macOS 桌面应用

### 方案选择：Tauri vs Swift Native

| 维度 | Tauri | Swift Native |
|------|-------|-------------|
| 开发语言 | Rust + Web | Swift |
| 打包体积 | ~10-20MB | ~5-15MB |
| macOS 集成 | 好（WebView） | 最佳（原生） |
| Node.js 后端 | Sidecar 进程 | 子进程管理 |
| 开发效率 | 高（复用现有 UI） | 中（需写 Swift） |
| 跨平台 | ✅ Windows/Linux/macOS | ❌ macOS only |
| 自动更新 | 内置 updater | 需要 Sparkle |
| 学习曲线 | 低（已有 Web 技能） | 高（需要 Swift） |

### 推荐方案：Tauri v2

**原因：**
1. Paperclip 已有 React + Vite UI，Tauri 可以直接复用
2. 未来可扩展到 Windows/Linux 桌面版
3. 团队主要是 TypeScript 栈，Tauri 的 Rust 部分最小化
4. Sidecar 机制可以完美嵌入 Node.js 后端

> 注：OpenClaw 选择了 Swift Native 是因为他们需要深度 macOS 集成（Accessibility、Screen Recording、系统自动化）。Paperclip 作为管理平台不需要这些 OS 级权限，Tauri 更合适。

### Tauri 架构设计

```
┌─────────────────────────────────────────────┐
│              Paperclip.app                   │
│  ┌─────────────────────────────────────────┐│
│  │  Tauri Shell (Rust + WKWebView)         ││
│  │  ┌───────────────────────────────────┐  ││
│  │  │  React UI (现有的 ui/ 代码)        │  ││
│  │  │  通过 WebView 渲染                 │  ││
│  │  └───────────────────────────────────┘  ││
│  └─────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────┐│
│  │  Sidecar: paperclipai-server            ││
│  │  (打包的 Node.js + Express 后端)        ││
│  │  - 嵌入式 PostgreSQL                    ││
│  │  - Heartbeat 引擎                       ││
│  │  - 适配器系统                            ││
│  └─────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────┐│
│  │  系统托盘 (Menu Bar Icon)               ││
│  │  - 启动/停止服务                         ││
│  │  - 快速访问面板                          ││
│  │  - Agent 状态概览                        ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

### Tauri Sidecar 方案

Tauri v2 的 Sidecar 功能允许打包外部二进制文件：

**方式 A：Node.js Sidecar（推荐）**
```
apps/desktop/
├── src/                    # Rust Tauri 核心
│   ├── main.rs
│   └── lib.rs
├── src-tauri/
│   ├── tauri.conf.json     # Tauri 配置
│   ├── Cargo.toml
│   └── capabilities/       # 权限声明
├── binaries/               # Sidecar 二进制
│   └── paperclipai-server-{target}  # 打包好的 Node server
└── package.json
```

**tauri.conf.json 关键配置：**
```json
{
  "bundle": {
    "active": true,
    "targets": ["dmg", "app"],
    "identifier": "ai.paperclip.desktop",
    "externalBin": ["binaries/paperclipai-server"]
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "title": "Paperclip",
        "width": 1280,
        "height": 800,
        "url": "http://localhost:3100"
      }
    ],
    "trayIcon": {
      "iconPath": "icons/tray.png",
      "iconAsTemplate": true
    }
  }
}
```

**方式 B：直接连接本地 server**

更简单的方案 — Tauri 只做 WebView 壳子：
1. Tauri 启动时检查本地 `paperclipai` 是否安装
2. 启动 `paperclipai run` 作为子进程
3. WebView 加载 `http://localhost:3100`
4. 提供系统托盘控制

```rust
// src-tauri/src/main.rs
use tauri::Manager;
use std::process::{Command, Child};

struct ServerProcess(Child);

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // 启动 Paperclip server 作为子进程
            let child = Command::new("paperclipai")
                .arg("run")
                .spawn()
                .expect("Failed to start paperclipai server");

            app.manage(ServerProcess(child));
            Ok(())
        })
        .on_event(|_app, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                // 关闭时停止 server
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 打包为 .dmg

Tauri 内置 macOS 打包：
```bash
cd apps/desktop
pnpm tauri build --target universal-apple-darwin
# 产出: target/release/bundle/dmg/Paperclip_x.y.z_universal.dmg
```

### 代码签名和公证

```toml
# src-tauri/tauri.conf.json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Paperclip AI Inc",
      "entitlements": "./Entitlements.plist"
    }
  }
}
```

需要：
- Apple Developer ID 证书 ($99/年)
- `notarytool` 公证流程
- Entitlements.plist 声明权限

### 自动更新

Tauri v2 内置更新器：
```json
{
  "plugins": {
    "updater": {
      "endpoints": ["https://paperclipai.com/api/releases/latest"],
      "pubkey": "..."
    }
  }
}
```

---

## 项目文件结构

```
paperclip/
├── scripts/
│   ├── install.sh              # 新增：一键安装脚本
│   ├── install.ps1             # 新增：Windows 安装 (P2)
│   ├── build-npm.sh            # 已有：npm 构建
│   ├── release.sh              # 已有：发布脚本
│   └── ...
├── apps/                       # 新增：桌面应用目录
│   └── desktop/                # Tauri macOS 应用
│       ├── src-tauri/
│       │   ├── src/
│       │   │   ├── main.rs
│       │   │   └── lib.rs
│       │   ├── tauri.conf.json
│       │   ├── Cargo.toml
│       │   ├── icons/
│       │   └── capabilities/
│       ├── package.json
│       └── README.md
├── cli/                        # 已有：CLI 包
├── server/                     # 已有：Express 后端
├── ui/                         # 已有：React 前端
└── packages/                   # 已有：共享包
```

---

## 实施路线图

### Phase 1: install.sh 脚本 (1-2 天)
1. 编写 `scripts/install.sh`，支持 npm + git 两种模式
2. macOS 和 Linux 平台检测
3. Node.js 自动安装
4. NVM/nodenv 兼容性处理
5. 集成 `paperclipai onboard`
6. 测试：macOS Intel, macOS ARM, Ubuntu, Debian

### Phase 2: npm 包改进 (0.5 天)
1. 添加 Node 版本检查 wrapper
2. 确保 UI 嵌入到 server 包中
3. 验证全局安装流程端到端

### Phase 3: git clone 模式完善 (0.5 天)
1. 确保 `pnpm dev` 和 `pnpm start` 可用
2. install.sh git 路径的 wrapper script
3. 更新 README 快速启动文档

### Phase 4: Tauri macOS 应用 (3-5 天)
1. 搭建 `apps/desktop` Tauri 项目骨架
2. 实现 server 子进程管理
3. WebView 加载本地 UI
4. 系统托盘集成
5. .dmg 打包测试
6. 代码签名和公证流程

### Phase 5: 分发网站 (1 天)
1. 安装页面 UI（参照 OpenClaw 的 Tab 切换界面）
2. 托管 install.sh
3. .dmg 下载链接
4. 文档更新

---

## 对比 OpenClaw

| 维度 | OpenClaw | Paperclip |
|------|----------|-----------|
| install.sh 行数 | ~2600 行 | ~800 行 (更精简) |
| npm 包名 | `openclaw` | `paperclipai` |
| 桌面方案 | Swift Native (菜单栏) | Tauri (WebView + 系统托盘) |
| 支持平台 | macOS, iOS, Android | macOS (Tauri 可扩展) |
| 自动更新 | Sparkle (Swift) | Tauri Updater |
| 数据库 | SQLite | 嵌入式 PostgreSQL |
| Node 版本 | 22+ | 20+ |
| 扩展系统 | 40+ 频道插件 | 适配器系统 (6 种 AI 工具) |

### Paperclip 的优势
1. **更低的安装门槛**：Node 20+ 而不是 22+，兼容性更好
2. **嵌入式 PostgreSQL**：比 SQLite 更强大，但同样零配置
3. **Tauri 跨平台**：一套代码可以同时支持 macOS/Windows/Linux
4. **更精简的安装脚本**：不需要处理 40+ 扩展的复杂性

---

## 快速决策清单

- [x] npm 全局安装已就绪
- [ ] install.sh 脚本编写
- [ ] install.sh 多平台测试
- [ ] Tauri 项目初始化
- [ ] Sidecar vs 子进程方案最终确定
- [ ] Apple Developer 证书申请
- [ ] .dmg 打包和签名
- [ ] 自动更新服务端设置
- [ ] 安装页面上线
- [ ] Windows 安装脚本 (P2)
