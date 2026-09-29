'use client';

import { createElement, useEffect, useRef } from 'react';
import { vGrid as createGrid } from '../src/vgrid.js';

export function VGRID({ config, ...hostAttributes }) {
    const host = useRef(null);

    useEffect(() => {
        const instance = createGrid({ ...config, el: host.current });
        return () => instance?.destroy();
    }, [config]);

    return createElement('div', { ...hostAttributes, ref: host });
}

export { VGRID as vGrid };
export default VGRID;
