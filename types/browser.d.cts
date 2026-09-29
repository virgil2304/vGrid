import type { vGridConfig, vGridInstance } from './index.js';

export declare function vGrid<Row extends object = object>(config: vGridConfig<Row>): vGridInstance<Row> | null;

declare global {
    var vGrid: typeof import('./index.js').vGrid;
}
