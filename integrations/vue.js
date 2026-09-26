import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { vGrid as createGrid } from '../src/vgrid.js';

export const vGrid = defineComponent({
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

export default vGrid;
