export type vGridTarget = string | Element;
export type vGridTargets = vGridTarget | vGridTarget[];
export type vGridSortOrder = 'asc' | 'desc';
export type vGridBorders = 'all' | 'horizontal' | 'rows' | 'inner' | 'none';
export type vGridSize = 'smallest' | 'small' | 'medium' | 'large' | 'larger' | 'largest';
export type vGridDownloadMode = 'server' | 'view';
export type vGridActionName = 'clear' | 'download' | 'print' | 'refresh' | 'settings' | 'textSize';
export type vGridActionPosition = 'caption' | 'bottom' | 'none' | 'external';

export interface vGridFilterMode {
    label?: string | Element;
    symbol?: string;
}

export interface vGridFilterRange extends vGridFilterMode {
    /** The two parameter names sent for the start and the end of the range. */
    keys: [string, string];
}

/** One entry per parameter name: its label, or an object with label and symbol; `range` sends two parameters. */
export type vGridFilterModes = { range?: vGridFilterRange } & Record<string, string | Element | vGridFilterMode | vGridFilterRange>;

export interface vGridColumn<Row extends object = object> {
    name: string;
    label?: string;
    width?: number | string;
    type?: 'text' | 'link' | 'html' | 'enum';
    options?: Record<string, string | number>;
    /** Row field holding the address of a `type: 'link'` column. Default: 'link'. */
    href?: string;
    /** Text is inserted as text, a Node is inserted as is, undefined keeps the normal display. */
    render?(value: unknown, row: Row): string | number | Node | null | undefined;
    active?: boolean;
    sort?: boolean;
    filter?: boolean;
    filterType?: 'text' | 'select';
    filterOptions?: string;
    filterClear?: boolean;
    filterModes?: vGridFilterModes;
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

export interface vGridTextSizeAction {
    active?: boolean;
    className?: string;
    decrease?: string;
    increase?: string;
    decreaseTitle?: string;
    increaseTitle?: string;
}

export interface vGridActions {
    position?: vGridActionPosition;
    element?: vGridTarget;
    order?: vGridActionName[];
    clear?: vGridActionValue;
    download?: boolean | string | (vGridAction & { mode?: vGridDownloadMode });
    print?: vGridActionValue;
    refresh?: vGridActionValue;
    settings?: vGridActionValue;
    textSize?: boolean | vGridTextSizeAction;
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
    striped?: boolean;
    hover?: boolean;
    easing?: number;
    reorderColumns?: boolean;
    reorderDelay?: number;
}

export interface vGridSubgrid extends vGridRequestOptions {
    panels: vGridPanel[];
    el?: string;
    position?: 'start' | 'end' | number;
    open?: boolean | string;
    single?: boolean;
}

export interface vGridSortBy {
    column: string;
    order?: vGridSortOrder;
}

export interface vGridSortEvent {
    column: string | undefined;
    order: vGridSortOrder;
    /** Present when more than one column is sorted, in priority order. */
    sorts?: { column: string; order: vGridSortOrder }[];
}

export interface vGridFilterEvent {
    filters: { column: string | undefined; value: string }[];
}

export interface vGridPageEvent {
    page: number;
    rowsPerPage: number;
    total: number;
}

export interface vGridRowEvent<Row extends object = object> {
    row: Row;
    event: Event;
}

export interface vGridRowReorderEvent<Row extends object = object> {
    row: Row;
    from: number;
    to: number;
    rows: Row[];
}

export interface vGridRowAction<Row extends object = object> {
    label?: string;
    /** Set as data-vgrid-row-action on the button and passed to onClick. Default: the label. */
    name?: string;
    ariaLabel?: string;
    disabled?: boolean;
    onClick(event: { row: Row; event: MouseEvent; grid: vGridInstance<Row>; name: string }): void;
}

/** Returns the row's actions; an empty array shows none. */
export type vGridRowActionsOf<Row extends object = object> = { bivariance(row: Row): vGridRowAction<Row>[] }['bivariance'];

export type vGridReadyEvent =
    | { total: number; rows: number; error?: never }
    | { error: unknown; total?: never; rows?: never };

/** Options shared by the core and framework adapters. */
export interface vGridOptions<Row extends object = object> extends vGridRequestOptions {
    caption?: string | false;
    columns?: vGridColumn<Row>[];
    data?: Row[];
    dataSource?: string;
    rowNumbers?: boolean;
    /** 'sequential' (default), or the name of a row property. */
    rowNumbersType?: string;
    filterRow?: boolean;
    filterClear?: boolean;
    /** An array adds tie-breakers in order. */
    sortBy?: vGridSortBy | vGridSortBy[];
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
    /** Adds the page's query string to every subgrid panel request. */
    inheritQueryString?: boolean;
    borders?: vGridBorders;
    size?: vGridSize;
    striped?: boolean;
    hover?: boolean;
    actions?: boolean | vGridActionPosition | vGridActions;
    easing?: number;
    download?: boolean | vGridDownloadMode;
    print?: boolean;
    /** Destroys the grid once its container has left the page. */
    autoDestroy?: boolean;
    reorderColumns?: boolean;
    /** Milliseconds a heading is held before it moves. */
    reorderDelay?: number;
    /** Buttons at the end of every row, or a function of the row returning them. */
    rowActions?: false | vGridRowAction<Row>[] | vGridRowActionsOf<Row>;
    /** Adds ↑ and ↓ buttons that move a row one place; a remote grid needs onRowReorder. */
    rowReorder?: boolean;
    /** Arrow-key cell movement, Shift ranges and copy as tab-separated text. */
    cellSelection?: boolean;
    rowClass?(row: Row): string;
    namespace?: string;
    /** Language tag sent to the server as `lang`. Default: the nearest `lang` on the page, then the browser's language. */
    locale?: string;
    onSort?: (event: vGridSortEvent) => void;
    onFilter?: (event: vGridFilterEvent) => void;
    onPage?: (event: vGridPageEvent) => void;
    /** Called when a remote request succeeds or fails. */
    onReady?: (event: vGridReadyEvent) => void;
    onRowClick?(event: vGridRowEvent<Row>): void;
    onRowDblClick?(event: vGridRowEvent<Row>): void;
    onRowReorder?(event: vGridRowReorderEvent<Row>): void;
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

/** Mount after the host exists in the browser. Returns null when the grid cannot start (no element, or a reserved column name); other invalid values log an error and use the default. */
export declare function vGrid<Row extends object = object>(config: vGridConfig<Row>): vGridInstance<Row> | null;
