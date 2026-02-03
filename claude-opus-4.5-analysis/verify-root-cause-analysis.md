# Verify root cause analysis of the bug

> [!IMPORTANT]
> This fix was produced by AI using `Claud Opus 4.5` model given the [Prompt to verify the root cause analysis output](/claude-opus-4.5-analysis/prompts.md#prompt-to-verify-the-root-cause-analysis-output).

## Issue

A regression bug was introduced in **webpack commit `9dc25ca56a`** ("fix: module library export definitions when multiple runtimes") which first appeared in **v5.104.0**.

## Technical Details

The commit changed how export definitions are stored in `ModuleLibraryPlugin.js` and `ConcatenatedModule.js`:

| Before (Working)                                                                                                       | After (Broken)                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Export definitions stored globally in `module.buildMeta.factoryExportsBinding` and `module.buildMeta.exportsFinalName` | Export definitions stored per-runtime in Maps: `exportsSourceByRuntime` and `exportsFinalNameByRuntime` |

The **`shared` block in Module Federation** is critical to triggering this bug:

```javascript
new ModuleFederationPlugin({
  name: 'mfe1',
  library: { type: 'module' },
  filename: 'remoteEntry.js',
  shared: ['@angular/core', '@angular/router', '@angular/common'],  // ← This matters!
})
```

When shared dependencies are configured:

1. Webpack creates **separate shared chunks** for each shared package (e.g., `@angular/core`)
2. These shared chunks need proper export bindings for **all runtimes** that may load them
3. The buggy per-runtime storage only stores exports for the runtime active during code generation
4. When a different runtime tries to load the shared chunk, the export lookup fails (returns `{}`)
5. The chunk is rendered **without its export definitions**, causing drastically smaller sizes

Additionally, when **styles are present**, webpack creates **two runtimes** (`main` and `styles`). This multi-runtime scenario is what exposes the bug - the per-runtime storage causes export definitions to be missing for some runtimes.

This results in:

- Drastically smaller chunk sizes (missing code)
- Broken imports at runtime

### Observable Symptoms

| Chunk                                                   | webpack 5.103.0  | webpack 5.104.1 (buggy) |
| ------------------------------------------------------- | ---------------- | ----------------------- |
| `node_modules_angular_core_fesm2022_core_mjs-_57790.js` | **313.93 kB** ✅ | **9.47 kB** ❌          |

## Fix Applied

### Files Reverted

The following files in `.resources/webpack` were reverted to their pre-bug state (commit `9dc25ca56a^`):

1. **`lib/library/ModuleLibraryPlugin.js`**
   - Reverted the `onDemandExportsGeneration` hook handler from per-runtime Map storage back to the simple `(_module) => true` callback
   - Reverted `renderStartup` to use global `module.buildMeta.exportsFinalName` instead of per-runtime lookup
   - Reverted `renderModuleContent` to use global `module.buildMeta.factoryExportsBinding` instead of per-runtime lookup

2. **`lib/optimize/ConcatenatedModule.js`**
   - Reverted the `onDemandExportsGeneration` hook signature back to only passing `module`
   - Reverted the code generation to use global `factoryExportsBinding` and `exportsFinalName` storage

### Installation Method

The local patched webpack is installed via npm overrides in `package.json`:

```json
{
  "overrides": {
    "webpack": "file:.resources/webpack"
  }
}
```

This creates a symlink from `node_modules/webpack` to `.resources/webpack`.

## Verification

After applying the fix:

1. ✅ Chunk sizes are correct (~314 kB for Angular core instead of ~9 kB)
2. ✅ Application displays "Hello, debug-ng21" correctly
3. ✅ No console errors (the "import.meta" error no longer appears)

### Test Commands

```bash
# Run with patched webpack
cd demo-angular-21-app
npm run start:prod

# Navigate to http://localhost:4200/ to verify
```

## References

- **Problematic Commit:** https://github.com/webpack/webpack/commit/9dc25ca56af72ff71186adf2a46d46b7e3e4fb8a
- **PR #20179:** https://github.com/webpack/webpack/pull/20179
- **Detailed Analysis:** See [root-cause-analysis.md](./root-cause-analysis.md)
