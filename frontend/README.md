
This application is using React + Vite with the following setup:

### Main addons:
- `@dnd-kit` - Drag and drop functionality
- `reactflow` - Flow canvas/diagram support
- `i18n` - Internationalization
- `@mantine/core` - UI component library
- `recharts` - Charts and visualizations
- `sass` - SCSS support for stylesheets

### TypeScript with Type-Aware Linting

This project is configured with **TypeScript** and **type-aware ESLint rules** enabled for production-grade code quality.

#### Features:

- **Full TypeScript support** - All source files in `src/` are linted with TypeScript
- **Type-aware rules** - ESLint rules that understand your type information
- **Strict mode** - `strict: true` in `tsconfig.json` for maximum type safety
- **React JSX** - Full support for React 19 with JSX

#### Key configurations:

**TypeScript:**
- `tsconfig.json` - Main TypeScript configuration with strict mode
- `tsconfig.node.json` - Config for build and config files

**ESLint:**
- `eslint.config.js` - Configured with `@typescript-eslint` for type checking
- Covers both `.js/.jsx` files and `.ts/.tsx` files with appropriate rules

#### Running type checks:

```bash
npm run lint      # Run ESLint with TypeScript type-aware rules
npm run build     # Build with type checking (Vite)
npm run dev       # Start dev server with hot reload
```

#### Common lint errors and fixes:

- **Unused variables** - Remove or prefix with `_` to ignore
- **Floating promises** - Await promises or use `.catch()` / `.then()`
- **Unsafe `any` types** - Provide proper TypeScript types
- **Unsafe arguments** - Ensure type compatibility

See [typescript-eslint documentation](https://typescript-eslint.io) for more details on type-aware linting.