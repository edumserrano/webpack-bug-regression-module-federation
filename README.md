# Webpack bug when using ModuleFederationPlugin

- [Description](#description)
- [Bug Summary](#bug-summary)
  - [Environment](#environment)
  - [The Problem](#the-problem)
  - [Conditions Required](#conditions-required)
  - [Steps to Reproduce](#steps-to-reproduce)
  - [Root Cause](#root-cause)
  - [Workarounds](#workarounds)
  - [Verified Fix](#verified-fix)
- [Demo Angular 21 App](#demo-angular-21-app)

## Description

This repo contains a reproduction case for a webpack regression affecting applications using the [ModuleFederationPlugin](https://webpack.js.org/plugins/module-federation-plugin/). **The bug analysis was performed by AI using GitHub Copilot in VSCode with the `Claude Opus 4.5` model. For more information see the [AI Debugging Session](/claude-opus-4.5-analysis/prompts.md) doc.**

Webpack [[Bug Report] ModuleFederationPlugin with library: { type: 'module' } produces broken shared chunks in v5.104.0+ #20405](https://github.com/webpack/webpack/issues/20405)

## Bug Summary

**Affected Versions:** webpack 5.104.0, 5.104.1
**Working Versions:** webpack 5.103.0 and earlier
**Regression Commit:** [`9dc25ca56a`](https://github.com/webpack/webpack/commit/9dc25ca56af72ff71186adf2a46d46b7e3e4fb8a) from PR [fix: module library export definitions when multiple runtimes #20179](https://github.com/webpack/webpack/pull/20179).

### Environment

Result from `npx webpack info`:

```text
  System:
    OS: Windows 11 10.0.26200
    CPU: (16) x64 AMD Ryzen 7 7800X3D 8-Core Processor
    Memory: 29.39 GB / 63.16 GB
  Binaries:
    Node: 24.13.0 - C:\Program Files\nodejs\node.EXE
    npm: 11.8.0 - C:\Program Files\nodejs\npm.CMD
  Browsers:
    Chrome: 144.0.7559.110
    Edge: Chromium (140.0.3485.54)
    Firefox: 147.0.1 - C:\Program Files\Mozilla Firefox\firefox.exe
    Internet Explorer: 11.0.26100.7309
  Packages:
    webpack-cli: ^6.0.1 => 6.0.1
```

### The Problem

A regression in webpack v5.104.0+ causes Angular applications using webpack's [ModuleFederationPlugin](https://webpack.js.org/plugins/module-federation-plugin/) with `library: { type: 'module' }` to fail at runtime. The shared chunks are generated with missing exports (e.g., 9 kB instead of 314 kB) and leads to a runtime error when the app is starting.

### Conditions Required

The bug occurs when **all** of these are present:

- Module Federation Plugin configuration with `library: { type: 'module' }`
- Non-empty styles array in angular.json
- Shared dependencies configured
- Production mode Angular build (optimization enabled)

### Steps to Reproduce

1. **Clone the repository:**

   ```text
   git clone https://github.com/edumserrano/webpack-bug-regression-module-federation.git
   cd webpack-bug-regression-module-federation/demo-angular-21-app
   ```

2. **Install dependencies and run in production mode:**

   ```text
   npm install
   npm run start:prod
   ```

3. **Open http://localhost:4200** - The app fails to load with a runtime error.

4. **To verify this is a regression, downgrade webpack and run again:**

   ```text
   npm pkg set overrides.webpack=5.103.0
   npm install
   npm run start:prod
   ```

   The app now loads successfully.

> [!NOTE]
> Running in development mode with `npm run start:dev` does not trigger the bug.

### Root Cause

> [!IMPORTANT]
> The root cause analysis was performed by AI using `Claude Opus 4.5` model. **You can see the prompt used in the [AI Debugging Session](/claude-opus-4.5-analysis/prompts.md#prompt-to-perform-root-cause-analysis-of-the-bug) doc.**

The problematic commit changed export definition storage from global to **per-runtime Maps**. When styles create a separate runtime (e.g.: main + styles), the `onDemandExportsGeneration` hook only stores exports for a subset of runtimes. When rendering for the missing runtime, the lookup returns an empty object, causing missing export bindings in shared chunks.

**Files involved:**

- `lib/library/ModuleLibraryPlugin.js` - Per-runtime export storage
- `lib/optimize/ConcatenatedModule.js` - Hook signature changes

The full root cause analysis is available in the [Root Cause Analysis](/claude-opus-4.5-analysis/root-cause-analysis.md) doc.

### Workarounds

| Workaround                      | Command/Change                                                            |
| ------------------------------- | ------------------------------------------------------------------------- |
| Downgrade webpack (recommended) | Add `"overrides": { "webpack": "5.103.0" }` to package.json               |
| Remove ESM library type         | Remove `library: { type: 'module' }` from Module Federation Plugin config |
| Remove shared dependencies      | Set `shared: []` in Module Federation Plugin config (impractical)         |
| Remove styles                   | Set `"styles": []` in angular.json (impractical)                          |

### Verified Fix

> [!IMPORTANT]
> The bug fix was verified by AI using `Claude Opus 4.5` model. **You can see the prompt used in the [AI Debugging Session](/claude-opus-4.5-analysis/prompts.md#prompt-to-verify-the-root-cause-analysis-output) doc.**

Reverting both `ModuleLibraryPlugin.js` and `ConcatenatedModule.js` to their pre-5.104.0 versions fixes the issue. See the [Verify root cause analysis of the bug](/claude-opus-4.5-analysis/verify-root-cause-analysis.md) doc for the fix verification steps.

## Demo Angular 21 App

For more information about the Angular app used to reproduce the bug see the [Angular app setup doc](/angular-app-setup.md).
