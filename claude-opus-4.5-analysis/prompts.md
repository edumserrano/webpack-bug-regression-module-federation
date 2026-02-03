# AI Debugging Session

- [Description](#description)
- [Setup](#setup)
- [Prompt to perform root cause analysis of the bug](#prompt-to-perform-root-cause-analysis-of-the-bug)
- [Output of the prompt for root cause analysis](#output-of-the-prompt-for-root-cause-analysis)
- [Prompt to verify the root cause analysis output](#prompt-to-verify-the-root-cause-analysis-output)
- [Output of the prompt to verify the root cause analysis](#output-of-the-prompt-to-verify-the-root-cause-analysis)

## Description

This file documents the setup and prompt used with GitHub Copilot in VSCode to debug the webpack Module Federation regression documented in the main [README.md](/README.md).

## Setup

The following setup was in place before executing the prompt below with the `Claude Opus 4.5` model:

1. **Cloned this repository** and changed into the cloned directory:

   ```text
   git clone https://github.com/edumserrano/webpack-bug-regression-module-federation.git
   cd webpack-bug-regression-module-federation
   ```

2. **Cloned the webpack repository** into `.resources/webpack` (checked out at tag v5.104.1 to analyze the buggy version):

   ```text
   git clone https://github.com/webpack/webpack.git .resources/webpack
   cd .resources/webpack
   git checkout v5.104.1
   ```

3. **Installed npm packages** for the `demo-angular-21-app` folder:

   ```text
   cd ../../demo-angular-21-app
   npm install
   ```

4. **Configured the MCP server for Chrome DevTools** in VS Code just like it's shown at [.vscode/mcp.json](/.vscode/mcp.json) to allow the AI to interact with Chrome DevTools for debugging, inspecting network requests, and analyzing runtime behavior.

## Prompt to perform root cause analysis of the bug

The following prompt was used to ask the AI to investigate and determine the root cause of the webpack regression.

---

```text
I'm trying to find more information about a bug that happens when I run the demo-angular-21-app Angular app in production mode. This app uses a custom angular builder that allows the webpack configuration to be extended.

- The webpack configuration is being extended using webpack's ModuleFederationPlugin.
- To run the app in production mode run "npm start:prod" from the ./demo-angular-21-app directory.
- To run the app in development mode run "npm start:dev" from the ./demo-angular-21-app directory.
- You have access to chrome-dev tools so once the app is running you can go to it by navigating to http://localhost:4200/
- When the app works fine there's a "Hello, demo-angular-21-app" message on the page.
- When the app fails there's a console error message which starts with "import bootstrap failed". Don't look just at the first console error message. Evaluate them all.
- Whenever you change anything in the webpack.config.js you MUST stop and restart the app.
- Whenever you change anything in the angular.json you MUST stop and restart the app.
- Whenever you change anything in the package.json you MUST stop and restart the app.
- If you want to test different webpack versions, change the overrides for webpack and do "npm i". You must restart the app if you change packages.
- You have access to Webpack's code base at .resources/webpack. This folder contains the checkout for tag v.5.104.1.

More info about the cases where the bug happens:

- With the "library: { type: 'module' }," commented out in the webpack.config.js the app always runs fine.
- With the "library: { type: 'module' }," uncommented in the webpack.config.js the app fails IF the angular.json build styles contains "styles": ["src/styles.less"].  With "library: { type: 'module' }," uncommented but empty styles like "styles": [] then it also runs fine.
- If the list of dependencies in the shared object of module federation is empty then the bug never happens.
- The bug NEVER happens, regardless of webpack.config.json or angular.json config WHEN the tag v5.103.0 of webpack is used. The bug with the above conditions happens starting on tags v5.104.0 and v5.104.1 of webpack. The currently installed version of webpack as shown by the overrides in package.json is 5.104.1.
- In version v5.1.03.0 the error console message "Uncaught SyntaxError: Cannot use 'import.meta' outside a module" is still present but everything works fine. In this version we don't get the second console error message with "import bootstrap failed".
- The output from the ng cli from building the app is different when using webpack version 5.103.0 and version 5.104.0/5.104.1. It seems the sizes of chunks get smaller in the bugged versions.

Why is this bug happening?
```

The provided context with the prompt was the following files:

- [/demo-angular-21-app/package.json](/demo-angular-21-app/package.json)
- [/demo-angular-21-app/webpack.config.js](/demo-angular-21-app/webpack.config.js)
- [/demo-angular-21-app/angular.json](/demo-angular-21-app/angular.json)

## Output of the prompt for root cause analysis

The output of the [Prompt to perform root cause analysis of the bug](#prompt-to-perform-root-cause-analysis-of-the-bug) is at [/claude-opus-4.5-analysis/root-cause-analysis.md](/claude-opus-4.5-analysis/root-cause-analysis.md).

## Prompt to verify the root cause analysis output

After the root cause analysis I decided to perform another prompt to verify that reverting the suggested commit would fix the issue.

```text
- The webpack configuration is being extended using webpack's ModuleFederationPlugin.
- To run the app in production mode run "npm start:prod" from the ./demo-angular-21-app directory.
- To run the app in development mode run "npm start:dev" from the ./demo-angular-21-app directory.
- You have access to chrome-dev tools so once the app is running you can go to it by navigating to http://localhost:4200/
- When the app works fine there's a "Hello, demo-angular-21-app" message on the page.
- When the app fails there's a console error message which starts with "import bootstrap failed". Don't look just at the first console error message. Evaluate them all.
- Whenever you change anything in the webpack.config.js you MUST stop and restart the app.
- Whenever you change anything in the angular.json you MUST stop and restart the app.
- Whenever you change anything in the package.json you MUST stop and restart the app.
- If you want to test different webpack versions, change the overrides for webpack and do "npm i". You must restart the app if you change packages.
- You have access to Webpack's code base at .resources/webpack. This folder contains the checkout for tag v.5.104.1.

Given the bug analysis, revert the code change from the problematic commit, update the demo-angular-21-app to use the local version of webpack and verify the bug is no longer present.
```

The provided context with the prompt was the following files:

- [/claude-opus-4.5-analysis/root-cause-analysis.md](/claude-opus-4.5-analysis/root-cause-analysis.md)
- [/demo-angular-21-app/package.json](/demo-angular-21-app/package.json)
- [/demo-angular-21-app/webpack.config.js](/demo-angular-21-app/webpack.config.js)
- [/demo-angular-21-app/angular.json](/demo-angular-21-app/angular.json)

## Output of the prompt to verify the root cause analysis

The output of the [Prompt to verify the root cause analysis output](#prompt-to-verify-the-root-cause-analysis-output) is at [/claude-opus-4.5-analysis/verify-root-cause-analysis.md](/claude-opus-4.5-analysis/verify-root-cause-analysis.md).

The content of the files reverted can be seen at:

- [claude-opus-4.5-analysis/files-reverted/webpack/lib/library/ModuleLibraryPlugin.js](claude-opus-4.5-analysis/files-reverted/webpack/lib/library/ModuleLibraryPlugin.js)
- [claude-opus-4.5-analysis/files-reverted/webpack/lib/optimize/ConcatenatedModule.js](claude-opus-4.5-analysis/files-reverted/webpack/lib/optimize/ConcatenatedModule.js)
