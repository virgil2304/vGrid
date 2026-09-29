import type { vGridConfig, vGridInstance } from './index.js';

export type {
    vGridTarget,
    vGridTargets,
    vGridSortOrder,
    vGridBorders,
    vGridSize,
    vGridDownloadMode,
    vGridActionName,
    vGridActionPosition,
    vGridColumn,
    vGridAction,
    vGridActionValue,
    vGridActions,
    vGridRequestOptions,
    vGridPanel,
    vGridSubgrid,
    vGridSortEvent,
    vGridFilterEvent,
    vGridPageEvent,
    vGridReadyEvent,
    vGridOptions,
    vGridConfig,
    vGridInstance,
} from './index.js';

export declare function vGrid<Row extends object = object>(config: vGridConfig<Row>): vGridInstance<Row> | null;
