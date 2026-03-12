# Solo Unicorn Desktop

Tauri v2 desktop application that wraps the Paperclip server and React UI into a native macOS app.

## Architecture

The desktop app uses a **sidecar approach**:

1. On startup, Tauri spawns the Paperclip server as a child process
2. The server starts embedded PostgreSQL and serves the React UI on port 3100
3. Tauri's WebView loads `http://localhost:3100` once the server is healthy
4. A system tray icon provides quick access (Open, Restart Server, Quit)
5. On exit, the server process is gracefully terminated

## Prerequisites

- **Node.js 20+** and **pnpm** (for building the monorepo and sidecar)
- **Rust toolchain** (only needed for building the desktop app, not for server development)

### Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

After installation, restart your terminal and verify:

```bash
rustc --version
cargo --version
```

### Install Tauri CLI

The Tauri CLI is included as a devDependency. After running `pnpm install` from the repo root, it is available via:

```bash
pnpm --filter @solounicorn/desktop tauri
```

## Development

### 1. Install dependencies

From the repo root:

```bash
pnpm install
```

### 2. Build the server sidecar

The sidecar is a standalone Node.js binary of the Paperclip server:

```bash
pnpm --filter @solounicorn/desktop build:sidecar
```

This bundles the server with esbuild and packages it with `@yao-pkg/pkg`, placing the binary in `src-tauri/binaries/`.

### 3. Run in development mode

```bash
pnpm --filter @solounicorn/desktop tauri:dev
```

This compiles the Rust shell, spawns the sidecar, and opens the app window.

### 4. Alternatively: run server separately

For faster iteration on the server/UI without rebuilding the sidecar, run the server in a separate terminal:

```bash
pnpm dev
```

Then open the Tauri app which will connect to the already-running server on port 3100.

## Building for Distribution

### Build the .dmg

```bash
# Build the sidecar first
pnpm --filter @solounicorn/desktop build:sidecar

# Build the Tauri app (produces .app and .dmg)
pnpm --filter @solounicorn/desktop tauri:build
```

The output will be in `src-tauri/target/release/bundle/`.

### Build a universal binary (Intel + Apple Silicon)

```bash
# Ensure both targets are installed
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin

# Build sidecar for both architectures (run on each or cross-compile)
pnpm --filter @solounicorn/desktop tauri:build-universal
```

## Code Signing

For local development and testing, code signing is not required. For distribution:

1. Set up an Apple Developer account
2. Create a Developer ID Application certificate
3. Set the `APPLE_SIGNING_IDENTITY` environment variable
4. Tauri will automatically sign during `tauri build`

See the [Tauri code signing guide](https://v2.tauri.app/distribute/sign/macos/) for details.

## Project Structure

```
apps/desktop/
├── package.json              # Node.js package with Tauri scripts
├── scripts/
│   └── build-sidecar.sh      # Builds the server into a standalone binary
├── src/
│   ├── index.html            # Loading screen shown while server starts
│   └── main.ts               # Frontend event listener for loading state
└── src-tauri/
    ├── tauri.conf.json        # Tauri configuration
    ├── Cargo.toml             # Rust dependencies
    ├── Entitlements.plist     # macOS entitlements
    ├── binaries/              # Sidecar binaries (generated, gitignored)
    ├── capabilities/
    │   └── default.json       # Permission grants for plugins
    ├── icons/                 # App icons (add before building)
    └── src/
        ├── main.rs            # Rust entry point
        └── lib.rs             # App setup: sidecar, health check, tray
```

## Troubleshooting

### Port 3100 already in use

If another process is using port 3100, the health check will still succeed (it checks for the `/api/health` endpoint specifically). Stop any other process on that port before launching the desktop app:

```bash
lsof -i :3100
kill <PID>
```

### Server fails to start

Check the Tauri console output for `[server:stdout]` and `[server:stderr]` log lines. Common issues:

- Missing environment variables (check `.env` in the repo root)
- Embedded PostgreSQL data directory permissions
- Port conflict

### Icons

Before building for distribution, add icon files to `src-tauri/icons/`. You can generate them from a single 1024x1024 PNG using:

```bash
pnpm tauri icon path/to/icon.png
```
