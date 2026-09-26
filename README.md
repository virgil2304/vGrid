# Virgil's Grid (vGrid)

**vGrid**, is a standalone JavaScript grid library. The core has no runtime framework dependencies. It can be installed from npm or GitHub, used directly from a browser script, or mounted through the included React and Vue adapters.

The npm package identifier is `vgrid`. The JavaScript API is `vGrid(config)`; the React and Vue components use `vGrid` as both their named and default export.

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

Install React in the consuming app, then use a namespace import to render `<grids.vGrid />` in JSX:

```jsx
'use client';

import { useMemo } from 'react';
import * as grids from 'vgrid/react';
import 'vgrid/style.css';

export function PeopleGrid({ people }) {
    const config = useMemo(() => ({
        columns: [
            { name: 'name', label: 'Name' },
            { name: 'email', label: 'Email' },
        ],
        data: people,
    }), [people]);

    return <grids.vGrid id="people-grid" config={config} />;
}
```

JSX dot notation resolves `grids.vGrid` to the exported React component and preserves the `vGrid` name. A bare `<vGrid>` tag is treated as a native HTML element. Named and default imports remain available for `createElement(vGrid, props)` usage.

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

## Other frameworks and server rendering

Angular, Svelte, Solid, and other frameworks can use the core `vGrid` export. Create the grid after its host element mounts in the browser, and call `destroy()` when that host is removed. Load the shared stylesheet globally so it applies to the grid's generated elements.

Importing the core and the React/Vue adapters is safe during server rendering. Grid initialization needs the browser DOM; the adapters defer it until mounting. Server rendering produces the host element, and the grid appears after mounting on the client.

React and Vue are optional peer dependencies; install only the framework adapter your app uses.

## License

[MIT](./LICENSE).
