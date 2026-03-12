# Solo Unicorn — npm Publishing Guide

## Prerequisites

### npm Account

You need an npm account with permission to publish the `solo-unicorn` package.

1. Create an account at https://www.npmjs.com/signup (or use an existing one).
2. The package name `solo-unicorn` must be available, or you must own it.
3. If publishing under an npm org/scope, adjust the package name accordingly
   (e.g. `@solo-unicorn/cli`).

### Domain and Hosting

- **Domain**: `solounicornclub.com`
- **Purpose**: Host the install script and documentation.
- **Minimum hosting requirement**: A static file server (e.g. Vercel, Netlify,
  Cloudflare Pages, GitHub Pages, or any CDN).
- The install script must be served at `https://solounicornclub.com/install.sh`
  with `Content-Type: text/plain` or `application/x-sh`.

## Publishing to npm

### 1. Log in to npm

```bash
npm login
```

Follow the prompts to authenticate. If you use 2FA, you will be prompted for a
one-time code during publish.

### 2. Build the CLI

From the repository root:

```bash
./scripts/build-npm.sh
```

This will:
- Run type checks across the monorepo
- Bundle the CLI with esbuild
- Generate a publishable `cli/package.json` (replacing workspace refs with
  real versions)

### 3. Preview the package (optional)

```bash
cd cli && npm pack --dry-run
```

Review the listed files to make sure nothing unexpected is included.

### 4. Publish

```bash
cd cli && npm publish --access public
```

### 5. Restore the dev package.json

After publishing, restore the workspace-based package.json:

```bash
mv cli/package.dev.json cli/package.json
```

### 6. Verify

```bash
npm info solo-unicorn
```

## How Users Install

### Option A: One-line install script

```bash
curl -fsSL https://solounicornclub.com/install.sh | bash
```

This installs the CLI globally via npm after checking that Node.js 20+ and npm
are available.

### Option B: Direct npm install

```bash
npm install -g solo-unicorn
```

### Option C: Run without installing

```bash
npx solo-unicorn --help
```

## Hosting the Install Script

Serve the file `scripts/install.sh` at `https://solounicornclub.com/install.sh`.

### Static hosting examples

**Vercel / Netlify / Cloudflare Pages**: Place `install.sh` in your site's
`public/` directory and deploy.

**GitHub Pages**: Push `install.sh` to the root of a `gh-pages` branch or
`docs/` folder.

**Nginx**:
```nginx
location /install.sh {
    alias /var/www/solounicornclub.com/install.sh;
    default_type text/plain;
}
```

### Verification

After deploying, confirm it works end-to-end:

```bash
curl -fsSL https://solounicornclub.com/install.sh | bash
solounicorn --help
```
