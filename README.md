# vGrid

**vGrid** is a standalone JavaScript data grid. The core has no runtime dependencies. It can be installed from npm or GitHub, used directly from a browser script, or mounted through the included React and Vue adapters.

- Local rows from an array, or remote rows from your server, which pages, sorts and filters
- Sorting on one or several columns, a filter row with drop-downs and filter modes, page size and pager
- Column resizing, reordering and hiding, with the chosen columns and their order remembered in the browser
- Detail panels per row: HTML, text, or a nested grid with its own paging
- Row actions, row click events, row reordering, cell selection with copy
- Download as a CSV made in the browser or as a file from your server, and print
- Keyboard operable, with table semantics, sort states and result counts for screen readers

The npm package identifier is `vgrid`. The JavaScript API is `vGrid(config)`. The React component is exported as `VGRID` and the Vue component as `vGrid`, each as both a named and the default export.

Read the [web documentation](https://grid.virgils.org/documentation).

## Install

After publishing the package to npm:

```sh
npm install vgrid
```

To install from this GitHub repository before or instead of an npm release:

```sh
npm install github:virgil2304/vGrid
```

Append `#<tag-or-commit>` to pin a particular release or commit. The repository includes the package files needed for installation.

## Use the core with npm

```js
import { vGrid } from 'vgrid';
import 'vgrid/style.css';

const grid = vGrid({
    el: document.querySelector('#people-grid'),
    columns: [
        { name: 'name', label: 'Name' },
        { name: 'email', label: 'Email' },
    ],
    data: [
        { name: 'Ada Lovelace', email: 'ada@example.com' },
    ],
});

// When the host element is removed:
grid?.destroy();
```

The framework-neutral export is `vGrid(config)`. The `el` option accepts a selector or an element. The returned instance includes `reload()`, `setPage()`, `sort()`, and `destroy()`.

## TypeScript

The core, React, Vue, browser entry, and stylesheet imports include type declarations. Row types can be inferred from `data` or supplied explicitly:

```ts
import { vGrid, type vGridConfig } from 'vgrid';
import 'vgrid/style.css';

interface Person {
    name: string;
    email: string;
}

const config: vGridConfig<Person> = {
    el: '#people-grid',
    columns: [{ name: 'name', label: 'Name' }],
    data: [{ name: 'Ada Lovelace', email: 'ada@example.com' }],
};

const grid = vGrid(config);
grid?.reload([{ name: 'Grace Hopper', email: 'grace@example.com' }]);
```

`vGridOptions` describes the `config` passed to a framework adapter, which supplies its own host element. `vGrid()` returns `null` when the grid cannot start: no host element, or a column named after a reserved request parameter. Other invalid values log a `vGrid:` error in the console and the default is used. TypeScript React apps also need `@types/react` matching their React version.

## React

Install React in the consuming app, then render `<VGRID />` in JSX:

```jsx
'use client';

import { useMemo } from 'react';
import { VGRID } from 'vgrid/react';
import 'vgrid/style.css';

export function PeopleGrid({ people }) {
    const config = useMemo(() => ({
        columns: [
            { name: 'name', label: 'Name' },
            { name: 'email', label: 'Email' },
        ],
        data: people,
    }), [people]);

    return <VGRID id="people-grid" config={config} />;
}
```

The React export is spelled `VGRID` because JSX treats a tag that starts with a lowercase letter as a native HTML element. `import VGRID from 'vgrid/react'` and the `vGrid` alias remain available for `createElement` usage.

The adapter mounts vGrid after React creates its host element and destroys it when the component unmounts. Replacing `config` rebuilds the grid, so keep it stable with `useMemo` when appropriate. React owns the host `<div>`; vGrid owns the contents inside it. Any other props (`id`, `className`, `style`, ...) are applied to the host `<div>`.

The React entry is marked as a Client Component for Next.js. The example also uses hooks, so it includes `'use client'`. When passing configuration from a Server Component, use serializable values; define callback functions inside a Client Component.

## Vue

Install Vue in the consuming app, then import the adapter and shared stylesheet:

```vue
<script setup>
import { computed } from 'vue';
import { vGrid } from 'vgrid/vue';
import 'vgrid/style.css';

const props = defineProps({ people: { type: Array, required: true } });
const config = computed(() => ({
    columns: [
        { name: 'name', label: 'Name' },
        { name: 'email', label: 'Email' },
    ],
    data: props.people,
}));
</script>

<template>
    <component :is="vGrid" id="people-grid" :config="config" />
</template>
```

Render the imported component with `<component :is="vGrid" :config="config" />`. Both `import { vGrid } from 'vgrid/vue'` and `import vGrid from 'vgrid/vue'` are supported.

The adapter mounts vGrid after Vue creates its host element and destroys it before unmount. Replacing the `config` object rebuilds the grid. Vue owns the host `<div>`; vGrid owns the contents inside it. Non-prop attributes (`id`, `class`, `style`, ...) are applied to the host `<div>`.

## Browser script tags

The `dist/` folder contains the classic browser build and minified files:

```html
<link rel="stylesheet" href="./dist/vgrid.min.css">
<script src="./dist/vgrid.min.js"></script>
<script>
  const grid = vGrid({ el: '#people-grid', columns: [], data: [] });
</script>
```

The same files are available from a CDN once the package is published to npm:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/vgrid@1/dist/vgrid.min.css">
<script src="https://cdn.jsdelivr.net/npm/vgrid@1/dist/vgrid.min.js"></script>
```

Bundler users can also reach the `dist/` files directly, for example `import 'vgrid/dist/vgrid.min.css'`. Both `vgrid/dist/vgrid.css` and `vgrid/dist/vgrid.min.css` include declaration mappings for TypeScript side-effect import checks.

## Browser entry with a bundler

The `vgrid/browser` module exports `vGrid` and also registers it as `globalThis.vGrid`. Its initialization is preserved when bundlers remove unused code:

```js
import 'vgrid/browser';
import 'vgrid/browser/style.css';

const grid = globalThis.vGrid({ el: '#people-grid', columns: [], data: [] });
```

It also supports `import { vGrid } from 'vgrid/browser'`. Use the main `vgrid` entry when you only need module imports.

## CommonJS

`require()` resolves to CommonJS builds of the core and the adapters through the `require` export condition:

```js
const { vGrid } = require('vgrid');
const { VGRID } = require('vgrid/react');
const { vGrid: vGridVue } = require('vgrid/vue');
require('vgrid/browser');
```

Jest in its default CommonJS mode and other `require`-based tooling pick up these builds without transforming `node_modules`. Type declarations are provided for both module formats.

## Remote data

When `dataSource` is set, your server pages, sorts and filters, and vGrid shows one page at a time:

```js
vGrid({
    el: '#orders',
    dataSource: '/api/orders',
    rowsPerPage: 25,
    columns: [
        { name: 'number', label: 'Order' },
        { name: 'status', label: 'Status' },
        { name: 'total', label: 'Total' },
    ],
});
```

```text
GET /api/orders?page=2&limit=25&sort=total&dir=desc&status=paid&lang=en
```

```json
{ "data": [{ "number": "A-1026", "status": "paid", "total": 120 }], "total": 1834 }
```

- `page` is always sent, `limit` when `rowsPerPage` is set, `sort` and `dir` when a column is sorted (comma-separated for several), and each filled filter under its column name.
- `lang` is always sent: the grid's `locale` option, else the nearest `lang` attribute on the page, else the browser's language; it is empty when none is found. Subgrid panels and nested grids send the same value.
- `method: 'POST'` sends the same parameters as a JSON body.
- If the page contains `<meta name="csrf-token" content="...">` and the request stays on the same origin, vGrid adds an `X-CSRF-TOKEN` header unless `headers` already provides one. This matches the Laravel convention and has no effect on pages without that meta tag.

The full request and response contract is in the [web documentation](https://grid.virgils.org/documentation#remote-data).

## Browser compatibility

This applies to the files in `dist/` and to the same code loaded through the npm entries. vGrid targets evergreen browsers and ships without polyfills or transpiled fallbacks. The minimum versions are set by the native Popover API (`popover`, `popovertarget`, `showPopover()`, `hidePopover()`, `:popover-open`, and the `toggle` event), which the settings panel, filter-mode menu, and subgrid menus require.

| Browser | Minimum version | Released |
|---|---|---|
| Chrome (desktop and Android) | 114 | May 2023 |
| Edge | 114 | June 2023 |
| Firefox (desktop and Android) | 125 | April 2024 |
| Safari (macOS) | 17.0 | September 2023 |
| Safari on iOS and iPadOS | 17.0 | September 2023 |
| Opera | 100 | June 2023 |
| Samsung Internet | 23 | 2023 |
| Other Chromium browsers (Brave, Vivaldi, Arc, ...) | Chromium 114 engine | 2023 |

On iOS and iPadOS every browser uses WebKit, so Chrome, Firefox, and Edge there follow the Safari row: iOS 17 or later.

Internet Explorer, legacy Edge (EdgeHTML), and Opera Mini are not supported. In browsers older than the versions above, vGrid's panels and menus do not open and some interactions throw errors. DOM test environments such as jsdom do not implement the Popover API either, so component tests that open these panels need a popover polyfill.

All other features vGrid relies on are older than the Popover API and need nothing extra in the listed versions. These include ES2020 syntax (`?.`, `??`), `fetch` with `AbortController`, `ResizeObserver`, Pointer Events with pointer capture, `replaceChildren()`, flexbox `gap`, `contain: inline-size`, and `Blob` downloads for export.

Some styling is progressive enhancement. When a browser lacks the feature, vGrid still works and only the visual detail differs:

| Feature | Used for | When unsupported |
|---|---|---|
| `@starting-style`, `transition-behavior: allow-discrete`, `overlay` | Fade and slide when panels and menus open and close | Panels appear and disappear without animation. This affects Firefox before 129 and Safari before 17.5; `overlay` is Chromium-only. |
| `AccentColor` system color | Focus outline color | The browser's default focus ring is shown instead. |
| `scrollbar-width`, `scrollbar-color` | Thin subgrid scrollbar | `::-webkit-scrollbar` rules style it instead in Safari and older Chromium. |
| `prefers-reduced-motion` | Shortens transitions | Transitions run at normal speed. |

## Framework compatibility

| Framework | Supported versions | How to use | Notes |
|---|---|---|---|
| Plain JavaScript / HTML | Any | `vgrid`, `vgrid/browser`, or `dist/vgrid.min.js` | No dependencies. |
| React | 18.x, 19.x | `vgrid/react` (`VGRID`) | Peer dependency `react@^18 \|\| ^19`. TypeScript needs `@types/react` 18 or 19. |
| Next.js | 13.4+ (App Router and Pages Router) | `vgrid/react` | The adapter is marked `'use client'`. The grid renders on the client. |
| Vue | 3.x | `vgrid/vue` (`vGrid`) | Peer dependency `vue@^3.0.0`. Vue 2 (including 2.7) is not supported. |
| Nuxt | 3.x, 4.x | `vgrid/vue` | The grid renders on the client after mount. |
| Angular | Any version that runs in the browser | Core `vGrid` | Create in `ngAfterViewInit`, call `destroy()` in `ngOnDestroy`. |
| Svelte / SvelteKit | 3.x, 4.x, 5.x | Core `vGrid` | Create in `onMount`, call `destroy()` from its cleanup. |
| Solid / SolidStart | 1.x | Core `vGrid` | Create in `onMount`, call `destroy()` in `onCleanup`. |
| Alpine, Lit, jQuery, Laravel Blade, and others | Any | Core `vGrid` or a `<script>` tag | Pass a host element or selector. |

| Tooling | Supported |
|---|---|
| Module formats | ES modules (`import`) and CommonJS (`require`) |
| Bundlers | Vite, webpack 5, Rollup, esbuild, Parcel 2, and other bundlers that read the `exports` field |
| TypeScript | 4.7+ with `moduleResolution` `node16` or `nodenext`; 5.0+ with `bundler` |
| Node.js (SSR imports, tests) | 18+ |
| Browsers | Chrome 114+, Safari 17+, Firefox 125+ (see [Browser compatibility](#browser-compatibility)) |

## Other frameworks and server rendering

Angular, Svelte, Solid, and other frameworks can use the core `vGrid` export. Create the grid after its host element mounts in the browser, and call `destroy()` when that host is removed. Load the shared stylesheet globally so it applies to the grid's generated elements.

Importing the core and the React/Vue adapters is safe during server rendering. Grid initialization needs the browser DOM; the adapters defer it until mounting. Server rendering produces the host element, and the grid appears after mounting on the client.

React and Vue are optional peer dependencies; install only the framework adapter your app uses.

## Package contents

`src/vgrid.js` is the ES module entry and `src/vgrid.css` the stylesheet it uses. `dist/vgrid.cjs` is the CommonJS build, `dist/vgrid.js` and `dist/vgrid.min.js` the browser builds, and `dist/vgrid.css` and `dist/vgrid.min.css` the matching stylesheets; the minified files come with source maps (`vgrid.min.js.map`, `vgrid.min.css.map`). `integrations/` holds the React, Vue, and browser adapters, and `types/` the TypeScript declarations for every entry point. Everything ships ready to use: the package has no build step and runs no scripts on install.

## License

[MIT](./LICENSE).
