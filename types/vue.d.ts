import type { DefineComponent, PropType } from 'vue';
import type { vGridOptions } from './index.js';

export interface vGridProps<Row extends object = object> {
    config: vGridOptions<Row>;
}

/** Vue component. Render with <component :is="vGrid" :config="config" />. */
export declare const vGrid: DefineComponent<{
    config: { type: PropType<vGridOptions>; required: true };
}>;
export default vGrid;
