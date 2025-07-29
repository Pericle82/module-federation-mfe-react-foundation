# Source Maps Configuration Guide

## Problem
When debugging in the browser console, clicking on TypeScript/TSX file links opens the compiled JavaScript files instead of the original source code. This makes debugging difficult as you can't see the original TypeScript code with proper line numbers and variable names.

## Root Cause
The issue occurs when webpack source maps are not properly configured or are missing entirely. Source maps are files that map the compiled JavaScript back to the original TypeScript source code.

## Solution Applied

### 1. Added `devtool` Configuration to All Webpack Configs
```javascript
module.exports = {
  // ... other config
  devtool: 'eval-source-map', // Enable proper source maps for debugging
  // ... rest of config
};
```

#### Source Map Options Explained:
- **`eval-source-map`**: Fast rebuilds, shows original source in dev tools (best for development)
- **`source-map`**: Slower builds but highest quality maps (good for production debugging)
- **`cheap-module-source-map`**: Faster builds, less detailed maps
- **`inline-source-map`**: Embeds source map in bundle (increases bundle size)

For development, `eval-source-map` provides the best balance of build speed and debugging quality.

### 2. Enhanced Babel Configuration
```javascript
{
  loader: 'babel-loader',
  options: {
    // ... presets
    sourceMaps: true,        // Enable source maps in Babel
    inputSourceMap: true,    // Use input source maps
  },
}
```

This ensures Babel preserves source maps through the TypeScript → JavaScript transformation.

### 3. Updated All Microfrontend Configurations
Applied the same source map configuration to:
- **Container** (`/container/webpack.config.js`)
- **MFE 1** (`/mfe_1/webpack.config.js`)
- **MFE 2** (`/mfe_2/webpack.config.js`)
- **Service MFE** (`/service_mfe/webpack.config.js`)
- **Store MFE** (`/store_mfe/webpack.config.js`)

## Benefits

### ✅ **Improved Debugging Experience**
- Click on console links opens actual TypeScript/TSX files
- Original variable names are preserved
- Accurate line numbers matching your source code
- Full TypeScript syntax highlighting in dev tools

### ✅ **Better Error Reporting**
- Stack traces show original TypeScript file locations
- Error messages reference your actual source code
- Easier to identify and fix issues

### ✅ **Enhanced Development Workflow**
- Set breakpoints directly in TypeScript source
- Step through original code during debugging
- Inspect variables with their original names

## Verification

After applying these changes:

1. **Open Developer Tools** in your browser
2. **Go to Sources tab** - you should see your TypeScript files under `webpack://`
3. **Check Console** - clicking on file links should open TypeScript source, not JavaScript
4. **Set Breakpoints** - you can now set breakpoints directly in your TypeScript code
5. **Inspect Variables** - variable names should match your TypeScript code

## Browser DevTools Settings

To ensure optimal source map experience, check these settings in Chrome DevTools:

1. **Settings** → **Preferences** → **Sources**
2. ✅ **Enable JavaScript source maps**
3. ✅ **Enable CSS source maps** 
4. ✅ **Enable code folding**

## File Structure in DevTools

With proper source maps, you'll see this structure in the Sources tab:
```
webpack://
├── container/
│   └── src/
│       ├── components/
│       ├── mfe/
│       │   ├── Mfe_1.tsx          ← Original TypeScript files!
│       │   ├── Mfe_2.tsx
│       │   └── hooks/
│       │       └── useMicrofrontend.ts
│       └── App.tsx
└── mfe_1/
    └── src/
        └── mount.tsx               ← MFE source files!
```

## Production Considerations

For production builds, consider:
- Use `source-map` for better quality maps
- Consider `hidden-source-map` to hide source maps from end users
- Upload source maps to error tracking services (Sentry, LogRocket, etc.)
- Implement proper error boundaries with source map support

## Troubleshooting

If source maps still don't work:

1. **Clear browser cache** - Old cached files might interfere
2. **Check Network tab** - Ensure `.map` files are being loaded
3. **Verify webpack version** - Some older versions have source map issues
4. **Check for conflicting plugins** - Some plugins might interfere with source maps
5. **Disable browser extensions** - Ad blockers might block source map requests

## Performance Impact

- **Development**: Minimal impact on build time with `eval-source-map`
- **Bundle Size**: Source maps are separate files, don't affect bundle size
- **Runtime**: No performance impact on application execution
- **Memory**: DevTools uses more memory to store source mappings
