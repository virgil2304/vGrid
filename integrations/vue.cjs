'use strict';

const { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } = require('vue');
const { vGrid: createGrid } = require('../dist/vgrid.cjs');

const vGrid = defineComponent({
    name: 'vGrid',
    inheritAttrs: false,
    props: {
        config: {
            type: Object,
            required: true,
        },
    },
    setup(props, { attrs }) {
        const host = ref(null);
        let instance = null;

        const mountGrid = () => {
            instance?.destroy();
            instance = createGrid({ ...props.config, el: host.value });
        };

        onMounted(mountGrid);
        watch(() => props.config, () => {
            if (host.value) mountGrid();
        });
        onBeforeUnmount(() => instance?.destroy());

        return () => h('div', { ...attrs, ref: host });
    },
});

module.exports = vGrid;
module.exports.vGrid = vGrid;
module.exports.default = vGrid;
