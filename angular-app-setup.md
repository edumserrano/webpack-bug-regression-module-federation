# Demo Angular 21 App

> [!NOTE]
> This document contains information about the demo Angular app used to provide a reproduction for the bug. It was added for completeness but it shouldn't be required to understand and reproduce the bug.

The `demo-angular-21-app` folder contains an Angular 21 application configured with webpack Module Federation.

## Install & Run

```bash
cd demo-angular-21-app
npm install
npm run start:dev
```

The app will be available at `http://localhost:4200`.

For production mode:

```bash
npm run start:prod
```

## Modifications from `ng new`

The demo app was created with the `ng new demo-angular-21-app --style less --no-ssr --ai-config none` command and then modified to support webpack Module Federation. The following changes were made:

1. **Added `@angular-builders/custom-webpack` as a dev dependency**

   This package from [@angular-builders/custom-webpack](https://github.com/just-jeb/angular-builders/tree/master/packages/custom-webpack) allows extending Angular's default webpack configuration with custom plugins.

2. **Updated the Angular configuration to use the custom webpack builders**

   Updated [angular.json](/demo-angular-21-app/angular.json):
   - Changed the build builder to `@angular-builders/custom-webpack:browser`
   - Changed the serve builder to `@angular-builders/custom-webpack:dev-server`
   - Added `customWebpackConfig` option pointing to `webpack.config.js`

3. **Created `webpack.config.js` with Module Federation plugin**

   The custom webpack config [webpack.config.js](/demo-angular-21-app/webpack.config.js) adds the `ModuleFederationPlugin` with a basic configuration.

4. **Created an async boundary for Module Federation**

   Moved the bootstrap logic from [main.ts](/demo-angular-21-app/src/main.ts) into a new [bootstrap.ts](/demo-angular-21-app/src/bootstrap.ts) file. The `main.ts` now only contains a dynamic import of `bootstrap.ts`. This async boundary is required for Webpack Module Federation to properly load and resolve shared dependencies from remote containers before the application bootstraps.

5. **Added `overrides` to force a specific webpack version**

   Added an `overrides` section in [package.json](/demo-angular-21-app/package.json) to pin webpack to version `5.104.1` (latest). While this version would be installed by default, the override provides an easy way to test different webpack versions to identify regressions.
