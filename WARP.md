# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Current repository state

This is a Stream Deck plugin for controlling Spotify on macOS. The plugin uses the Spotify Web API for reliable playlist playback control.

## Spotify Developer Setup

**Required for first-time setup:**

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click **Create App**
4. Fill in:
   - App name: `Stream Deck Controller` (or any name)
   - Redirect URI: `http://localhost:3000/callback`
   - Select **Web API**
5. Save the **Client ID** - you'll paste this into the Stream Deck Property Inspector when configuring the plugin

## Project Commands

```bash
# Navigate to the control directory
cd control

# Install dependencies
npm install

# Build and watch for changes
npm run watch

# Link plugin to Stream Deck (first time only)
streamdeck link com.spotify-macos.control.sdPlugin

# Restart plugin after changes
streamdeck restart com.spotify-macos.control
```

## How to infer and document project commands (for future agents)

When the project gains real files, use this procedure to discover and document the main development commands in this section.

1. **Identify the primary language and toolchain**
   - Look for files like `package.json`, `pnpm-workspace.yaml`, `yarn.lock` (JavaScript/TypeScript), `pyproject.toml` (Python), `Cargo.toml` (Rust), `go.mod` (Go), `Gemfile` (Ruby), etc.
   - If multiple ecosystems exist (e.g., a backend and a frontend), document each separately with clear headings.

2. **Derive build / run commands**
   - For Node-based projects, inspect `scripts` in `package.json` and record how to:
     - Install dependencies
     - Run the dev server (if any)
     - Build for production
   - For other ecosystems, inspect the canonical build files and document the primary build and run commands (e.g., `cargo build`, `go build ./...`, `python -m <module>`, etc.).

3. **Derive lint / format commands**
   - Search for configuration files such as `.eslintrc*`, `.prettierrc*`, `ruff.toml`, `.flake8`, `rustfmt.toml`, `golangci.yml`, etc.
   - Identify the corresponding CLI tools and document the exact commands used to run them (prefer any existing wrapper scripts in `package.json`, `Makefile`, `justfile`, or similar).

4. **Derive test commands**
   - Identify the test framework from configuration (e.g., Jest, Vitest, pytest, Go test, Rust test, etc.).
   - Document:
     - How to run the full test suite.
     - How to run a single test file or a narrow subset (e.g., using Jest's `--runTestsByPath`, pytest `-k` or test path, `go test ./pkg/...`, etc.).

Once these are known, replace this section with concrete, project-specific commands.

## How to infer and document architecture (for future agents)

When source code has been added, future Warp agents should:

1. **Map top-level structure**
   - Use `find . -maxdepth 3 -type d` (or equivalent) to understand major folders (e.g., `src`, `apps`, `packages`, `backend`, `frontend`, `plugins`).
   - Identify entrypoints (e.g., `main` functions, server bootstrap files, or plugin registration points) and document them.

2. **Identify core domains and boundaries**
   - Look for how code is grouped (e.g., by feature, by layer such as `api`, `domain`, `infra`, or by platform such as `streamdeck-plugin`, `core-lib`).
   - Summarize **how these parts talk to each other** (public APIs, event systems, dependency injection, shared models, etc.), focusing on relationships that require reading multiple files.

3. **Document cross-cutting concerns**
   - If there are shared utilities (logging, error handling, configuration, telemetry, plugin loading, etc.), document where they live and how other modules consume them.
   - Note any framework-specific conventions (e.g., React component layout, NestJS modules, Django apps, etc.).

4. **Update this file with concrete details**
   - Add a short "Architecture Overview" section describing the main modules/services and their responsibilities.
   - Avoid listing every file; instead, highlight the key directories, entrypoints, and patterns that future agents need to know to be productive quickly.

## Project-specific rules and other assistants

If in the future this repository adds any of the following, summarize the important parts here so Warp agents can align with them:

- `CLAUDE.md`
- `.cursor/rules/*` or `.cursorrules`
- `.github/copilot-instructions.md`
- Additional project-wide rules or guidelines files

At that point, future agents should:

1. Read those files and extract only the **project-specific** rules (e.g., naming conventions, architectural constraints, or tooling preferences).
2. Summarize those constraints in this section, avoiding generic advice that is already obvious or duplicated across tools.

Until such files exist, there are no project-specific assistant rules to mirror here.
