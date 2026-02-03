# Root Cause Analysis

> [!IMPORTANT]
> This root cause analysis was produced by AI using `Claud Opus 4.5` model given the [Prompt to perform root cause analysis of the bug](/claude-opus-4.5-analysis/prompts.md#prompt-to-perform-root-cause-analysis-of-the-bug).

## The Bug: Missing Export Definitions for Multi-Runtime Scenarios

The bug was introduced in **webpack commit `9dc25ca56a`** ("fix: module library export definitions when multiple runtimes") which first appeared in **v5.104.0**.

## The Problem

When you have the configuration:

1. **Module Federation with `library: { type: 'module' }`** - Uses the `ModuleLibraryPlugin`
2. **Styles (LESS files)** - Creates a separate `styles` runtime chunk
3. **Shared dependencies** - Creates shared module chunks (like `@angular/core`)

The bug manifests because:

1. **Pre-5.104.0 behavior**: Export definitions were stored globally in `module.buildMeta.factoryExportsBinding` and `module.buildMeta.exportsFinalName`. This worked for all runtimes.

2. **Post-5.104.0 behavior**: Export definitions are now stored **per-runtime** in Maps:
   - `module.buildMeta.exportsSourceByRuntime` (Map keyed by `getRuntimeKey(runtime)`)
   - `module.buildMeta.exportsFinalNameByRuntime` (Map keyed by `getRuntimeKey(runtime)`)

## Technical Explanation

### Pre-5.104.0 Behavior (Working)

Export definitions were stored globally on the module's build metadata:

- `module.buildMeta.factoryExportsBinding` - The export source code
- `module.buildMeta.exportsFinalName` - Mapping of export names to final names

This worked because the same export definitions were available regardless of which runtime was rendering the module.

### Post-5.104.0 Behavior (Broken)

The commit changed storage to be **per-runtime** using Maps:

- `module.buildMeta.exportsSourceByRuntime` - Map<RuntimeKey, Source>
- `module.buildMeta.exportsFinalNameByRuntime` - Map<RuntimeKey, Record<string, string>>

**File:** `lib/library/ModuleLibraryPlugin.js`

```javascript
// The hook stores exports only for runtimes passed in the array
onDemandExportsGeneration.tap(
  PLUGIN_NAME,
  (module, runtimes, source, finalName) => {
    const buildMeta = module.buildMeta || (module.buildMeta = {});

    const exportsSourceByRuntime =
      buildMeta.exportsSourceByRuntime ||
      (buildMeta.exportsSourceByRuntime = new Map());

    const exportsFinalNameByRuntime =
      buildMeta.exportsFinalNameByRuntime ||
      (buildMeta.exportsFinalNameByRuntime = new Map());

    // BUG: Only stores for runtimes in THIS specific call
    for (const runtime of runtimes) {
      const key = getRuntimeKey(runtime);
      exportsSourceByRuntime.set(key, source);
      exportsFinalNameByRuntime.set(key, finalName);
    }

    return true;
  }
);
```

**File:** `lib/library/ModuleLibraryPlugin.js` (renderStartup method)

```javascript
// Later, when rendering for a different runtime, the lookup fails
const exportsFinalNameByRuntime =
  (module.buildMeta &&
    module.buildMeta.exportsFinalNameByRuntime &&
    module.buildMeta.exportsFinalNameByRuntime.get(
      getRuntimeKey(chunk.runtime)  // May not exist!
    )) ||
  {};  // Falls back to empty object - NO EXPORTS!
```

### The Multi-Runtime Problem

When Angular styles are included in the build, webpack creates **two runtimes**:

1. `main` - The main application runtime
2. `styles` - The styles runtime

Similarly, when shared dependencies are configured in Module Federation (e.g., `shared: ['@angular/core', '@angular/common']`), webpack creates shared chunks that need to be accessible across multiple runtimes.

The code generation process may call the `onDemandExportsGeneration` hook with only a subset of runtimes (e.g., `["main"]`). When the module is later rendered for the `styles` runtime, the Map lookup returns `undefined`, falling back to an empty object `{}`.

When the fallback to `{}` happens, **no export definitions are available** for a given runtime, so the rendered chunk is **missing export bindings** resulting in:

- Drastically smaller chunk sizes (missing code)
- Broken imports at runtime

This is why:

- The `node_modules_angular_core_fesm2022_core_mjs-_57790.js` chunk is only **9.47 kB** with 5.104.1 but **314.87 kB** with 5.103.0
- The small chunk is missing the actual Angular core code that should be exported
- When the bootstrap tries to import from this chunk, it fails with "import bootstrap failed"

### Observable Symptoms

#### Chunk Size Comparison

| Chunk                                                   | webpack 5.103.0 | webpack 5.104.1 |
| ------------------------------------------------------- | --------------- | --------------- |
| `node_modules_angular_core_fesm2022_core_mjs-_57790.js` | 314.87 kB       | **9.47 kB** ❌  |
| `node_modules_angular_core_fesm2022_core_mjs-_57791.js` | 314.46 kB       | 313.52 kB       |

The dramatically smaller chunk in 5.104.1 is missing its export bindings, causing the dynamic import to fail.

## Why Conditions Trigger It

| Condition                        | Why it matters                                                      |
| -------------------------------- | ------------------------------------------------------------------- |
| `library: { type: 'module' }`    | Activates `ModuleLibraryPlugin` which has the bug                   |
| `styles: ["src/styles.less"]`    | Creates a separate `styles` runtime, causing multi-runtime scenario |
| `shared: ['@angular/core', ...]` | Creates shared chunks that need proper exports for both runtimes    |


## Files Changed in Problematic Commit

| File                                 | Changes                                         |
| ------------------------------------ | ----------------------------------------------- |
| `lib/Compilation.js`                 | Added `runtimes` to code generation context     |
| `lib/Module.js`                      | Added types for new buildMeta properties        |
| `lib/Template.js`                    | Minor type updates                              |
| `lib/library/ModuleLibraryPlugin.js` | **Main changes** - per-runtime export storage   |
| `lib/optimize/ConcatenatedModule.js` | Hook signature changed, passes `runtimes` array |

### The "import.meta" Error

The error `Cannot use 'import.meta' outside a module` is actually a **red herring**. It occurs because the `styles.js` chunk is loaded as a regular script (not as an ES module). This error was present even in v5.103.0 but didn't break the app because the critical Angular chunks were correctly generated. In v5.104.0+, the broken export generation causes the actual failure.

### Summary

**The bug is a regression in webpack v5.104.0's `ModuleLibraryPlugin`** where export definitions are only stored for a subset of runtimes during code generation, but are later needed for all runtimes during rendering. When styles create an additional runtime, the shared module chunks end up missing their export bindings for one of the runtimes, causing the dynamic imports to fail.

**Workaround**: Use webpack v5.103.0 until this is fixed upstream, or remove either:

- The `library: { type: 'module' }` from Module Federation config
- The styles from the build (not practical)
- The shared dependencies (not practical)
