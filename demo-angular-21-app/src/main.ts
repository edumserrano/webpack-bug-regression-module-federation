// Webpack Module Federation requires this async import pattern.
// The dynamic import creates an async boundary that allows Module Federation to:
// 1. Load remote modules asynchronously before application bootstrap
// 2. Resolve and load shared dependencies from the remote containers
// 3. Prevent errors from trying to use modules before they're available
// The actual bootstrap logic is moved to bootstrap.ts to enable this pattern.
import('./bootstrap')
	.catch(err => console.error("import bootstrap failed", err));
