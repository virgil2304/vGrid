export type vGridTarget = string | Element;
export type vGridTargets = vGridTarget | vGridTarget[];
export type vGridSortOrder = 'asc' | 'desc';
export type vGridBorders = 'all' | 'horizontal' | 'rows' | 'inner' | 'none';
export type vGridSize = 'smallest' | 'small' | 'medium' | 'large' | 'larger' | 'largest';
export type vGridDownloadMode = 'server' | 'view';
export type vGridActionName = 'clear' | 'download' | 'print' | 'refresh' | 'settings';
export type vGridActionPosition = 'caption' | 'bottom' | 'none' | 'external';

export interface vGridColumn {
    name: string;
    label?: string;
    width?: number | string;
    type?: 'text' | 'link' | 'html' | 'enum';
    options?: Record<string, string | number>;
    active?: boolean;
    sort?: boolean;
    filter?: boolean;
    filterType?: 'text' | 'select';
    filterOptions?: string;
    filterClear?: boolean;
    isRowKey?: boolean;
}

export interface vGridAction {
    active?: boolean;
    symbol?: string;
    html?: string | Element;
    title?: string;
    className?: string;
}

export type vGridActionValue = boolean | string | vGridAction;

export interface vGridActions {
    position?: vGridActionPosition;
    element?: vGridTarget;
    order?: vGridActionName[];
    clear?: vGridActionValue;
    download?: boolean | string | (vGridAction & { mode?: vGridDownloadMode });
    print?: vGridActionValue;
    refresh?: vGridActionValue;
    settings?: vGridActionValue;
}

export interface vGridRequestOptions {
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    externalFilters?: Record<string, vGridTarget>;
    rowsPerPage?: number;
}

export interface vGridPanel extends vGridRequestOptions {
    name: string;
    id: string;
    dataSource: string;
    label?: string;
    caption?: string | false;
    idInPath?: boolean;
    type?: 'grid' | 'html' | 'text';
    columns?: vGridColumn[];
    borders?: vGridBorders;
    size?: vGridSize;
    rowNumbers?: boolean;
    rowNumbersType?: string;
    easing?: number;
}

export interface vGridSubgrid extends vGridRequestOptions {
    panels: vGridPanel[];
    el?: string;
    position?: 'start' | 'end' | number;
    open?: boolean | string;
    single?: boolean;
}

export interface vGridSortEvent {
    column: string | undefined;
    order: vGridSortOrder;
}

export interface vGridFilterEvent {
    filters: { column: string | undefined; value: string }[];
}

export interface vGridPageEvent {
    page: number;
    rowsPerPage: number;
    total: number;
}

export type vGridReadyEvent =
    | { total: number; rows: number; error?: never }
    | { error: unknown; total?: never; rows?: never };

/** Options shared by the core and framework adapters. */
export interface vGridOptions<Row extends object = object> extends vGridRequestOptions {
    caption?: string | false;
    columns?: vGridColumn[];
    data?: Row[];
    dataSource?: string;
    rowNumbers?: boolean;
    /** 'sequential' (default), or the name of a row property. */
    rowNumbersType?: string;
    filterRow?: boolean;
    filterClear?: boolean;
    sortBy?: { column: string; order?: vGridSortOrder };
    rowsPerPageOptions?: number[];
    showPaginationControls?: boolean;
    showPagination?: boolean;
    showRowsPerPage?: boolean;
    externalRowsPerPage?: vGridTargets;
    externalPagination?: vGridTargets;
    externalSort?: { column?: vGridTarget; direction?: vGridTarget };
    externalSummary?: Record<string, vGridTarget>;
    settings?: boolean;
    externalSettings?: vGridTarget;
    subgrid?: vGridSubgrid | vGridSubgrid[];
    borders?: vGridBorders;
    size?: vGridSize;
    actions?: boolean | vGridActionPosition | vGridActions;
    easing?: number;
    download?: boolean | vGridDownloadMode;
    print?: boolean;
    namespace?: string;
    onSort?: (event: vGridSortEvent) => void;
    onFilter?: (event: vGridFilterEvent) => void;
    onPage?: (event: vGridPageEvent) => void;
    /** Called when a remote request succeeds or fails. */
    onReady?: (event: vGridReadyEvent) => void;
}

export interface vGridConfig<Row extends object = object> extends vGridOptions<Row> {
    el: vGridTarget | null;
}

export interface vGridInstance<Row extends object = object> {
    element: HTMLTableElement;
    config: vGridConfig<Row>;
    reload(newData?: Row[]): vGridInstance<Row>;
    setPage(page: number): vGridInstance<Row>;
    sort(column: string, order?: vGridSortOrder): vGridInstance<Row>;
    destroy(): void;
}

/** Mount after the host exists in the browser. Returns null for invalid configuration. */
export declare function vGrid<Row extends object = object>(config: vGridConfig<Row>): vGridInstance<Row> | null;
