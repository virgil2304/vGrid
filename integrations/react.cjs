'use client';
'use strict';

const { createElement, useEffect, useRef } = require('react');
const { vGrid: createGrid } = require('../dist/vgrid.cjs');

function VGRID({ config, ...hostAttributes }) {
    const host = useRef(null);

    useEffect(() => {
        const instance = createGrid({ ...config, el: host.current });
        return () => instance?.destroy();
    }, [config]);

    return createElement('div', { ...hostAttributes, ref: host });
}

module.exports = VGRID;
module.exports.VGRID = VGRID;
module.exports.vGrid = VGRID;
module.exports.default = VGRID;
