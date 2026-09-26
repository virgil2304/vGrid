import { createElement, useEffect, useRef } from 'react';
import { vGrid as createGrid } from '../src/vgrid.js';

/**
 * Mount vGrid inside a React-owned host element.
 * Pass a stable config object; replacing it rebuilds the grid.
 */
export function vGrid({ config, ...hostAttributes }) {
    const host = useRef(null);

    useEffect(() => {
        const instance = createGrid({ ...config, el: host.current });
        return () => instance?.destroy();
    }, [config]);

    return createElement('div', { ...hostAttributes, ref: host });
}

export default vGrid;
