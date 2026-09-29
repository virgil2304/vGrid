# vGrid

**vGrid**, is a standalone JavaScript grid library. The core has no runtime framework dependencies. It can be installed from npm or GitHub, used directly from a browser script, or mounted through the included React and Vue adapters.

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

`vGridOptions` describes the `config` passed to a framework adapter, which supplies its own host element. Invalid grid configuration returns `null`. TypeScript React apps also need `@types/react` matching their React version.

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

When `dataSource` is set, vGrid requests rows with `fetch` using the configured `method` and `headers`. If the page contains `<meta name="csrf-token" content="...">` and the request stays on the same origin, vGrid adds an `X-CSRF-TOKEN` header automatically unless `headers` already provides one. This matches the Laravel convention and has no effect on pages without that meta tag.

## Browser support

The core targets evergreen browsers. The settings panel and subgrid menus use the native Popover API, available in Chrome 114, Safari 17, Firefox 125 and later. DOM test environments such as jsdom do not implement it, so component tests that open these panels need a popover polyfill.

## Other frameworks and server rendering

Angular, Svelte, Solid, and other frameworks can use the core `vGrid` export. Create the grid after its host element mounts in the browser, and call `destroy()` when that host is removed. Load the shared stylesheet globally so it applies to the grid's generated elements.

Importing the core and the React/Vue adapters is safe during server rendering. Grid initialization needs the browser DOM; the adapters defer it until mounting. Server rendering produces the host element, and the grid appears after mounting on the client.

React and Vue are optional peer dependencies; install only the framework adapter your app uses.

## Package contents

`src/vgrid.js` is the ES module entry and `src/vgrid.css` the stylesheet it uses. `dist/vgrid.cjs` is the CommonJS build, `dist/vgrid.js` and `dist/vgrid.min.js` the browser builds with their source maps, and `dist/vgrid.css` and `dist/vgrid.min.css` the matching stylesheets. `integrations/` holds the React, Vue, and browser adapters, and `types/` the TypeScript declarations for every entry point. Everything ships ready to use: the package has no build step and runs no scripts on install.

## License

[MIT](./LICENSE).
