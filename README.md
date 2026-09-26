# vGrid package

This folder is the standalone distributable for vGrid. The core has no runtime framework dependencies. It can be installed from npm or GitHub, used directly from a browser script, or mounted through the included React and Vue adapters.

The npm package identifier is lowercase `vgrid`; the JavaScript API and framework integrations use the name `vGrid`.

## Install

After publishing the package to npm:

```sh
npm install vgrid
```

To install from this GitHub repository before or instead of an npm release:

```sh
npm install github:<owner>/<repository>#<tag>
```

Replace the placeholders with the GitHub repository and a release tag. GitHub installation needs the repository to be public or the installing user to have access.

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

## React

Install React in the consuming app, then import the adapter and the shared stylesheet:

```jsx
import { createElement, useMemo } from 'react';
import { vGrid } from 'vgrid/react';
import 'vgrid/style.css';

export function PeopleGrid({ people }) {
    const config = useMemo(() => ({
        columns: [
            { name: 'name', label: 'Name' },
            { name: 'email', label: 'Email' },
        ],
        data: people,
    }), [people]);

    return createElement(vGrid, { id: 'people-grid', config });
}
```

The adapter mounts vGrid after React creates its host element and destroys it when the component unmounts. Replacing `config` rebuilds the grid, so keep it stable with `useMemo` when appropriate. React owns the host `<div>`; vGrid owns the contents inside it.

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

The adapter mounts vGrid after Vue creates its host element and destroys it before unmount. Replacing the `config` object rebuilds the grid. Vue owns the host `<div>`; vGrid owns the contents inside it.

## Browser script tags

The `dist/` folder contains the classic browser build and minified files:

```html
<link rel="stylesheet" href="./vgrid.min.css">
<script src="./vgrid.min.js"></script>
<script>
  const grid = vGrid({ el: '#people-grid', columns: [], data: [] });
</script>
```

The npm package also exposes `vgrid/browser` and `vgrid/browser/style.css` for consumers who want those files through a bundler.

## Development

`public/vgrid.js` and `public/vgrid.css` in the Laravel project are the source files. Run `npm run minify` from the Laravel project root to update minified assets in both locations: it leaves the public sources unchanged, creates or overwrites `public/vgrid.min.js` and `public/vgrid.min.css`, and copies both source files, both minified files, and `vgrid.min.js.map` / `vgrid.min.css.map` into `_github/dist/`. It also refreshes `_github/src/` for npm imports. `npm run minify:package` refreshes only the package from the public sources; `npm run minify:js` and `npm run minify:css` update one asset type at a time in both locations. Nothing runs these commands automatically.

Running `npm run build` from this folder rebuilds only the classic browser files in `dist/` from the package sources. Framework adapters live in `integrations/` and are shipped as package subpaths. React and Vue are optional peer dependencies; install only the framework adapter your app uses.
