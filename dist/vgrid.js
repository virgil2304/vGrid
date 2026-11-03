/* vGrid v1.0.0.5.67 | Last updated: 2026-10-25 */
function vGrid(config) {

    const { el, caption, columns: columnsConfig = [], data = [], dataSource, method = 'GET', headers = {},
        rowNumbers = true, rowNumbersType = 'sequential',
        filterRow = true, filterClear = true, sortBy, rowsPerPage: rowsPerPageConfig, rowsPerPageOptions: rowsPerPageOptionsConfig, showPaginationControls = true,
        showPagination = showPaginationControls, showRowsPerPage = showPaginationControls,
        externalFilters = {}, externalRowsPerPage, externalPagination, externalSort = {}, externalSummary = {},
        settings = true, externalSettings, subgrid, inheritQueryString = false, borders = 'horizontal', size = 'medium', striped = true, hover = true, actions = 'caption', easing = 160,
        download = false, print = true, autoDestroy = false, reorderColumns = true, reorderDelay = 350,
        rowActions = false, rowReorder = false, cellSelection = false, rowSelection = false, rowClass,
        onSort, onFilter, onPage, onReady, onRowClick, onRowDblClick, onRowReorder, onRowSelect, namespace, locale } = config;
    const columns = Array.isArray(columnsConfig) ? [...columnsConfig] : [];
    const sortByPrimary = Array.isArray(sortBy) ? sortBy[0] : sortBy;
    const hasRowActions = Array.isArray(rowActions) || typeof rowActions === 'function';
    const rowReorderActive = rowReorder === true;
    const rowSelectionConfig = rowSelection === true ? {} : rowSelection && typeof rowSelection === 'object' && !Array.isArray(rowSelection) ? rowSelection : null;
    if (rowSelection !== false && rowSelection !== undefined && !rowSelectionConfig) console.error('vGrid: rowSelection must be true, false, or an object { mode, key }.');
    const selectionModes = ['multi', 'single'];
    if (rowSelectionConfig?.mode !== undefined && !selectionModes.includes(rowSelectionConfig.mode)) console.error(`vGrid: rowSelection.mode must be one of ${selectionModes.join(', ')}. Falling back to multi.`);
    const selectionKeyConfig = rowSelectionConfig?.key;
    const selectionKeyValid = typeof selectionKeyConfig === 'string' && !!selectionKeyConfig.trim();
    if (selectionKeyConfig !== undefined && !selectionKeyValid) console.error('vGrid: rowSelection.key must be a row field name.');
    const selectionKey = rowSelectionConfig
        ? (selectionKeyValid ? selectionKeyConfig.trim() : columns.find(entry => entry && entry.isRowKey === true)?.name)
        : undefined;
    if (rowSelectionConfig && !selectionKey) console.error('vGrid: rowSelection needs a key: set rowSelection.key or mark a column with isRowKey: true. Row selection is off.');
    const rowSelectionActive = !!(rowSelectionConfig && selectionKey);
    const singleSelection = rowSelectionActive && rowSelectionConfig.mode === 'single';
    if (onRowSelect !== undefined && typeof onRowSelect !== 'function') console.error('vGrid: onRowSelect must be a function.');
    if (cellSelection === true && rowSelectionActive) console.error('vGrid: cellSelection and rowSelection cannot be used together. Cell selection is off.');
    const cellSelectionActive = cellSelection === true && !rowSelectionActive;
    if (rowActions && !hasRowActions) console.error('vGrid: rowActions must be an array, a function, or false.');
    if (rowReorder !== true && rowReorder !== false) console.error('vGrid: rowReorder must be true or false.');
    if (cellSelection !== true && cellSelection !== false) console.error('vGrid: cellSelection must be true or false.');
    if (rowClass !== undefined && typeof rowClass !== 'function') console.error('vGrid: rowClass must be a function.');
    const rowClassOf = typeof rowClass === 'function' ? rowClass : null;
    columns.forEach(col => {
        if (col.render !== undefined && typeof col.render !== 'function') console.error(`vGrid: render on column "${col.name}" must be a function.`);
        if (col.href !== undefined && (typeof col.href !== 'string' || !col.href.trim())) console.error(`vGrid: href on column "${col.name}" must be a row field name.`);
    });
    const renderOf = col => typeof col.render === 'function' ? col.render : null;
    const hrefFieldOf = col => typeof col.href === 'string' && col.href.trim() ? col.href.trim() : 'link';
    const renderFailures = new Set();
    const reportRender = (col, detail) => {
        if (renderFailures.has(col)) return;
        renderFailures.add(col);
        console.error(`vGrid: render on column "${col.name}" ${detail}`);
    };
    const renderResult = (row, col, value) => {
        const render = renderOf(col);
        if (!render) return undefined;
        let result;
        try { result = render(value, row); } catch (error) { reportRender(col, `failed: ${error?.message || error}`); return String(value); }
        if (result === undefined) return undefined;
        if (result === null) return '';
        if (typeof result === 'string' || typeof result === 'number') return String(result);
        if (typeof Node !== 'undefined' && result instanceof Node) return result;
        reportRender(col, 'must return text or a DOM node.');
        return String(value);
    };

    const toPageSize = value => {
        const size = parseInt(value);
        return Number.isFinite(size) && size > 0 ? size : null;
    };
    const toCount = value => {
        const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
        return typeof number === 'number' && Number.isFinite(number) ? number : null;
    };
    const rowsPerPageDefault = externalPagination || externalRowsPerPage ? 10 : 0;
    const rowsPerPage = toPageSize(rowsPerPageConfig === undefined ? rowsPerPageDefault : rowsPerPageConfig) ?? undefined;
    const normalisedPageSizes = Array.isArray(rowsPerPageOptionsConfig)
        ? [...new Set(rowsPerPageOptionsConfig.map(toPageSize).filter(size => size !== null))]
        : null;
    const rowsPerPageOptions = normalisedPageSizes && normalisedPageSizes.length ? normalisedPageSizes : undefined;
    if (rowsPerPageOptionsConfig && !rowsPerPageOptions) {
        console.error('vGrid: rowsPerPageOptions must be a non-empty array of positive numbers.');
    }
    if (rowsPerPageOptions && !rowsPerPage) {
        console.error('vGrid: rowsPerPageOptions has no effect without a positive rowsPerPage.');
    }

    const borderPresets = ['all', 'horizontal', 'rows', 'inner', 'none'];
    if (!borderPresets.includes(borders)) {
        console.error(`vGrid: borders must be one of ${borderPresets.join(', ')}.`);
    }
    const borderPreset = borderPresets.includes(borders) ? borders : 'horizontal';

    const sizePresets = ['smallest', 'small', 'medium', 'large', 'larger', 'largest'];
    if (!sizePresets.includes(size)) {
        console.error(`vGrid: size must be one of ${sizePresets.join(', ')}.`);
    }
    const sizePreset = sizePresets.includes(size) ? size : 'medium';

    if (typeof striped !== 'boolean') console.error('vGrid: striped must be true or false.');
    if (typeof hover !== 'boolean') console.error('vGrid: hover must be true or false.');

    const actionNames = ['clear', 'download', 'print', 'refresh', 'settings', 'textSize'];
    const actionDefaults = {
        clear: { symbol: '\u2715', title: 'Clear filters' },
        download: { symbol: '\u2913', title: 'Download' },
        print: { symbol: '\u2912', title: 'Print' },
        refresh: { symbol: '\u21BB', title: 'Refresh' },
        settings: { symbol: '\u2699\uFE0E', title: 'Settings' },
        textSize: { decrease: 'A\u2212', increase: 'A+', decreaseTitle: 'Smaller text', increaseTitle: 'Larger text' }
    };
    const actionsPositions = ['caption', 'bottom', 'none', 'external'];
    const actionsIsObject = actions !== null && typeof actions === 'object' && !Array.isArray(actions);
    if (!actionsIsObject && typeof actions !== 'string' && actions !== true && actions !== false) {
        console.error('vGrid: actions must be true, false, a position name, or an object.');
    }
    const actionsConfig = actionsIsObject ? actions
        : typeof actions === 'string' ? { position: actions }
        : actions === false ? { position: 'none' }
        : {};
    Object.keys(actionsConfig)
        .filter(key => !['position', 'element', 'order'].includes(key) && !actionNames.includes(key))
        .forEach(key => console.error(`vGrid: actions.${key} is not a known action.`));

    const actionsPositionValue = actionsConfig.position ?? 'caption';
    if (!actionsPositions.includes(actionsPositionValue)) {
        console.error(`vGrid: actions.position must be one of ${actionsPositions.join(', ')}.`);
    }
    const actionsPosition = actionsPositions.includes(actionsPositionValue) ? actionsPositionValue : 'caption';

    const requestedActionOrder = Array.isArray(actionsConfig.order) ? actionsConfig.order : [];
    requestedActionOrder
        .filter(name => !actionNames.includes(name))
        .forEach(name => console.error(`vGrid: actions.order has no action named ${name}.`));
    const orderedActionNames = [...new Set(requestedActionOrder.filter(name => actionNames.includes(name)))];
    const actionsSequence = [...orderedActionNames, ...actionNames.filter(name => !orderedActionNames.includes(name))];

    const downloadModes = ['server', 'view'];
    const downloadRequest = (() => {
        const value = actionsConfig.download;
        if (value === undefined) return download;
        if (value === true || value === false) return value;
        if (typeof value === 'string') return downloadModes.includes(value) ? value : true;
        if (value && typeof value === 'object') return value.active === false ? false : (value.mode ?? true);
        return download;
    })();
    let downloadMode = null;
    if (downloadRequest) {
        if (downloadRequest === true) downloadMode = dataSource ? 'server' : 'view';
        else if (downloadModes.includes(downloadRequest)) downloadMode = downloadRequest;
        else console.error(`vGrid: download must be true, false, or one of ${downloadModes.join(', ')}.`);
        if (downloadMode === 'server' && !dataSource) {
            console.error("vGrid: download: 'server' needs a dataSource. Falling back to the rows in the grid.");
            downloadMode = 'view';
        }
    }

    if (print !== true && print !== false) {
        console.error('vGrid: print must be true or false.');
    }

    if (autoDestroy !== true && autoDestroy !== false) {
        console.error('vGrid: autoDestroy must be true or false.');
    }

    const resolveAction = (name, fallbackActive) => {
        const value = actionsConfig[name];
        const base = { ...actionDefaults[name], active: fallbackActive };
        if (value === undefined) return base;
        if (value === true) return { ...base, active: true };
        if (value === false) return { ...base, active: false };
        if (typeof value === 'string') {
            return name === 'download' && downloadModes.includes(value)
                ? { ...base, active: true }
                : { ...base, active: true, symbol: value };
        }
        if (value && typeof value === 'object') return { ...base, ...value, active: value.active !== false };
        console.error(`vGrid: actions.${name} must be true, false, a symbol, or an object.`);
        return base;
    };

    const settingsActive = settings !== false && columns.length > 0;
    const resolvedActions = {
        clear: resolveAction('clear', settingsActive),
        download: resolveAction('download', downloadMode !== null),
        print: resolveAction('print', print !== false && columns.length > 0),
        refresh: resolveAction('refresh', settingsActive),
        settings: resolveAction('settings', settingsActive),
        textSize: resolveAction('textSize', true)
    };
    if (!columns.length) {
        resolvedActions.clear.active = false;
        resolvedActions.print.active = false;
        resolvedActions.settings.active = false;
        resolvedActions.textSize.active = false;
    }
    if (!resolvedActions.download.active) downloadMode = null;

    const easingValue = Number(easing);
    if (!Number.isFinite(easingValue) || easingValue < 0) {
        console.error('vGrid: easing must be a duration in milliseconds, 0 for none.');
    }
    const easingMs = Number.isFinite(easingValue) && easingValue >= 0 ? easingValue : 160;
    const reorderDelayValue = Number(reorderDelay);
    if (!Number.isFinite(reorderDelayValue) || reorderDelayValue < 0) {
        console.error('vGrid: reorderDelay must be a number of milliseconds, 0 or more.');
    }
    const reorderDelayMs = Number.isFinite(reorderDelayValue) && reorderDelayValue >= 0 ? reorderDelayValue : 350;

    const reservedColumnNames = new Set([
        'page', 'limit', 'sort', 'dir', 'offset', 'cursor',
        'perpage', 'pagesize', 'sortby', 'sortorder', 'columns',
        'selected', 'excluded',
    ]);
    const selectionParamNames = new Set(['selected', 'excluded']);
    const invalidColumns = [...new Set([...columns.map(column => String(column.name || '')), ...Object.keys(externalFilters)]
        .map(name => name.toLowerCase())
        .filter(name => reservedColumnNames.has(name)))];
    const controlClashes = invalidColumns.filter(name => !selectionParamNames.has(name));
    const selectionClashes = invalidColumns.filter(name => selectionParamNames.has(name));
    if (controlClashes.length) {
        console.error(`vGrid: column name(s) ${controlClashes.join(', ')} are reserved for remote API controls. Rename the column(s) and update the data source.`);
    }
    if (selectionClashes.length) {
        console.error(`vGrid: column or filter name(s) ${selectionClashes.join(', ')} are reserved for row selection (selected=, excluded=). Rename the column(s) or filter(s) and update the data source.`);
    }
    if (invalidColumns.length) return null;
    const inheritedSelectionParams = () => inheritQueryString === true
        ? [...new Set([...new URLSearchParams(window.location.search).keys()].filter(key => selectionParamNames.has(key.toLowerCase())))]
        : [];
    if (inheritedSelectionParams().length) {
        console.error(`vGrid: the page query string carries ${inheritedSelectionParams().join(', ')}, reserved for row selection (selected=, excluded=). inheritQueryString leaves them out of panel requests.`);
    }

    const rowKeyColumns = columns.filter(column => column.isRowKey === true);
    if (rowKeyColumns.length > 1) {
        console.error('vGrid: only one column can use isRowKey: true.');
        return null;
    }
    const rowKeyColumn = rowKeyColumns[0];

    const subgridSources = (Array.isArray(subgrid) ? subgrid : subgrid ? [subgrid] : [])
        .filter(source => source && typeof source === 'object');
    const subgrids = subgridSources.map(source => {
        const panelDefaults = {
            method: source.method,
            headers: source.headers ?? headers,
            rowsPerPage: source.rowsPerPage,
            externalFilters: source.externalFilters,
        };
        const panels = (Array.isArray(source.panels) ? source.panels : [])
            .filter(panel => panel && typeof panel === 'object' && panel.name)
            .map(panel => ({ ...panelDefaults, ...panel }))
            .filter(panel => {
                if (!panel.id) {
                    console.error(`vGrid: subgrid panel "${panel.name}" needs an id naming the column its value comes from.`);
                    return false;
                }
                if (!panel.dataSource) {
                    console.error(`vGrid: subgrid panel "${panel.name}" needs a dataSource.`);
                    return false;
                }
                return true;
            });
        const positionConfig = source.position;
        const positionNumber = /^\d+$/.test(String(positionConfig ?? '').trim())
            ? parseInt(positionConfig)
            : null;
        const position = positionConfig === 'end'
            ? 'end'
            : positionNumber ? positionNumber : 'start';
        if (panels.length && positionConfig !== undefined && positionConfig !== null && positionConfig !== 'start' && position === 'start') {
            console.error('vGrid: subgrid position must be "start", "end", or the column number counted from the left.');
        }
        const open = source.open;
        if (panels.length && typeof open === 'string' && !panels.some(panel => panel.name === open)) {
            console.error(`vGrid: subgrid open: "${open}" does not match any panel name.`);
        }
        return {
            panels,
            position,
            single: source.single === true,
            toggleMarkup: source.el,
            defaultPanel: open === true
                ? panels[0]
                : typeof open === 'string'
                ? panels.find(panel => panel.name === open)
                : null,
            entries: new Map(),
            menu: document.createElement('div'),
            menuOwner: null,
            menuRow: null,
            menuClosedAt: 0,
            order: 0,
        };
    }).filter(sub => sub.panels.length > 0);
    subgrids.forEach((sub, index) => { sub.order = index; });
    const hasPanels = subgrids.length > 0;

    const storageKeyBase = `vgrid:${typeof el === 'string' ? el : (el?.id || '')}:${dataSource || ''}`;
    const settingsStorageKey = `${storageKeyBase}:columns`;
    const textSizeStorageKey = `${storageKeyBase}:textSize`;
    if (resolvedActions.settings.active) {
        try {
            const saved = JSON.parse(localStorage.getItem(settingsStorageKey));
            if (saved && typeof saved === 'object') {
                columns.forEach(column => {
                    if (typeof saved[column.name] === 'boolean') column.active = saved[column.name];
                });
                const savedOrder = Object.keys(saved);
                const slots = columns.map((column, index) => savedOrder.includes(column.name) ? index : -1).filter(index => index !== -1);
                const ordered = slots.map(index => columns[index]).sort((a, b) => savedOrder.indexOf(a.name) - savedOrder.indexOf(b.name));
                slots.forEach((slot, index) => { columns[slot] = ordered[index]; });
                if (!columns.some(column => column.active !== false)) {
                    columns.forEach(column => { column.active = true; });
                }
            }
        } catch { }
    }

    let activeColumns = columns.filter(column => column.active !== false);
    if (columns.length && !activeColumns.length) {
        console.error('vGrid: at least one column must stay active.');
        return null;
    }
    let localData = data;
    let currentRows = [];
    let currentOffset = 0;
    let remoteTotal = null;
    const rowData = new WeakMap();
    const rowActionHandlers = new WeakMap();
    const panelOwners = new WeakMap();

    const isRemote = !!dataSource;

    const target = typeof el === 'string' ? document.querySelector(el) : el;

    if (!target) {
        console.error('vGrid: "el" must identify an element.');
        return null;
    }

    const namePrefix = typeof namespace === 'string' && namespace ? namespace : (target.id || '');
    const partClass = (part, ...extra) => ['vgrid-' + part, namePrefix ? `${namePrefix}-${part}` : '', ...extra].filter(Boolean).join(' ');
    const make = (tag, props = {}, ...children) => {
        const { attrs, data, ...rest } = props;
        const node = Object.assign(document.createElement(tag), rest);
        if (attrs) Object.entries(attrs).forEach(([name, value]) => node.setAttribute(name, value));
        if (data) Object.assign(node.dataset, data);
        node.append(...children);
        return node;
    };
    const makeButton = (props = {}, ...children) => make('button', { type: 'button', ...props }, ...children);

    const localeTag = value => {
        if (typeof value !== 'string' || !value.trim()) return '';
        try { return Intl.getCanonicalLocales(value.trim())[0] || ''; } catch { return ''; }
    };
    if (locale !== undefined && locale !== '' && !localeTag(locale)) console.error('vGrid: locale must be a language tag such as "en" or "de-AT".');
    const nearestLang = () => {
        for (let node = target; node; node = node.parentElement) {
            const tag = node.hasAttribute('lang') ? localeTag(node.getAttribute('lang')) : '';
            if (tag) return tag;
        }
        return '';
    };
    const browserLang = () => typeof navigator === 'undefined' ? '' : [...(navigator.languages || []), navigator.language].map(localeTag).find(Boolean) || '';
    const gridLocale = localeTag(locale) || nearestLang() || browserLang();

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
    const sameOriginUrl = url => {
        try { return new URL(url, location.href).origin === location.origin; }
        catch { return false; }
    };
    const requestHeaders = (url, extra = headers) => {
        const sent = { ...extra };
        if (csrfToken && sameOriginUrl(url) && !Object.keys(sent).some(name => name.toLowerCase() === 'x-csrf-token')) {
            sent['X-CSRF-TOKEN'] = csrfToken;
        }
        return sent;
    };

    const externalFilterInputs = Object.entries(externalFilters)
        .map(([column, selector]) => ({ column, element: typeof selector === 'string' ? document.querySelector(selector) : selector }))
        .filter(({ column, element }) => {
            if (element) return true;
            console.error(`vGrid: external filter for "${column}" was not found.`);
            return false;
        });
    const externalFilterDefaults = new Map(externalFilterInputs.map(({ element }) => [element, element.value]));
    let resettingFilters = false;

    const resolveExternalAll = selector => typeof selector === 'string'
        ? [...document.querySelectorAll(selector)]
        : selector == null ? []
        : Array.isArray(selector) || selector instanceof NodeList
            ? [...selector].flatMap(one => resolveExternalAll(one))
            : [selector];

    const externalRowsPerPageElements = resolveExternalAll(externalRowsPerPage);
    const externalRowsPerPageElement = externalRowsPerPageElements[0];

    if (externalRowsPerPage && !externalRowsPerPageElement) {
        console.error('vGrid: external rows-per-page control was not found.');
    }
    let pageSizeSource = externalRowsPerPageElement ? 'external' : 'grid';

    const resolveExternal = selector => typeof selector === 'string' ? document.querySelector(selector) : selector;
    const externalPaginationElements = resolveExternalAll(externalPagination);
    if (externalPagination && !externalPaginationElements.length) {
        console.error('vGrid: external pagination control was not found.');
    }
    const externalSettingsElement = resolveExternal(externalSettings);
    if (externalSettings && !externalSettingsElement) {
        console.error('vGrid: external settings control was not found.');
    }
    const actionsOwnElement = resolveExternal(actionsConfig.element);
    if (actionsConfig.element && !actionsOwnElement) {
        console.error('vGrid: actions.element was not found.');
    }
    const actionsElement = actionsOwnElement || externalSettingsElement;
    if (actionsPosition === 'external' && !actionsElement) {
        console.error("vGrid: actions.position 'external' needs actions.element. Falling back to the caption.");
    }
    const externalSortColumnElement = resolveExternal(externalSort.column);
    const externalSortDirectionElement = resolveExternal(externalSort.direction);
    if (externalSort.column && !externalSortColumnElement) {
        console.error('vGrid: external sort column control was not found.');
    }
    if (externalSort.direction && !externalSortDirectionElement) {
        console.error('vGrid: external sort direction control was not found.');
    }

    const externalSummaryTargets = Object.entries(externalSummary)
        .map(([key, selector]) => ({ key, element: resolveExternal(selector) }))
        .filter(({ key, element }) => {
            if (element) return true;
            console.error(`vGrid: external summary target for "${key}" was not found.`);
            return false;
        });

    const buildExternalSortOptions = () => {
        if (!externalSortColumnElement) return;
        const selected = externalSortColumnElement.value;
        externalSortColumnElement.replaceChildren(make('option', { value: '', textContent: 'Sort by…' }), ...activeColumns
            .filter(c => c.sort !== false)
            .map(c => make('option', { value: c.name, textContent: c.label || c.name })));
        externalSortColumnElement.value = selected || sortByPrimary?.column || '';
    };
    buildExternalSortOptions();
    if (externalSortDirectionElement?.tagName === 'SELECT' && !externalSortDirectionElement.options.length) {
        externalSortDirectionElement.replaceChildren(make('option', { value: 'asc', textContent: 'Ascending' }), make('option', { value: 'desc', textContent: 'Descending' }));
    }
    if (externalSortDirectionElement && sortByPrimary?.order) externalSortDirectionElement.value = sortByPrimary.order;

    const element = target.tagName === 'TABLE' ? target : document.createElement('table');
    const createdTable = element !== target;
    const originalAriaDescribedBy = element.getAttribute('aria-describedby');
    const originalAriaLabel = element.getAttribute('aria-label');
    const originalAriaLabelledBy = element.getAttribute('aria-labelledby');
    const originalAriaRowCount = element.getAttribute('aria-rowcount');
    const originalRole = element.getAttribute('role');
    const originalAriaMultiSelectable = element.getAttribute('aria-multiselectable');
    const originalCaptionText = element.caption?.textContent.replace(/\s+/g, ' ').trim() || '';
    let accessibleCaptionText = originalCaptionText;
    const hasSortableColumns = columns.some(column => column.sort !== false);
    let sortInstructions = null;
    if (hasSortableColumns || cellSelectionActive) {
        let id = 'vgrid-sort-instructions';
        for (let suffix = 1; document.getElementById(id); suffix++) id = `vgrid-sort-instructions-${suffix}`;
        sortInstructions = make('span', { id, className: 'vgrid-visually-hidden', textContent: [
            hasSortableColumns ? 'Sortable column headings are buttons. Activate a heading to sort; the current direction is announced with the heading. Hold Shift while activating another heading to add a secondary sort; priority and direction are announced with each sorted heading.' : '',
            cellSelectionActive ? 'Use arrow keys to move between cells, hold Shift with an arrow key to extend the selected range, and press Ctrl or Command+C to copy selected cells as tab-separated text. Pasting is not supported.' : '',
            onRowClick ? 'Rows with row-click callbacks can be activated with Enter or Space.' : '',
            onRowDblClick ? 'Shift+Enter runs the row double-click callback; row action buttons remain separate controls.' : '',
        ].filter(Boolean).join(' ') });
        const describedBy = new Set((originalAriaDescribedBy || '').split(/\s+/).filter(Boolean));
        describedBy.add(id);
        element.setAttribute('aria-describedby', [...describedBy].join(' '));
    }
    if (createdTable) target.replaceChildren(element);
    element.classList.add('vgrid');
    element.border = '1';
    element.rules = 'all';
    element.style.tableLayout = 'auto';

    const utilityColumnCount = Number(rowReorderActive) + Number(hasRowActions);
    const selectionOffset = rowSelectionActive ? 1 : 0;
    const colOffset = subgrids.length + selectionOffset + (rowNumbers ? 1 : 0) + utilityColumnCount;
    let totalCols = activeColumns.length + colOffset;
    let toggleIndexes = [];
    let toggleIndexesSorted = [];
    let rowNumberIndex = -1;
    const computeToggleIndexes = () => {
        toggleIndexes = new Array(subgrids.length).fill(-1);
        const ends = subgrids.filter(sub => sub.position === 'end');
        const numbered = subgrids
            .filter(sub => typeof sub.position === 'number')
            .sort((a, b) => a.position - b.position || a.order - b.order);
        let next = selectionOffset;
        subgrids.filter(sub => sub.position === 'start').forEach(sub => { toggleIndexes[sub.order] = next++; });
        const limit = Math.max(totalCols - ends.length - 1, next);
        numbered.forEach(sub => {
            next = Math.min(Math.max(sub.position - 1 + selectionOffset, next), limit);
            toggleIndexes[sub.order] = next++;
        });
        ends.forEach((sub, index) => { toggleIndexes[sub.order] = totalCols - ends.length + index; });
        toggleIndexesSorted = [...toggleIndexes].sort((a, b) => a - b);
        rowNumberIndex = -1;
        if (rowNumbers) {
            rowNumberIndex = selectionOffset;
            while (toggleIndexesSorted.includes(rowNumberIndex)) rowNumberIndex++;
        }
    };
    computeToggleIndexes();
    const placeToggleCells = (cells, makeCell) => {
        subgrids
            .map(sub => ({ sub, at: toggleIndexes[sub.order] }))
            .sort((a, b) => a.at - b.at)
            .forEach(({ sub, at }) => cells.splice(Math.min(Math.max(at, 0), cells.length), 0, makeCell(sub)));
        return cells;
    };
    const columnAtCell = index => {
        if (index < selectionOffset || toggleIndexesSorted.includes(index)) return null;
        let position = index - selectionOffset - toggleIndexesSorted.filter(at => at < index).length - (rowNumbers ? 1 : 0);
        return position >= 0 ? activeColumns[position] : null;
    };
    const isAdjustableColumn = index => !isToggleCell(index) && !!columnAtCell(index);
    const colgroup = document.createElement('colgroup');
    const columnCols = [];
    const colSpanCells = [];
    const isToggleCell = index => toggleIndexesSorted.includes(index);
    const isFitCell = index => isToggleCell(index) || index < selectionOffset || index === rowNumberIndex;
    const buildColgroup = () => {
        columnCols.length = 0;
        colgroup.replaceChildren(...Array.from({ length: totalCols }, (unused, index) => {
            const col = make('col');
            if (isToggleCell(index)) col.className = partClass('toggle-column');
            else if (index < selectionOffset) col.className = partClass('select-column');
            else if (index === rowNumberIndex) col.className = partClass('row-number-column');
            columnCols.push(col);
            return col;
        }));
    };
    const pruneColSpanCells = () => {
        for (let i = colSpanCells.length - 1; i >= 0; i--) {
            if (!colSpanCells[i].parentNode?.parentNode) colSpanCells.splice(i, 1);
        }
    };
    const trackColSpan = cell => {
        pruneColSpanCells();
        colSpanCells.push(cell);
    };
    const updateColSpans = () => {
        pruneColSpanCells();
        colSpanCells.forEach(cell => { cell.colSpan = totalCols; });
    };
    const spanningRow = (part, ...children) => {
        const td = make('td', { colSpan: totalCols }, ...children);
        trackColSpan(td);
        return make('tr', { className: partClass(part), attrs: { role: 'presentation' } }, td);
    };
    buildColgroup();
    const clipCell = cell => {
        cell.classList.add('vgrid-clip');
        return cell;
    };

    const controller = new AbortController();
    const { signal } = controller;

    const thead = document.createElement('thead');
    const tfoot = document.createElement('tfoot');

    const settingsPanel = document.createElement('div');
    let settingsButton = null;
    let refreshButton = null;
    let clearFiltersButton = null;
    let downloadButton = null;
    let printButton = null;

    const makeActionButton = config => {
        const button = makeButton();
        if (config.title) button.title = config.title;
        if (config.className) button.className = config.className;
        if (config.html instanceof Element) button.replaceChildren(config.html.cloneNode(true));
        else if (typeof config.html === 'string') button.innerHTML = config.html;
        else button.textContent = config.symbol ?? '';
        const accessibleLabel = config.ariaLabel ?? config.label ?? config.title;
        if (accessibleLabel) button.setAttribute('aria-label', String(accessibleLabel));
        return button;
    };

    if (resolvedActions.clear.active) {
        clearFiltersButton = makeActionButton(resolvedActions.clear);
        clearFiltersButton.addEventListener('click', () => resetFilters(), { signal });
    }

    if (resolvedActions.refresh.active) {
        refreshButton = makeActionButton(resolvedActions.refresh);
        refreshButton.addEventListener('click', () => {
            if (isRemote) fetchData();
            else if (sortColIndex !== null && sortColIndex !== -1) applySort();
            else render();
        }, { signal });
    }

    let syncSettingsOrder = () => {};
    if (resolvedActions.settings.active) {
        vGrid.instanceCount = (vGrid.instanceCount || 0) + 1;
        settingsPanel.id = `vgrid-settings-${vGrid.instanceCount}`;
        settingsPanel.className = partClass('settings');
        settingsPanel.setAttribute('popover', '');
        settingsButton = makeActionButton(resolvedActions.settings);
        settingsButton.setAttribute('popovertarget', settingsPanel.id);

        settingsPanel.appendChild(makeButton({
            className: partClass('settings-close'),
            textContent: '\u00D7',
            title: 'Close',
            attrs: { 'aria-label': 'Close', popovertarget: settingsPanel.id, popovertargetaction: 'hide' },
        }));

        const settingsTitle = make('div', { className: partClass('settings-title'), id: `${settingsPanel.id}-title`, textContent: 'Display columns' });
        const settingsList = make('div', { className: partClass('settings-list'), attrs: { role: 'group', 'aria-labelledby': settingsTitle.id } });
        const settingsCheckboxes = [];
        columns.forEach((col, index) => {
            const checkbox = make('input', { type: 'checkbox', id: `${settingsPanel.id}-column-${index}`, checked: col.active !== false });
            checkbox.addEventListener('change', () => {
                if (!checkbox.checked && !settingsCheckboxes.some(entry => entry.checkbox.checked)) {
                    checkbox.checked = true;
                }
            }, { signal });
            const row = make('div', { className: partClass('settings-column') }, make('label', { htmlFor: checkbox.id }, checkbox, ` ${col.label || col.name}`));
            settingsCheckboxes.push({ column: col, checkbox, row });
            settingsList.appendChild(row);
        });
        settingsPanel.append(settingsTitle, settingsList);
        syncSettingsOrder = () => {
            settingsCheckboxes.sort((a, b) => columns.indexOf(a.column) - columns.indexOf(b.column));
            settingsList.append(...settingsCheckboxes.map(entry => entry.row));
        };
        syncSettingsOrder();

        const applyPending = () => {
            settingsCheckboxes.forEach(({ column, checkbox }) => { column.active = checkbox.checked; });
            settingsPanel.hidePopover();
            rebuildColumns();
        };

        const applyButton = makeButton({ textContent: 'Apply' });
        applyButton.addEventListener('click', applyPending, { signal });

        const saveButton = makeButton({ textContent: 'Save' });
        saveButton.addEventListener('click', () => {
            applyPending();
            const preference = {};
            settingsCheckboxes.forEach(({ column, checkbox }) => { preference[column.name] = checkbox.checked; });
            try { localStorage.setItem(settingsStorageKey, JSON.stringify(preference)); } catch { }
        }, { signal });

        settingsPanel.appendChild(make('div', { className: partClass('settings-actions') }, applyButton, saveButton));

        let settingsAbove = false;
        const measureSettingsPanel = () => {
            const anchor = settingsButton;
            if (!anchor?.isConnected || !settingsPanel.matches(':popover-open')) return;
            const gap = 4;
            const viewportHeight = window.visualViewport?.height || window.innerHeight;
            const button = anchor.getBoundingClientRect();
            settingsPanel.style.maxHeight = '';
            settingsList.style.maxHeight = '';
            const wanted = settingsPanel.scrollHeight;
            const spaceBelow = viewportHeight - button.bottom - gap * 2;
            const spaceAbove = button.top - gap * 2;
            settingsAbove = wanted > spaceBelow && spaceAbove > spaceBelow;
            const limit = Math.max(120, Math.min(viewportHeight - gap * 2, settingsAbove ? spaceAbove : spaceBelow));
            settingsPanel.style.maxHeight = `${limit}px`;
            const spare = settingsPanel.clientHeight - settingsList.offsetHeight;
            if (settingsPanel.clientHeight) settingsList.style.maxHeight = `${Math.max(48, limit - spare)}px`;
        };
        const placeSettingsPanel = () => {
            const anchor = settingsButton;
            if (!anchor?.isConnected || !settingsPanel.matches(':popover-open')) return;
            const gap = 4;
            const viewportHeight = window.visualViewport?.height || window.innerHeight;
            const button = anchor.getBoundingClientRect();
            const panel = settingsPanel.getBoundingClientRect();
            const top = settingsAbove ? button.top - gap - panel.height : button.bottom + gap;
            const left = Math.max(gap, Math.min(button.right - panel.width, window.innerWidth - panel.width - gap));
            settingsPanel.style.top = `${Math.max(gap, Math.min(top, viewportHeight - panel.height - gap))}px`;
            settingsPanel.style.left = `${left}px`;
        };
        const fitSettingsPanel = () => { measureSettingsPanel(); placeSettingsPanel(); };

        settingsPanel.addEventListener('toggle', event => {
            if (event.newState !== 'open') return;
            settingsCheckboxes.forEach(({ column, checkbox }) => { checkbox.checked = column.active !== false; });
            syncSettingsOrder();
            fitSettingsPanel();
        }, { signal });

        window.addEventListener('resize', fitSettingsPanel, { signal });
        window.addEventListener('scroll', event => { if (!settingsPanel.contains(event.target)) placeSettingsPanel(); }, { signal, capture: true });
        window.visualViewport?.addEventListener('resize', fitSettingsPanel, { signal });
        window.visualViewport?.addEventListener('scroll', placeSettingsPanel, { signal });
    }

    if (downloadMode) {
        downloadButton = makeActionButton(resolvedActions.download);
        downloadButton.addEventListener('click', () => startDownload(), { signal });
    }

    if (resolvedActions.print.active) {
        printButton = makeActionButton(resolvedActions.print);
        printButton.addEventListener('click', () => startPrint(), { signal });
    }

    let textSizeButtons = [];
    let currentSize = sizePreset;
    if (resolvedActions.textSize.active) {
        try {
            const saved = localStorage.getItem(textSizeStorageKey);
            if (sizePresets.includes(saved)) currentSize = saved;
        } catch { }
        const textSizeConfig = resolvedActions.textSize;
        const decreaseButton = makeActionButton({ className: textSizeConfig.className, title: textSizeConfig.decreaseTitle, symbol: textSizeConfig.decrease });
        const increaseButton = makeActionButton({ className: textSizeConfig.className, title: textSizeConfig.increaseTitle, symbol: textSizeConfig.increase });
        const syncTextSize = () => {
            const index = sizePresets.indexOf(currentSize);
            decreaseButton.disabled = index <= 0;
            increaseButton.disabled = index >= sizePresets.length - 1;
        };
        const stepTextSize = step => {
            const next = sizePresets[sizePresets.indexOf(currentSize) + step];
            if (!next) return;
            const before = parseFloat(getComputedStyle(gridWrapper).fontSize);
            currentSize = next;
            gridWrapper.dataset.vgridSize = currentSize;
            const ratio = parseFloat(getComputedStyle(gridWrapper).fontSize) / before;
            if (frozenWidths && Number.isFinite(ratio) && ratio > 0) {
                frozenWidths = frozenWidths.map((width, i) => isFitCell(i) ? width * ratio : width);
                writeColumnWidths();
            }
            syncTextSize();
            paginationBars.forEach(layoutPagination);
            try { localStorage.setItem(textSizeStorageKey, currentSize); } catch { }
        };
        decreaseButton.addEventListener('click', () => stepTextSize(-1), { signal });
        increaseButton.addEventListener('click', () => stepTextSize(1), { signal });
        syncTextSize();
        textSizeButtons = [decreaseButton, increaseButton];
    }

    const actionElements = {
        clear: clearFiltersButton,
        download: downloadButton,
        print: printButton,
        refresh: refreshButton,
        settings: settingsButton,
        textSize: textSizeButtons
    };
    const actionButtons = actionsSequence.flatMap(name => actionElements[name] ?? []);
    const externalActions = actionButtons.length > 0 && !!actionsElement;
    const inlineActions = actionButtons.length > 0 && !actionsElement && actionsPosition !== 'none';
    const captionActions = inlineActions && actionsPosition !== 'bottom';
    const bottomActions = inlineActions && actionsPosition === 'bottom';

    const makeActions = () => make('span', { className: partClass('actions') }, ...actionButtons);

    if (caption || captionActions) {
        const inner = make('div', { className: partClass('viewport') });
        if (caption) {
            inner.innerHTML = caption;
            accessibleCaptionText = inner.textContent.replace(/\s+/g, ' ').trim() || accessibleCaptionText;
        }
        if (captionActions) inner.insertBefore(makeActions(), inner.firstChild);
        thead.appendChild(spanningRow('caption', inner));
    }

    if (accessibleCaptionText && !originalAriaLabel?.trim() && !originalAriaLabelledBy?.trim()) {
        element.setAttribute('aria-label', accessibleCaptionText);
    }

    if (externalActions) actionsElement.replaceChildren(...actionButtons);

    const infoEls = [], pagerEls = [], rowsPerPageSelects = [], paginationBars = [];
    let pagerTotalPages = null;
    const barObserver = new ResizeObserver(entries => {
        entries.forEach(({ target }) => {
            const entry = paginationBars.find(item => item.bar === target);
            if (!entry || entry.frame || entry.width === target.clientWidth) return;
            entry.frame = requestAnimationFrame(() => {
                entry.frame = 0;
                if (!destroyed && entry.width !== target.clientWidth) layoutPagination(entry);
            });
        });
    });

    const bindPager = pager => {
        pager.addEventListener('click', event => {
            const button = event.target.closest('button[data-vgrid-page]');
            if (!button || button.disabled) return;
            currentPage = parseInt(button.dataset.vgridPage);
            render();
        }, { signal });
        return pager;
    };

    externalPaginationElements.forEach(container => {
        const info = make('span', { className: partClass('count') });
        const pager = bindPager(make('span', { className: partClass('pager') }));
        container.replaceChildren(info, ' ', pager);
        infoEls.push(info);
        pagerEls.push(pager);
    });

    const pageSizeOptions = total => [...new Set(rowsPerPageOptions
        ? [...rowsPerPageOptions, rowsPerPage]
        : [
            ...(total <= 10 ? [5, 10] : total <= 50 ? [10, 20, 50] : [20, 40, 50, 100]),
            rowsPerPage,
        ])].filter(size => Number.isFinite(size)).sort((a, b) => a - b);

    const currentPageSize = () => {
        const external = pageSizeSource === 'external' && externalRowsPerPageElement ? toPageSize(externalRowsPerPageElement.value) : null;
        if (external) return external;
        return rowsPerPageSelects[0] ? parseInt(rowsPerPageSelects[0].value) : (rowsPerPage || 0);
    };

    const setSelectValue = (select, size) => {
        const value = String(size);
        if (!select.options) { select.value = value; return; }
        if (![...select.options].some(option => option.value === value)) {
            select.insertBefore(make('option', { value, textContent: size }), [...select.options].find(option => parseInt(option.value) > size) || null);
        }
        select.value = value;
    };

    const syncPageSizeControls = size => {
        if (!toPageSize(size)) return;
        rowsPerPageSelects.forEach(select => setSelectValue(select, size));
        externalRowsPerPageElements.forEach(select => setSelectValue(select, size));
    };

    const updatePageSizeOptions = total => {
        const selected = currentPageSize() || rowsPerPage;
        const sizes = [...new Set([...pageSizeOptions(total), selected])].filter(size => Number.isFinite(size)).sort((a, b) => a - b);
        rowsPerPageSelects.forEach(select => {
            select.replaceChildren(...sizes.map(s => make('option', { value: String(s), textContent: s })));
            select.value = String(selected);
        });
        externalRowsPerPageElements.forEach(select => setSelectValue(select, selected));
    };

    const makeBar = () => {
        const left = make('span', { className: partClass('count') });
        const center = bindPager(make('span', { className: partClass('pager') }));
        const right = make('span', { className: partClass('rows-per-page') });

        if (showPagination) {
            infoEls.push(left);
            pagerEls.push(center);
        }

        if (showRowsPerPage) {
            const rowsPerPageSelect = make('select', {}, ...pageSizeOptions(isRemote ? 0 : data.length)
                .map(s => make('option', { value: String(s), textContent: s, selected: s === rowsPerPage })));
            rowsPerPageSelects.push(rowsPerPageSelect);
            right.appendChild(make('label', { textContent: 'Show ' }, rowsPerPageSelect, make('span', { textContent: ' rows' })));
        }

        const bar = make('span', { className: partClass('pagination-bar') }, left, center, right);
        paginationBars.push({ bar, pager: center, paged: showPagination, width: 0, frame: 0 });
        barObserver.observe(bar);
        return spanningRow('pagination', bar);
    };

    if (rowsPerPage && (showPagination || showRowsPerPage)) thead.appendChild(makeBar());

    const headerRow = document.createElement('tr');
    headerRow.className = partClass('header');
    const headerCells = [];
    const columnHeaders = [];
    const columnHeaderLabels = [];
    let tableRowMetadata = { partial: false, total: null, offset: 0 };
    let updateTableRowMetadata = () => {};

    let selectAllBox = null;
    let syncSelection = () => {};
    const buildHeaderRow = () => {
        headerCells.length = 0;
        columnHeaders.length = 0;
        columnHeaderLabels.length = 0;
        const cells = [];
        if (cellSelectionActive) headerRow.setAttribute('role', 'row');
        if (rowSelectionActive) {
            const th = make('th', { scope: 'col', className: partClass('select') });
            selectAllBox = null;
            if (singleSelection) th.setAttribute('aria-label', 'Selection');
            else {
                selectAllBox = make('input', { type: 'checkbox', data: { vgridSelectPage: '1' } });
                th.appendChild(selectAllBox);
            }
            cells.push(clipCell(th));
        }
        if (rowNumbers) {
            const th = make('th', { scope: 'col', className: partClass('row-number') });
            if (cellSelectionActive) th.setAttribute('role', 'columnheader');
            cells.push(clipCell(th));
        }
        activeColumns.forEach((col, i) => {
            const label = col.label || col.name;
            const th = make('th', { scope: 'col', textContent: label });
            if (cellSelectionActive) th.setAttribute('role', 'columnheader');
            if (col.width) th.width = String(col.width);
            if (col.sort !== false) {
                th.title = `Sort by ${label}`;
                th.dataset.vgridSort = String(i);
                th.replaceChildren(makeButton({ attrs: { 'aria-label': `Sort by ${label}` } }, label,
                    make('span', { data: { vgridSortIndicator: '1' }, attrs: { 'aria-hidden': 'true' } })));
            }
            cells.push(clipCell(th));
            columnHeaders.push(th);
            columnHeaderLabels.push(label);
        });
        if (rowReorderActive) cells.push(clipCell(make('th', { scope: 'col', textContent: 'Row order', attrs: { 'aria-label': 'Row order controls' } })));
        if (hasRowActions) cells.push(clipCell(make('th', { scope: 'col', textContent: 'Actions', attrs: { 'aria-label': 'Row actions' } })));
        if (hasPanels) placeToggleCells(cells, () => clipCell(make('th', { scope: 'col' })));
        headerCells.push(...cells);
        headerRow.replaceChildren(...cells);
        syncSelection();
    };

    buildHeaderRow();
    headerRow.addEventListener('keydown', event => {
        if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
        const th = event.target.closest('th[data-vgrid-sort]');
        if (!th || th.parentNode !== headerRow) return;
        const column = activeColumns[parseInt(th.dataset.vgridSort)];
        if (!column) return;
        event.preventDefault();
        resizeColumnBy(column, event.key === 'ArrowRight' ? 10 : -10);
    }, { signal });
    headerRow.addEventListener('click', event => {
        const th = event.target.closest('th[data-vgrid-sort]');
        if (!th || th.parentNode !== headerRow) return;
        if (suppressHeaderClick) {
            suppressHeaderClick = false;
            return;
        }
        const i = parseInt(th.dataset.vgridSort);
        const name = activeColumns[i]?.name;
        const existing = sortCriteria.find(sort => sort.column === name);
        if (event.shiftKey) {
            if (existing) existing.order = existing.order === 'asc' ? 'desc' : 'asc';
            else sortCriteria.push({ column: name, order: 'asc' });
        } else {
            const order = existing ? (existing.order === 'asc' ? 'desc' : 'asc') : 'asc';
            sortCriteria = [{ column: name, order }];
        }
        sortColIndex = activeColumns.findIndex(column => column.name === sortCriteria[0]?.column);
        sortOrder = sortCriteria[0]?.order ?? null;
        currentPage = 1;
        applySort();
    }, { signal });
    thead.appendChild(headerRow);

    const filterInputs = [];
    const filterClears = [];
    const filterDefaults = new Map();
    const filterRowElement = filterRow ? document.createElement('tr') : null;
    if (filterRowElement) {
        filterRowElement.className = partClass('filter');
        filterRowElement.setAttribute('role', 'presentation');
    }

    const filterModeKeys = new Map();
    const filterModeCache = new WeakMap();
    const filterModeMenu = { menu: make('div', { className: partClass('filter-mode-menu'), attrs: { popover: '', role: 'menu' } }), menuOwner: null, menuAbove: false, menuFrame: 0, menuClosedAt: 0, column: null };

    const htmlToText = html => {
        const template = document.createElement('template');
        template.innerHTML = String(html);
        return template.content.textContent;
    };

    const filterModesOf = col => {
        if (filterModeCache.has(col)) return filterModeCache.get(col);
        const source = col.filterModes;
        let modes = null;
        if (source && (typeof source !== 'object' || Array.isArray(source))) {
            console.error(`vGrid: filterModes on column "${col.name}" must be an object of parameter: label pairs.`);
        } else if (source && !isRemote) {
            console.error(`vGrid: filterModes on column "${col.name}" needs a dataSource. The column keeps its plain filter.`);
        } else if (source && col.filterType === 'select') {
            console.error(`vGrid: filterModes on column "${col.name}" works with text filters only.`);
        } else if (source) {
            modes = Object.entries(source).map(([key, value]) => {
                const described = value !== null && typeof value === 'object' && !(value instanceof Element);
                const isRange = key === 'range';
                const keys = isRange
                    ? (described && Array.isArray(value.keys) ? value.keys.map(part => String(part ?? '').trim()) : [])
                    : [key.trim()];
                if (isRange && (keys.length !== 2 || keys.some(part => !part) || keys[0] === keys[1])) {
                    console.error(`vGrid: filterModes range on column "${col.name}" needs keys: an array of two different parameter names.`);
                    return null;
                }
                if (!keys[0]) {
                    console.error(`vGrid: filterModes on column "${col.name}" has an empty parameter name.`);
                    return null;
                }
                const reserved = keys.filter(part => reservedColumnNames.has(part.toLowerCase()));
                if (reserved.length) {
                    console.error(`vGrid: filterModes ${isRange ? 'range' : `key "${key}"`} on column "${col.name}" uses the reserved name(s) ${reserved.join(', ')}.`);
                    return null;
                }
                const label = described ? value.label : value;
                const text = (label instanceof Element ? label.textContent : htmlToText(label ?? '')).trim() || keys.join(' – ');
                const symbol = described && value.symbol !== undefined && value.symbol !== null ? String(value.symbol) : '';
                const fixed = described && value.value !== undefined && value.value !== null ? String(value.value) : null;
                if (fixed !== null && (isRange || fixed === '')) {
                    console.error(`vGrid: filterModes key "${key}" on column "${col.name}" needs a non-empty value and cannot be a range.`);
                    return null;
                }
                return { key, keys, label: label ?? text, text, symbol, face: symbol || [...text][0], value: fixed };
            }).filter(Boolean);
            if (!modes.some(mode => mode.key === col.name)) {
                modes.unshift({ key: col.name, keys: [col.name], label: 'Contains', text: 'Contains', symbol: '≈', face: '≈', value: null });
            }
            if (modes.length < 2) modes = null;
        }
        filterModeCache.set(col, modes);
        return modes;
    };

    const currentFilterMode = (col, modes) => modes.find(mode => mode.key === filterModeKeys.get(col.name))
        || modes.find(mode => mode.key === col.name);

    const filterSlotKey = input => `${activeColumns[parseInt(input.dataset.col)]?.name}\u0000${input.dataset.slot || '0'}`;
    const keptFilterValues = () => new Map(filterInputs
        .filter(input => input.value && !input.dataset.vgridFixed && activeColumns[parseInt(input.dataset.col)])
        .map(input => [filterSlotKey(input), input.value]));
    const restoreFilterValues = kept => {
        filterInputs.forEach(input => {
            if (input.dataset.vgridFixed) return;
            const value = kept.get(filterSlotKey(input));
            if (value) input.value = value;
        });
        syncFilterClears();
    };

    const syncFilterClears = () => filterClears.forEach(({ control, button, pad }) => {
        const filled = control.value !== '';
        button.hidden = !filled;
        control.style.paddingRight = filled ? pad : '';
    });

    const clearFilterInput = control => {
        if (control.dataset.vgridFilterFixed) {
            selectFilterMode(control.dataset.vgridFilterFixed, control.dataset.vgridFilterFixed);
            return;
        }
        if (control.value === '') return;
        control.focus();
        if (control.tagName === 'SELECT') {
            control.value = '';
            control.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }
        control.select();
        let cleared = false;
        try { cleared = document.execCommand('delete') && control.value === ''; }
        catch { cleared = false; }
        if (cleared) return;
        control.value = '';
        control.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const resetFilters = () => {
        if (filterModeKeys.size) {
            filterModeKeys.clear();
            buildFilterRow();
        }
        resettingFilters = true;
        filterInputs.forEach(control => { control.value = filterDefaults.get(control) ?? ''; });
        externalFilterInputs.forEach(({ element }) => {
            const value = externalFilterDefaults.get(element) ?? '';
            if (element.value === value) return;
            element.value = value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
        });
        resettingFilters = false;
        syncFilterClears();
        clearTimeout(filterTimer);
        currentPage = 1;
        if (!isRemote) {
            onFilter?.({ filters: filterInputs.map(i => ({ column: activeColumns[parseInt(i.dataset.col)]?.name, value: i.value })) });
        }
        render();
    };

    const addFilterClear = (control, col) => {
        const isSelect = control.tagName === 'SELECT';
        const button = makeButton({
            className: partClass('filter-clear'),
            hidden: true,
            textContent: '\u00D7',
            attrs: { 'aria-label': `Clear ${col.label || col.name} filter` },
            data: { vgridFilterClear: '1' },
        });
        filterClears.push({ control, button, pad: isSelect ? 'calc(24px + 1.2em)' : '24px' });
        return make('span', { className: partClass('filter-wrap') }, control, button);
    };

    const makeTextFilter = (col, i) => make('input', {
        type: 'text',
        className: partClass(`filter-${col.name}`),
        placeholder: col.label || col.name,
        attrs: { 'aria-label': `Filter by ${col.label || col.name}` },
        data: { col: String(i) },
    });

    const buildModedFilter = (col, i, modes, clearable) => {
        const mode = currentFilterMode(col, modes);
        const name = col.label || col.name;
        const box = make('span', { className: partClass('filter-moded') }, makeButton({
            className: partClass('filter-mode', partClass(`filter-mode-${col.name}`)),
            textContent: mode.face,
            title: `${name}: ${mode.text}`,
            attrs: { 'aria-haspopup': 'menu', 'aria-label': `${name} filter: ${mode.text}` },
            data: { vgridFilterMode: String(i) },
        }));
        mode.keys.forEach((key, slot) => {
            const input = makeTextFilter(col, i);
            input.dataset.param = key;
            input.dataset.slot = String(slot);
            if (mode.value !== null) {
                input.type = 'hidden';
                input.value = mode.value;
                input.dataset.vgridFixed = '1';
                const shown = make('input', {
                    type: 'text',
                    readOnly: true,
                    value: mode.text,
                    className: partClass('filter-fixed'),
                    attrs: { 'aria-label': `${name} filter: ${mode.text}`, 'aria-haspopup': 'menu' },
                    data: { vgridFilterFixed: col.name },
                });
                box.append(input, clearable ? addFilterClear(shown, col) : shown);
            } else {
                if (mode.keys.length > 1) {
                    input.placeholder = slot ? 'to' : 'from';
                    input.setAttribute('aria-label', `${name} ${slot ? 'to' : 'from'}`);
                }
                box.appendChild(clearable ? addFilterClear(input, col) : input);
            }
            filterDefaults.set(input, '');
            filterInputs.push(input);
        });
        return box;
    };

    const showFilterModeMenu = button => {
        const col = activeColumns[parseInt(button.dataset.vgridFilterMode)];
        const modes = col && filterModesOf(col);
        if (!modes) return;
        const current = currentFilterMode(col, modes);
        const menu = filterModeMenu.menu;
        menu.replaceChildren(...modes.map(mode => {
            const item = makeButton({
                className: partClass('filter-mode-item'),
                title: mode.text,
                attrs: { role: 'menuitemradio', 'aria-checked': mode === current ? 'true' : 'false' },
                data: { vgridFilterModeKey: mode.key },
            });
            if (mode.symbol) item.appendChild(make('span', { className: partClass('filter-mode-symbol'), textContent: mode.symbol }));
            const label = make('span');
            if (mode.label instanceof Element) label.appendChild(mode.label.cloneNode(true));
            else label.innerHTML = String(mode.label);
            item.appendChild(label);
            return item;
        }));
        filterModeMenu.menuOwner = button;
        filterModeMenu.column = col.name;
        menu.style.maxHeight = '';
        menu.showPopover();
        resizePanelMenu(filterModeMenu);
        menu.querySelector('[aria-checked="true"]')?.focus();
    };

    const selectFilterMode = (name, key) => {
        const col = activeColumns.find(column => column.name === name);
        const modes = col && filterModesOf(col);
        if (!modes || !modes.some(mode => mode.key === key)) return;
        if (currentFilterMode(col, modes).key === key) {
            filterModeMenu.menuOwner?.focus();
            return;
        }
        const filled = filterInputs.some(input => activeColumns[parseInt(input.dataset.col)] === col && input.value);
        const kept = keptFilterValues();
        if (key === col.name) filterModeKeys.delete(name);
        else filterModeKeys.set(name, key);
        buildFilterRow();
        restoreFilterValues(kept);
        (filterInputs.find(input => activeColumns[parseInt(input.dataset.col)] === col && !input.dataset.vgridFixed)
            || [...filterRowElement.querySelectorAll('[data-vgrid-filter-fixed]')].find(field => field.dataset.vgridFilterFixed === name))?.focus();
        const applied = filterInputs.some(input => input.dataset.vgridFixed && activeColumns[parseInt(input.dataset.col)] === col);
        if (!filled && !applied) return;
        clearTimeout(filterTimer);
        currentPage = 1;
        render();
    };

    const buildFilterRow = () => {
        if (!filterRowElement) return;
        if (filterModeMenu.menu.matches(':popover-open')) filterModeMenu.menu.hidePopover();
        filterInputs.length = 0;
        filterClears.length = 0;
        filterDefaults.clear();
        const cells = [];
        if (rowSelectionActive) cells.push(clipCell(make('td', { className: partClass('select') })));
        if (rowNumbers) cells.push(clipCell(make('td', { className: partClass('row-number') })));
        activeColumns.forEach((col, i) => {
            const td = make('td');
            if (col.filter !== false) {
                const modes = filterModesOf(col);
                if (modes) {
                    td.appendChild(buildModedFilter(col, i, modes, filterClear && col.filterClear !== false));
                    cells.push(clipCell(td));
                    return;
                }
                let control;
                let clearable = filterClear && col.filterClear !== false;
                if (col.filterType === 'select') {
                    const select = make('select', {
                        className: partClass(`filter-${col.name}`),
                        attrs: { 'aria-label': `Filter by ${col.label || col.name}` },
                        data: { col: String(i) },
                    }, ...(col.filterOptions || '').split(';').map(pair => {
                        const sep = pair.indexOf(':');
                        return make('option', { value: sep === -1 ? pair : pair.slice(0, sep), textContent: sep === -1 ? pair : pair.slice(sep + 1) });
                    }));
                    clearable = clearable && [...select.options].some(option => option.value === '');
                    control = select;
                } else {
                    control = makeTextFilter(col, i);
                }
                td.appendChild(clearable ? addFilterClear(control, col) : control);
                filterDefaults.set(control, control.value);
                filterInputs.push(control);
            }
            cells.push(clipCell(td));
        });
        if (hasPanels) placeToggleCells(cells, () => clipCell(make('td')));
        filterRowElement.replaceChildren(...cells);
        syncFilterClears();
    };

    buildFilterRow();
    if (filterRowElement) {
        const filterControlOf = target => {
            const control = target.closest('input, select');
            return control && filterInputs.includes(control) ? control : null;
        };
        const onFilterInput = event => {
            const control = filterControlOf(event.target);
            if (!control || event.type !== (control.tagName === 'SELECT' ? 'change' : 'input')) return;
            syncFilterClears();
            currentPage = 1;
            if (isRemote) {
                clearTimeout(filterTimer);
                filterTimer = setTimeout(render, 300);
            } else {
                onFilter?.({ filters: filterInputs.map(i => ({ column: activeColumns[parseInt(i.dataset.col)]?.name, value: i.value })) });
                render();
            }
        };
        filterRowElement.addEventListener('input', onFilterInput, { signal });
        filterRowElement.addEventListener('change', onFilterInput, { signal });
        const fixedModeButtonOf = target => target.closest('[data-vgrid-filter-fixed]')?.closest('td')?.querySelector('[data-vgrid-filter-mode]') || null;
        filterRowElement.addEventListener('keydown', event => {
            const fixedOwner = fixedModeButtonOf(event.target);
            if (fixedOwner && ['Enter', ' ', 'ArrowDown'].includes(event.key)) {
                event.preventDefault();
                showFilterModeMenu(fixedOwner);
                return;
            }
            if (event.key !== 'Escape') return;
            if (fixedOwner) {
                if (!filterClears.some(entry => entry.control === event.target)) return;
                event.preventDefault();
                clearFilterInput(event.target);
                return;
            }
            const control = filterControlOf(event.target);
            if (!control || control.tagName === 'SELECT' || control.value === '') return;
            if (!filterClears.some(entry => entry.control === control)) return;
            event.preventDefault();
            clearFilterInput(control);
        }, { signal });
        filterRowElement.addEventListener('click', event => {
            const modeButton = event.target.closest('[data-vgrid-filter-mode]') || fixedModeButtonOf(event.target);
            if (modeButton) {
                const open = filterModeMenu.menu.matches(':popover-open');
                if (filterModeMenu.menuOwner === modeButton && open) { filterModeMenu.menu.hidePopover(); return; }
                if (filterModeMenu.menuOwner === modeButton && Date.now() - filterModeMenu.menuClosedAt < 200) return;
                showFilterModeMenu(modeButton);
                return;
            }
            const button = event.target.closest('[data-vgrid-filter-clear]');
            const control = button && filterClears.find(entry => entry.button === button)?.control;
            if (control) clearFilterInput(control);
        }, { signal });

        const MAGNIFY_EM = 12;
        const MAGNIFY_INSET = 4;
        const MAGNIFY_STYLES = ['width', 'marginLeft', 'marginRight', 'position', 'zIndex'];
        const magnifiedFields = new Map();
        const settleMagnify = entry => {
            clearTimeout(entry.timer);
            if (entry.onEnd) entry.field.removeEventListener('transitionend', entry.onEnd);
            MAGNIFY_STYLES.forEach(name => { entry.field.style[name] = entry.saved[name]; });
            delete entry.field.dataset.vgridMagnified;
            entry.cell.style.overflow = '';
            magnifiedFields.delete(entry.field);
        };
        const expandField = entry => {
            clearTimeout(entry.timer);
            if (entry.onEnd) entry.field.removeEventListener('transitionend', entry.onEnd);
            entry.onEnd = null;
            entry.state = 'open';
            entry.field.dataset.vgridMagnified = '1';
            entry.field.style.width = `${entry.width}px`;
            entry.field.style.marginLeft = `${-entry.shift}px`;
            entry.field.style.marginRight = `${entry.base - entry.width + entry.shift}px`;
        };
        const magnify = control => {
            if (control.tagName !== 'INPUT') return;
            const cell = control.closest('td');
            const field = cell?.firstElementChild;
            if (!field || cell.parentElement !== filterRowElement) return;
            const known = magnifiedFields.get(field);
            if (known) {
                if (known.state === 'closing') expandField(known);
                return;
            }
            const fieldRect = field.getBoundingClientRect();
            const wrapperRect = gridWrapper.getBoundingClientRect();
            const em = parseFloat(getComputedStyle(control).fontSize) || 16;
            const inputs = field.tagName === 'INPUT' ? 1 : field.querySelectorAll('input').length || 1;
            const room = wrapperRect.width - MAGNIFY_INSET * 2;
            const width = Math.min(MAGNIFY_EM * em * inputs, room);
            if (width <= fieldRect.width + 1) return;
            const left = fieldRect.left - wrapperRect.left;
            const shift = Math.max(0, Math.min(left - MAGNIFY_INSET, left + width - wrapperRect.width + MAGNIFY_INSET));
            const saved = {};
            MAGNIFY_STYLES.forEach(name => { saved[name] = field.style[name]; });
            const entry = { cell, field, saved, base: fieldRect.width, width, shift, state: 'open', timer: null, onEnd: null };
            magnifiedFields.set(field, entry);
            cell.style.overflow = 'visible';
            field.style.position = saved.position || 'relative';
            field.style.zIndex = '3';
            field.style.width = `${entry.base}px`;
            field.style.marginLeft = '0px';
            field.style.marginRight = '0px';
            void field.offsetWidth;
            expandField(entry);
        };
        const collapseField = entry => {
            if (entry.state === 'closing') return;
            if (!entry.field.isConnected) { settleMagnify(entry); return; }
            entry.state = 'closing';
            delete entry.field.dataset.vgridMagnified;
            entry.field.style.width = `${entry.base}px`;
            entry.field.style.marginLeft = '0px';
            entry.field.style.marginRight = '0px';
            entry.onEnd = event => {
                if (event.target === entry.field && event.propertyName === 'width') settleMagnify(entry);
            };
            entry.field.addEventListener('transitionend', entry.onEnd, { signal });
            entry.timer = setTimeout(() => settleMagnify(entry), easingMs + 150);
        };
        const collapseUnfocused = () => {
            const active = document.activeElement;
            magnifiedFields.forEach(entry => {
                if (!entry.field.contains(active)) collapseField(entry);
            });
        };
        filterRowElement.addEventListener('focusin', event => {
            const control = filterControlOf(event.target);
            if (control) magnify(control);
        }, { signal });
        filterRowElement.addEventListener('focusout', event => {
            const next = event.relatedTarget;
            if (next && filterModeMenu.menu.contains(next)) return;
            magnifiedFields.forEach(entry => {
                if (entry.field.contains(event.target) && !entry.field.contains(next)) collapseField(entry);
            });
        }, { signal });
        filterModeMenu.menu.addEventListener('toggle', event => {
            if (event.newState === 'closed') setTimeout(collapseUnfocused);
        }, { signal });
        thead.appendChild(filterRowElement);

        const modeMenu = filterModeMenu.menu;
        modeMenu.addEventListener('toggle', event => {
            if (event.newState === 'closed') filterModeMenu.menuClosedAt = Date.now();
        }, { signal });
        modeMenu.addEventListener('click', event => {
            const item = event.target.closest('[data-vgrid-filter-mode-key]');
            if (!item) return;
            modeMenu.hidePopover();
            selectFilterMode(filterModeMenu.column, item.dataset.vgridFilterModeKey);
        }, { signal });
        modeMenu.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                modeMenu.hidePopover();
                filterModeMenu.menuOwner?.focus();
                return;
            }
            const items = [...modeMenu.children];
            if (!items.length) return;
            const at = items.indexOf(document.activeElement);
            const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
            if (step) items[(at + step + items.length) % items.length].focus();
            else if (event.key === 'Home') items[0].focus();
            else if (event.key === 'End') items[items.length - 1].focus();
            else return;
            event.preventDefault();
        }, { signal });
        window.addEventListener('resize', () => resizePanelMenu(filterModeMenu), { signal });
        window.addEventListener('scroll', event => {
            if (event.target === modeMenu) return;
            trackPanelMenu(filterModeMenu);
        }, { signal, capture: true });
    }

    const tbody = document.createElement('tbody');
    if (cellSelectionActive) {
        element.setAttribute('role', 'grid');
        element.setAttribute('aria-multiselectable', 'true');
    }
    let loadingIndicator, loadingBadge, loadingSpinner, loadingText, loadingShowTimer;

    const isSafeHref = (href) => {
        if (!href || typeof href !== 'string') return false;
        if (href.startsWith('/')) return href[1] !== '/' && href[1] !== '\\';
        try {
            const url = new URL(href, window.location.origin);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const SUBGRID_CLOSED = '\uFF0B';
    const SUBGRID_OPEN = '\uFF0D';
    const SUBGRID_MENU = '\u22EE';

    const panelValue = (panel, row) => {
        const value = row?.[panel.id];
        return value === undefined || value === null ? '' : String(value);
    };

    const panelFilterParams = panel => Object.entries(panel.externalFilters || {})
        .map(([name, selector]) => {
            const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
            if (!element) {
                console.error(`vGrid: subgrid panel "${panel.name}" external filter for "${name}" was not found.`);
                return null;
            }
            const value = element.value ?? '';
            return value === '' ? null : `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
        })
        .filter(Boolean);

    const mergeQuery = (url, base) => {
        const cut = url.indexOf('?');
        const own = new URLSearchParams(cut < 0 ? '' : url.slice(cut + 1));
        const merged = new URLSearchParams(base);
        new Set(own.keys()).forEach(key => merged.delete(key));
        own.forEach((value, key) => merged.append(key, value));
        const query = merged.toString();
        return `${cut < 0 ? url : url.slice(0, cut)}${query ? `?${query}` : ''}`;
    };

    const inheritQuery = url => {
        if (inheritQueryString !== true) return url;
        const inherited = new URLSearchParams(window.location.search);
        inheritedSelectionParams().forEach(key => inherited.delete(key));
        return mergeQuery(url, inherited.toString());
    };

    const panelUrl = (panel, value, withFilters = true) => {
        const encoded = encodeURIComponent(value);
        const base = panel.idInPath
            ? `${panel.dataSource.replace(/\/+$/, '')}/${encoded}`
            : `${panel.dataSource}${panel.dataSource.includes('?') ? '&' : '?'}id=${encoded}`;
        const params = withFilters ? panelFilterParams(panel) : [];
        const url = params.length ? `${base}${base.includes('?') ? '&' : '?'}${params.join('&')}` : base;
        const cut = url.indexOf('?');
        const query = new URLSearchParams(cut < 0 ? '' : url.slice(cut + 1));
        query.set('lang', gridLocale);
        return `${cut < 0 ? url : url.slice(0, cut)}?${query}`;
    };

    const createToggle = (sub, panelCount = 1) => {
        const markupNode = () => {
            if (!sub.toggleMarkup) return null;
            const template = document.createElement('template');
            template.innerHTML = String(sub.toggleMarkup).trim();
            const node = template.content.firstElementChild;
            if (!node) return null;
            node.setAttribute('role', 'button');
            node.tabIndex = 0;
            return node;
        };
        const toggleClasses = partClass('toggle-subgrid', partClass(`toggle-subgrid-${sub.order + 1}`)).split(' ');
        const opensMenu = panelCount > 1;
        const toggle = markupNode() || makeButton({ textContent: opensMenu ? SUBGRID_MENU : SUBGRID_CLOSED });
        toggle.classList.add(...toggleClasses);
        toggle.dataset.vgridToggle = String(sub.order);
        if (opensMenu) {
            toggle.dataset.vgridMenu = '1';
            toggle.setAttribute('aria-haspopup', 'menu');
        }
        return toggle;
    };

    const panelNotice = (kind, text) => make('div', { className: partClass(`panel-${kind}`) },
        ...(kind === 'loading' ? [make('span', { className: 'vgrid-spinner', attrs: { 'aria-hidden': 'true' } })] : []), text);

    const failureReason = error => {
        const message = String(error?.message || '').trim();
        if (/^\d{3}$/.test(message)) return `the server answered ${message}`;
        return message ? message.charAt(0).toLowerCase() + message.slice(1) : 'the response could not be read';
    };

    const panelLabel = panel => panel?.label || panel?.name || 'details';

    const setToggleState = (sub, toggle, open, panel) => {
        if (!sub.toggleMarkup) toggle.textContent = toggle.dataset.vgridMenu ? SUBGRID_MENU : open ? SUBGRID_OPEN : SUBGRID_CLOSED;
        const label = panelLabel(panel || (toggle.dataset.vgridPanel ? { label: toggle.dataset.vgridPanel } : null));
        const accessibleLabel = toggle.dataset.vgridMenu ? 'Choose what to show' : `${open ? 'Hide' : 'Show'} ${label}`;
        toggle.title = open ? `Showing ${label}` : toggle.dataset.vgridMenu ? 'Choose what to show' : `Show ${label}`;
        toggle.setAttribute('aria-label', accessibleLabel);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    const panelCaption = panel => {
        const caption = panel?.caption;
        return caption === false || caption === undefined || caption === null ? '' : String(caption).trim();
    };

    const fillPanel = (body, panel, row, entry) => {
        entry.instance?.destroy();
        entry.instance = null;
        entry.fetchAbort?.abort();
        entry.fetchAbort = null;
        const token = entry.token = (entry.token || 0) + 1;
        entry.ready = false;
        const ready = () => {
            if (entry.token !== token) return;
            entry.ready = true;
            syncPanelHeight(entry);
        };
        const caption = panelCaption(panel);
        const content = make('div');
        const captionText = make('span', { className: partClass('subgrid-title') });
        if (caption) captionText.innerHTML = caption;
        body.replaceChildren(make('div', { className: partClass('subgrid-caption') }, captionText, entry.close), content);
        const value = panelValue(panel, row);
        if (value === '') {
            content.textContent = `No "${panel.id}" value on this row.`;
            ready();
            return;
        }
        if (panel.type === 'grid') {
            const host = make('div', { hidden: true });
            const loading = panelNotice('loading', 'Loading\u2026');
            content.replaceChildren(loading, host);
            entry.instance = vGrid({
                el: host,
                columns: panel.columns || [],
                dataSource: inheritQuery(panelUrl(panel, value, false)),
                method: panel.method || 'GET',
                headers: panel.headers || {},
                rowsPerPage: panel.rowsPerPage ?? 10,
                rowNumbers: panel.rowNumbers ?? rowNumbers,
                rowNumbersType: panel.rowNumbersType || rowNumbersType,
                externalFilters: panel.externalFilters || {},
                borders: panel.borders || borderPreset,
                size: panel.size || 'medium',
                striped: panel.striped ?? striped,
                hover: panel.hover ?? hover,
                easing: panel.easing ?? easingMs,
                reorderColumns: panel.reorderColumns ?? reorderColumns,
                reorderDelay: panel.reorderDelay ?? reorderDelayMs,
                namespace: namePrefix,
                locale: gridLocale || undefined,
                settings: false,
                actions: false,
                onReady: () => {
                    if (entry.token !== token) return;
                    loading.remove();
                    host.hidden = false;
                    ready();
                },
            });
            if (!entry.instance) {
                content.replaceChildren(panelNotice('error', `${panelLabel(panel)} could not be loaded: the panel grid configuration is invalid.`));
                ready();
            }
            return;
        }
        content.replaceChildren(panelNotice('loading', 'Loading\u2026'));
        const url = inheritQuery(panelUrl(panel, value));
        const fetchAbort = entry.fetchAbort = new AbortController();
        fetch(url, { signal: fetchAbort.signal, method: panel.method || 'GET', headers: requestHeaders(url, panel.headers) })
            .then(response => { if (!response.ok) throw new Error(String(response.status)); return response.text(); })
            .then(text => {
                if (!content.isConnected || entry.token !== token) return;
                if (!String(text).trim()) {
                    content.replaceChildren(panelNotice('empty', `Nothing to show here for ${panelLabel(panel)}.`));
                } else if (panel.type === 'html') {
                    content.innerHTML = text;
                } else {
                    content.replaceChildren(make('pre', { className: partClass('panel-text'), textContent: text }));
                }
                ready();
            })
            .catch(error => {
                if (error.name === 'AbortError' || !content.isConnected || entry.token !== token) return;
                content.replaceChildren(panelNotice('error', `${panelLabel(panel)} could not be loaded: ${failureReason(error)}.`));
                console.error('vGrid panel error:', panel?.name, error);
                ready();
            });
    };

    const panelRowsOf = tr => {
        const rows = [];
        let next = tr.nextElementSibling;
        while (next && next.dataset.vgridSubgrid) {
            rows.push(next);
            next = next.nextElementSibling;
        }
        return rows;
    };

    const syncPanelHeight = entry => {
        if (!entry.ready || entry.state !== 'open' || !entry.panelRow.isConnected) return;
        entry.slide.style.height = `${entry.clip.offsetHeight}px`;
    };

    const releasePanel = entry => {
        entry.observer?.disconnect();
        entry.observer = null;
        entry.instance?.destroy();
        entry.instance = null;
        entry.fetchAbort?.abort();
        entry.fetchAbort = null;
        entry.panelRow.remove();
        updateTableRowMetadata();
    };

    const closePanel = (sub, tr) => {
        const entry = sub.entries.get(tr);
        if (!entry) return;
        sub.entries.delete(tr);
        setToggleState(sub, entry.toggle, false);
        entry.state = 'closing';
        entry.observer?.disconnect();
        entry.observer = null;
        entry.fetchAbort?.abort();
        entry.fetchAbort = null;
        entry.token = (entry.token || 0) + 1;
        const current = entry.slide.offsetHeight;
        if (!entry.panelRow.isConnected || !current) {
            releasePanel(entry);
            return;
        }
        let settled = false;
        let timer = null;
        const finish = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            entry.slide.removeEventListener('transitionend', onEnd);
            releasePanel(entry);
        };
        const onEnd = event => {
            if (event.target === entry.slide && event.propertyName === 'height') finish();
        };
        entry.slide.addEventListener('transitionend', onEnd, { signal });
        timer = setTimeout(finish, easingMs + 150);
        entry.slide.style.height = `${current}px`;
        void entry.slide.offsetHeight;
        entry.slide.style.height = '0px';
    };

    const showPanelContent = (sub, entry, panel, row) => {
        entry.panel = panel;
        fillPanel(entry.body, panel, row, entry);
        setToggleState(sub, entry.toggle, true, panel);
    };

    const openPanel = (sub, tr, row, toggle, panel) => {
        const body = make('div', { className: partClass('subgrid-body') });
        const clip = make('div', { className: partClass('subgrid-clip') }, body);
        const slide = make('div', { className: partClass('subgrid-slide') }, clip);
        slide.style.height = '0px';
        const close = makeButton({ className: partClass('subgrid-close'), textContent: '\u00D7', title: 'Close', attrs: { 'aria-label': 'Close' }, data: { vgridClose: '1' } });
        const panelRow = make('tr', { data: { vgridSubgrid: '1' } }, make('td', { colSpan: totalCols, className: partClass('subgrid-cell') }, slide));
        const entry = { panelRow, toggle, body, slide, clip, close, state: 'opening', ready: false, observer: null, frame: 0, instance: null, fetchAbort: null, panel: null };
        sub.entries.set(tr, entry);
        panelOwners.set(panelRow, { sub, tr });
        const attached = panelRowsOf(tr);
        (attached[attached.length - 1] || tr).after(panelRow);
        updateTableRowMetadata();
        slide.style.height = '0px';
        showPanelContent(sub, entry, panel, row);
        entry.observer = new ResizeObserver(() => {
            if (entry.frame) return;
            entry.frame = requestAnimationFrame(() => {
                entry.frame = 0;
                syncPanelHeight(entry);
            });
        });
        entry.observer.observe(clip);
        void slide.offsetHeight;
        entry.state = 'open';
        slide.style.height = `${clip.offsetHeight}px`;
    };

    const selectPanel = (sub, tr, row, toggle, panel) => {
        const entry = sub.entries.get(tr);
        if (entry && entry.panel === panel) { closePanel(sub, tr); return; }
        if (entry) { showPanelContent(sub, entry, panel, row); return; }
        subgrids.forEach(other => {
            if (other === sub) return;
            if (sub.single) Array.from(other.entries.keys()).forEach(openRow => closePanel(other, openRow));
            else closePanel(other, tr);
        });
        if (sub.single) Array.from(sub.entries.keys()).forEach(openRow => closePanel(sub, openRow));
        openPanel(sub, tr, row, toggle, panel);
    };

    const hidePanelMenus = () => {
        subgrids.forEach(sub => { if (sub.menu.matches(':popover-open')) sub.menu.hidePopover(); });
    };

    const panelMenuItem = (text, current, selectable = true) => {
        const item = makeButton({ className: partClass('panel-menu-item'), textContent: text, title: text, attrs: { role: selectable ? 'menuitemradio' : 'menuitem' } });
        if (selectable) item.setAttribute('aria-checked', current ? 'true' : 'false');
        return item;
    };

    const availablePanels = (sub, row) => sub.panels.filter(panel => panelValue(panel, row) !== '');

    const MENU_GAP = 2;
    const MENU_MIN_HEIGHT = 120;
    const menuAnchored = sub => {
        const toggle = sub.menuOwner;
        return toggle?.isConnected && sub.menu.matches(':popover-open') ? toggle : null;
    };
    const measurePanelMenu = sub => {
        const toggle = menuAnchored(sub);
        if (!toggle) return;
        const rect = toggle.getBoundingClientRect();
        const limit = window.innerHeight - MENU_GAP * 2;
        const anchorTop = Math.min(Math.max(rect.top, 0), window.innerHeight);
        const anchorBottom = Math.min(Math.max(rect.bottom, 0), window.innerHeight);
        const spaceBelow = window.innerHeight - anchorBottom - MENU_GAP * 2;
        const spaceAbove = anchorTop - MENU_GAP * 2;
        sub.menu.style.maxHeight = '';
        const wanted = sub.menu.scrollHeight;
        sub.menuAbove = wanted > spaceBelow && spaceAbove > spaceBelow;
        sub.menu.style.maxHeight = `${Math.min(limit, Math.max(MENU_MIN_HEIGHT, sub.menuAbove ? spaceAbove : spaceBelow))}px`;
    };
    const placePanelMenu = sub => {
        const toggle = menuAnchored(sub);
        if (!toggle) return;
        const rect = toggle.getBoundingClientRect();
        const height = sub.menu.offsetHeight;
        const width = sub.menu.offsetWidth;
        const top = sub.menuAbove ? rect.top - MENU_GAP - height : rect.bottom + MENU_GAP;
        const preferred = rect.left + width > window.innerWidth - MENU_GAP ? rect.right - width : rect.left;
        sub.menu.style.top = `${Math.max(MENU_GAP, Math.min(top, window.innerHeight - height - MENU_GAP))}px`;
        sub.menu.style.left = `${Math.max(MENU_GAP, Math.min(preferred, window.innerWidth - width - MENU_GAP))}px`;
    };
    const trackPanelMenu = sub => {
        if (sub.menuFrame) return;
        sub.menuFrame = requestAnimationFrame(() => {
            sub.menuFrame = 0;
            placePanelMenu(sub);
        });
    };
    const resizePanelMenu = sub => {
        measurePanelMenu(sub);
        placePanelMenu(sub);
    };

    const showPanelMenu = (sub, tr, row, toggle) => {
        const available = availablePanels(sub, row);
        if (!available.length) return;
        const entry = sub.entries.get(tr);
        sub.menu.replaceChildren();
        let focusItem = null;
        available.forEach(panel => {
            const current = entry?.panel === panel;
            const item = panelMenuItem(panelLabel(panel), current);
            item.dataset.vgridMenuItem = String(sub.panels.indexOf(panel));
            if (current || (!focusItem && !entry && panel === sub.defaultPanel)) focusItem = item;
            sub.menu.appendChild(item);
        });
        if (entry) {
            const hide = panelMenuItem('Hide', false, false);
            hide.dataset.vgridMenuItem = 'hide';
            sub.menu.appendChild(hide);
        }
        sub.menuOwner = toggle;
        sub.menuRow = tr;
        sub.menu.style.maxHeight = '';
        sub.menu.showPopover();
        resizePanelMenu(sub);
        (focusItem || sub.menu.firstElementChild)?.focus();
    };

    subgrids.forEach(sub => {
        sub.menu.setAttribute('popover', '');
        sub.menu.setAttribute('role', 'menu');
        sub.menu.className = partClass('panel-menu', partClass(`panel-menu-${sub.order + 1}`));
        sub.menu.addEventListener('toggle', event => {
            if (event.newState === 'closed') sub.menuClosedAt = Date.now();
        }, { signal });
        sub.menu.addEventListener('click', event => {
            const item = event.target.closest('[data-vgrid-menu-item]');
            if (!item) return;
            hidePanelMenus();
            const tr = sub.menuRow;
            if (!tr?.isConnected) return;
            if (item.dataset.vgridMenuItem === 'hide') { closePanel(sub, tr); return; }
            const panel = sub.panels[parseInt(item.dataset.vgridMenuItem)];
            if (panel) selectPanel(sub, tr, rowData.get(tr), sub.menuOwner, panel);
        }, { signal });
        window.addEventListener('resize', () => resizePanelMenu(sub), { signal });
        window.addEventListener('scroll', event => {
            if (event.target === sub.menu) return;
            trackPanelMenu(sub);
        }, { signal, capture: true });
        sub.menu.addEventListener('keydown', event => {
            const items = [...sub.menu.children];
            if (!items.length) return;
            const at = items.indexOf(document.activeElement);
            const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
            if (step) items[(at + step + items.length) % items.length].focus();
            else if (event.key === 'Home') items[0].focus();
            else if (event.key === 'End') items[items.length - 1].focus();
            else return;
            event.preventDefault();
        }, { signal });
    });

    const clearSubgrids = () => {
        hidePanelMenus();
        subgrids.forEach(sub => {
            sub.entries.forEach(entry => {
                entry.observer?.disconnect();
                entry.observer = null;
                entry.instance?.destroy();
                entry.instance = null;
                entry.fetchAbort?.abort();
                entry.fetchAbort = null;
            });
            sub.entries.clear();
            sub.menuOwner = null;
            sub.menuRow = null;
            sub.menu.replaceChildren();
        });
    };

    const rowOf = node => {
        const tr = node?.closest('tr');
        return tr && tr.parentNode === tbody ? tr : null;
    };

    const onPanelClick = target => {
        const close = target.closest('[data-vgrid-close]');
        if (close) {
            const owner = panelOwners.get(rowOf(close));
            if (owner) closePanel(owner.sub, owner.tr);
            return;
        }
        const toggle = target.closest('[data-vgrid-toggle]');
        const tr = toggle && rowOf(toggle);
        if (!tr) return;
        const sub = subgrids[parseInt(toggle.dataset.vgridToggle)];
        const row = rowData.get(tr);
        if (!sub || !row) return;
        if (sub.menuOwner === toggle && sub.menu.matches(':popover-open')) { hidePanelMenus(); return; }
        if (sub.menuOwner === toggle && Date.now() - sub.menuClosedAt < 200) return;
        const available = availablePanels(sub, row);
        if (available.length === 1) { selectPanel(sub, tr, row, toggle, available[0]); return; }
        showPanelMenu(sub, tr, row, toggle);
    };

    const rowTargetOf = target => {
        if (target.closest('button, a, input, select, textarea, [data-vgrid-toggle]')) return null;
        const tr = target.closest('tr.vgrid-row');
        const row = tr && rowData.get(tr);
        return row ? { tr, row } : null;
    };

    const htmlText = document.createElement('template');
    const cellText = (row, col, rendered = false) => {
        const value = row[col.name] ?? '';
        if (rendered) {
            const result = renderResult(row, col, value);
            if (typeof result === 'string') return result;
            if (result !== undefined) return result.textContent ?? '';
        }
        if (col.type === 'html') {
            htmlText.innerHTML = value;
            const text = htmlText.content.textContent;
            htmlText.innerHTML = '';
            return text;
        }
        if (col.type === 'enum') return String(col.options?.[value] ?? value);
        return String(value);
    };

    const rowNumberText = (row, index, offset) => rowKeyColumn
        ? String(row[rowKeyColumn.name] ?? '')
        : rowNumbersType === 'sequential'
        ? String(offset + index + 1)
        : String(row[rowNumbersType] ?? '');

    const emptyRow = () => {
        const td = make('td', { colSpan: totalCols }, make('span', { className: partClass('viewport'), textContent: 'No records to show.' }));
        trackColSpan(td);
        return make('tr', { className: partClass('empty'), data: { vgridEmpty: '1' } }, td);
    };

    const buildRows = (rows, offset = 0) => {
        clearSubgrids();
        tbody.replaceChildren();
        if (cellSelectionActive) {
            cellSelectionAnchor = null;
            cellSelectionFocus = null;
        }
        currentRows = rows;
        currentOffset = offset;
        if (!rows.length) {
            tbody.appendChild(emptyRow());
            checkSelectionFilters();
            syncSelection();
            return;
        }
        renderFailures.clear();
        let rowClassFailed = false;
        rows.forEach((row, index) => {
            const tr = make('tr', { className: partClass('row', row.id !== undefined && namePrefix ? `${namePrefix}-row-${row.id}` : '') });
            if (cellSelectionActive) tr.setAttribute('role', 'row');
            if ((onRowClick || onRowDblClick) && !cellSelectionActive) {
                tr.tabIndex = 0;
                tr.dataset.vgridClickable = '1';
            }
            if (rowClassOf) {
                try {
                    const extra = rowClassOf(row);
                    if (extra) tr.classList.add(...String(extra).split(/\s+/).filter(Boolean));
                } catch (error) {
                    if (!rowClassFailed) console.error(`vGrid: rowClass failed: ${error?.message || error}`);
                    rowClassFailed = true;
                }
            }
            if (index % 2 === 0) tr.dataset.vgridStripe = '1';
            rowData.set(tr, row);
            const cells = [];
            if (rowSelectionActive) {
                const box = make('input', { type: 'checkbox', data: { vgridSelectRow: '1' }, attrs: { 'aria-label': `Select ${rowActionDescription(row)} row` } });
                if (selectionKeyOf(row) === null) {
                    box.disabled = true;
                    reportMissingSelectionKey();
                } else box.checked = isRowSelected(row);
                cells.push(clipCell(make('td', { className: partClass('select') }, box)));
            }
            if (rowNumbers) cells.push(clipCell(make('td', { className: partClass('row-number'), textContent: rowNumberText(row, index, offset) })));
            activeColumns.forEach(col => {
                const td = make('td');
                const value = row[col.name] ?? '';
                const rendered = renderResult(row, col, value);
                const href = row[hrefFieldOf(col)];
                if (rendered !== undefined) {
                    if (typeof rendered === 'string') td.textContent = rendered;
                    else td.appendChild(rendered);
                } else if (col.type === 'link' && isSafeHref(href)) {
                    td.appendChild(make('a', { href, textContent: value }));
                } else if (col.type === 'html') {
                    td.innerHTML = value;
                } else if (col.type === 'enum') {
                    td.textContent = col.options?.[value] ?? value;
                } else {
                    td.textContent = value;
                }
                if (cellSelectionActive) {
                    const columnIndex = activeColumns.indexOf(col);
                    td.setAttribute('role', 'gridcell');
                    td.tabIndex = rows.length && index === 0 && columnIndex === 0 ? 0 : -1;
                    td.setAttribute('aria-selected', 'false');
                    td.dataset.vgridCellRow = String(index);
                    td.dataset.vgridCellColumn = String(columnIndex);
                }
                cells.push(clipCell(td));
            });
            if (rowReorderActive) {
                const dataIndex = !isRemote ? localData.indexOf(row) : offset + index;
                const canMove = !isRemote ? canReorderRows() : typeof onRowReorder === 'function';
                const up = makeButton({
                    textContent: '\u2191',
                    title: 'Move row earlier',
                    disabled: !canMove || dataIndex <= 0,
                    attrs: { 'aria-label': `Move ${rowActionDescription(row)} row earlier` },
                    data: { vgridRowReorder: 'up' },
                });
                const down = makeButton({
                    textContent: '\u2193',
                    title: 'Move row later',
                    disabled: !canMove || dataIndex < 0 || (isRemote
                        ? remoteTotal !== null && dataIndex >= remoteTotal - 1
                        : dataIndex >= localData.length - 1),
                    attrs: { 'aria-label': `Move ${rowActionDescription(row)} row later` },
                    data: { vgridRowReorder: 'down' },
                });
                cells.push(make('td', { className: partClass('row-reorder') }, up, down));
            }
            if (hasRowActions) {
                const td = make('td', { className: partClass('row-actions') });
                const definitions = typeof rowActions === 'function' ? rowActions(row) : rowActions;
                (Array.isArray(definitions) ? definitions : []).forEach(action => {
                    if (!action || typeof action !== 'object' || typeof action.onClick !== 'function') return;
                    if (action.name !== undefined && typeof action.name !== 'string') console.error('vGrid: rowActions[].name must be a string.');
                    const name = typeof action.name === 'string' && action.name.trim() ? action.name.trim() : String(action.label ?? 'action');
                    const button = makeButton({
                        textContent: String(action.label ?? 'Action'),
                        disabled: action.disabled === true,
                        attrs: { 'aria-label': String(action.ariaLabel ?? action.label ?? 'Action') },
                        data: { vgridRowAction: name },
                    });
                    rowActionHandlers.set(button, { row, action, name });
                    td.appendChild(button);
                });
                cells.push(td);
            }
            if (hasPanels) {
                placeToggleCells(cells, sub => {
                    const td = make('td');
                    const available = availablePanels(sub, row);
                    if (available.length) {
                        const toggle = createToggle(sub, available.length);
                        if (available.length === 1) toggle.dataset.vgridPanel = panelLabel(available[0]);
                        setToggleState(sub, toggle, false);
                        td.appendChild(toggle);
                    }
                    return td;
                });
            }
            if (cellSelectionActive) cells.forEach(cell => {
                if (cell.tagName !== 'TD') return;
                if (!cell.hasAttribute('role')) cell.setAttribute('role', 'gridcell');
                if (!cell.hasAttribute('aria-selected')) cell.setAttribute('aria-selected', 'false');
            });
            cells.forEach(cell => tr.appendChild(cell));
            tbody.appendChild(tr);
        });
        checkSelectionFilters();
        syncSelection();
        growFitColumns();
    };

    const rowActionDescription = row => {
        const column = rowKeyColumn || activeColumns[0];
        const value = column ? row?.[column.name] : '';
        return value === undefined || value === null || value === '' ? 'this' : String(value);
    };

    const hasActiveSort = () => sortCriteria.some(sort => activeColumns.some(column => column.name === sort.column));
    const canReorderRows = () => !isRemote && !hasActiveSort() && activeFilterValues().length === 0
        && externalFilterInputs.every(({ element }) => !element.value);

    let cellSelectionAnchor = null;
    let cellSelectionFocus = null;
    const ownCells = () => tbody.querySelectorAll(':scope > tr > [data-vgrid-cell-row]');
    const ownCell = target => {
        const cell = target instanceof Element ? target.closest('[data-vgrid-cell-row]') : null;
        return cell && cell.parentElement?.parentElement === tbody ? cell : null;
    };
    const visibleCell = (rowIndex, columnIndex) => tbody.querySelector(`:scope > tr > [data-vgrid-cell-row="${rowIndex}"][data-vgrid-cell-column="${columnIndex}"]`);
    const updateCellSelection = () => {
        if (!cellSelectionAnchor || !cellSelectionFocus) return;
        const rowStart = Math.min(cellSelectionAnchor.row, cellSelectionFocus.row);
        const rowEnd = Math.max(cellSelectionAnchor.row, cellSelectionFocus.row);
        const colStart = Math.min(cellSelectionAnchor.column, cellSelectionFocus.column);
        const colEnd = Math.max(cellSelectionAnchor.column, cellSelectionFocus.column);
        const focused = visibleCell(cellSelectionFocus.row, cellSelectionFocus.column);
        ownCells().forEach(cell => {
            const row = Number(cell.dataset.vgridCellRow);
            const column = Number(cell.dataset.vgridCellColumn);
            cell.setAttribute('aria-selected', String(row >= rowStart && row <= rowEnd && column >= colStart && column <= colEnd));
            cell.tabIndex = cell === focused ? 0 : -1;
        });
    };
    const selectCell = (cell, extend = false) => {
        const point = { row: Number(cell.dataset.vgridCellRow), column: Number(cell.dataset.vgridCellColumn) };
        if (!extend || !cellSelectionAnchor) cellSelectionAnchor = point;
        cellSelectionFocus = point;
        updateCellSelection();
        cell.focus();
    };
    if (cellSelectionActive) {
        tbody.addEventListener('focusin', event => {
            const cell = ownCell(event.target);
            if (!cell) return;
            if (!cellSelectionFocus || visibleCell(cellSelectionFocus.row, cellSelectionFocus.column) !== cell) {
                cellSelectionAnchor = { row: Number(cell.dataset.vgridCellRow), column: Number(cell.dataset.vgridCellColumn) };
                cellSelectionFocus = cellSelectionAnchor;
                updateCellSelection();
            }
        }, { signal });
        element.addEventListener('copy', event => {
            if (!cellSelectionFocus || !event.clipboardData || !ownCell(document.activeElement)) return;
            const rowStart = Math.min(cellSelectionAnchor.row, cellSelectionFocus.row);
            const rowEnd = Math.max(cellSelectionAnchor.row, cellSelectionFocus.row);
            const colStart = Math.min(cellSelectionAnchor.column, cellSelectionFocus.column);
            const colEnd = Math.max(cellSelectionAnchor.column, cellSelectionFocus.column);
            const text = Array.from({ length: rowEnd - rowStart + 1 }, (_, row) =>
                Array.from({ length: colEnd - colStart + 1 }, (_, column) => visibleCell(rowStart + row, colStart + column)?.textContent.trim() ?? '').join('\t')
            ).join('\n');
            event.clipboardData.setData('text/plain', text);
            event.preventDefault();
        }, { signal });
    }

    const moveRow = reorderButton => {
        const tr = reorderButton.closest('tr.vgrid-row');
        const row = tr && rowData.get(tr);
        const direction = reorderButton.dataset.vgridRowReorder === 'up' ? -1 : 1;
        const displayedIndex = currentRows.indexOf(row);
        if (!row || displayedIndex < 0) return;
        const from = isRemote ? currentOffset + displayedIndex : localData.indexOf(row);
        const to = from + direction;
        if (isRemote) {
            if (typeof onRowReorder !== 'function') return;
            onRowReorder({ row, from, to, rows: currentRows.slice() });
            announceResultCount(`Requested row move from position ${from + 1} to ${to + 1}.`);
            return;
        }
        if (!canReorderRows() || to < 0 || to >= localData.length) return;
        localData.splice(from, 1);
        localData.splice(to, 0, row);
        render();
        const movedRow = [...tbody.querySelectorAll('tr.vgrid-row')].find(candidate => rowData.get(candidate) === row);
        const focusButton = movedRow?.querySelector(`[data-vgrid-row-reorder="${direction < 0 ? 'up' : 'down'}"]`)
            || tbody.querySelector('[data-vgrid-row-reorder]');
        focusButton?.focus();
        announceResultCount(`Moved row from position ${from + 1} to ${to + 1}.`);
    };

    tbody.addEventListener('click', event => {
        const { target } = event;
        if (hasPanels) onPanelClick(target);
        if (cellSelectionActive && !target.closest('a, button, input, select')) {
            const cell = ownCell(target);
            if (cell) selectCell(cell);
        }
        const reorderButton = target.closest('[data-vgrid-row-reorder]');
        if (reorderButton) {
            event.preventDefault();
            event.stopPropagation();
            moveRow(reorderButton);
            return;
        }
        const actionButton = target.closest('[data-vgrid-row-action]');
        if (actionButton) {
            const handler = rowActionHandlers.get(actionButton);
            if (handler) handler.action.onClick({ row: handler.row, event, grid: instance, name: handler.name });
            return;
        }
        const hit = rowTargetOf(target);
        if (hit) onRowClick?.({ row: hit.row, event });
    }, { signal });
    tbody.addEventListener('dblclick', event => {
        const hit = rowTargetOf(event.target);
        if (hit) onRowDblClick?.({ row: hit.row, event });
    }, { signal });
    tbody.addEventListener('keydown', event => {
        const { key, target } = event;
        if (hasPanels && (key === 'Enter' || key === ' ')) {
            const toggle = target.closest('[data-vgrid-toggle]');
            if (toggle && toggle.tagName !== 'BUTTON' && rowOf(toggle)) {
                event.preventDefault();
                toggle.click();
            }
        }
        if (cellSelectionActive) {
            const cell = ownCell(target);
            const delta = cell && !target.closest('input, select, textarea, [contenteditable]')
                ? { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[key]
                : null;
            const next = delta && visibleCell(Number(cell.dataset.vgridCellRow) + delta[0], Number(cell.dataset.vgridCellColumn) + delta[1]);
            if (next) {
                event.preventDefault();
                selectCell(next, event.shiftKey);
                if (event.shiftKey) {
                    const rows = Math.abs(cellSelectionFocus.row - cellSelectionAnchor.row) + 1;
                    const columns = Math.abs(cellSelectionFocus.column - cellSelectionAnchor.column) + 1;
                    announceResultCount(`Selected ${rows} row${rows === 1 ? '' : 's'} by ${columns} column${columns === 1 ? '' : 's'}.`);
                }
                return;
            }
        }
        if (key !== 'Enter' && key !== ' ') return;
        const hit = rowTargetOf(target);
        if (!hit || (!cellSelectionActive && target !== hit.tr) || (cellSelectionActive && !target.closest('[data-vgrid-cell-row]'))) return;
        if (key === 'Enter' && event.shiftKey && onRowDblClick) {
            event.preventDefault();
            onRowDblClick({ row: hit.row, event });
        } else if (onRowClick) {
            event.preventDefault();
            onRowClick({ row: hit.row, event });
        }
    }, { signal });

    updateTableRowMetadata = () => {
        if (destroyed) return;
        const headRows = Array.from(thead.rows).filter(row => row.getAttribute('role') !== 'presentation');
        const bodyRows = Array.from(tbody.rows).filter(row => row.getAttribute('role') !== 'presentation' && !row.dataset.vgridLoadingSpace);
        const dataRows = bodyRows.filter(row => row.classList.contains(partClass('row')));
        const detailRows = bodyRows.filter(row => row.dataset.vgridSubgrid);
        const emptyRows = bodyRows.filter(row => row.dataset.vgridEmpty);
        const { partial, total, offset } = tableRowMetadata;

        if (!partial) {
            element.removeAttribute('aria-rowcount');
            [...headRows, ...bodyRows].forEach(row => row.removeAttribute('aria-rowindex'));
            return;
        }

        if (total === -1) element.setAttribute('aria-rowcount', '-1');
        else if (Number.isInteger(total) && total >= 0) element.setAttribute('aria-rowcount', String(headRows.length + total + detailRows.length + emptyRows.length));
        else element.removeAttribute('aria-rowcount');

        if (!Number.isInteger(offset) || offset < 0 || (total !== -1 && (!Number.isInteger(total) || total < 0 || offset + dataRows.length > total))) {
            [...headRows, ...bodyRows].forEach(row => row.removeAttribute('aria-rowindex'));
            return;
        }

        headRows.forEach((row, index) => row.setAttribute('aria-rowindex', String(index + 1)));
        let rowIndex = headRows.length + offset + 1;
        bodyRows.forEach(row => row.setAttribute('aria-rowindex', String(rowIndex++)));
    };

    const selection = { all: false, picked: new Map(), excluded: new Map(), offerOpen: false, filters: '' };
    let localMatchingCount = null;
    let missingSelectionKeyReported = false;
    const reportMissingSelectionKey = () => {
        if (missingSelectionKeyReported) return;
        missingSelectionKeyReported = true;
        console.error(`vGrid: rowSelection key "${selectionKey}" is missing on some rows. Those rows cannot be selected.`);
    };
    const selectionKeyOf = row => {
        const value = row?.[selectionKey];
        return value === undefined || value === null || value === '' ? null : String(value);
    };
    const isRowSelected = row => {
        const key = selectionKeyOf(row);
        if (key === null) return false;
        return selection.all ? !selection.excluded.has(key) : selection.picked.has(key);
    };
    const selectionTotal = () => isRemote ? remoteTotal : localMatchingCount;
    const hasSelection = () => selection.all || selection.picked.size > 0;
    const selectionState = () => ({ selected: [...selection.picked.values()], all: selection.all, excluded: [...selection.excluded.values()] });
    const selectionParams = () => {
        if (!rowSelectionActive) return {};
        if (selection.all) return selection.excluded.size ? { selected: 'all', excluded: [...selection.excluded.keys()].join(',') } : { selected: 'all' };
        return selection.picked.size ? { selected: [...selection.picked.keys()].join(',') } : {};
    };
    const filterSignature = () => JSON.stringify(Object.entries(requestFilters()).sort(([a], [b]) => a.localeCompare(b)));
    const notifySelection = () => {
        if (typeof onRowSelect === 'function') onRowSelect(selectionState());
    };
    const pageSelectableRows = () => currentRows.filter(row => selectionKeyOf(row) !== null);
    const clearSelectionState = () => {
        selection.all = false;
        selection.picked.clear();
        selection.excluded.clear();
        selection.offerOpen = false;
    };
    const selectAllMatching = () => {
        selection.all = true;
        selection.picked.clear();
        selection.excluded.clear();
        selection.filters = filterSignature();
        selection.offerOpen = true;
    };
    const setRowSelected = (row, selected) => {
        const key = selectionKeyOf(row);
        if (key === null) return;
        const value = row[selectionKey];
        if (singleSelection) {
            selection.picked.clear();
            if (selected) selection.picked.set(key, value);
        } else if (selection.all) {
            if (selected) selection.excluded.delete(key);
            else selection.excluded.set(key, value);
        } else if (selected) selection.picked.set(key, value);
        else selection.picked.delete(key);
    };
    const togglePageSelection = () => {
        const rows = pageSelectableRows();
        if (selection.all) clearSelectionState();
        else if (rows.length && rows.every(isRowSelected)) rows.forEach(row => setRowSelected(row, false));
        else rows.forEach(row => setRowSelected(row, true));
        selection.offerOpen = hasSelection();
    };
    const checkSelectionFilters = () => {
        if (!rowSelectionActive || !selection.all || selection.filters === filterSignature()) return;
        clearSelectionState();
        announceResultCount('The filters changed, so the selection was cleared.');
        notifySelection();
    };

    const selectionOfferRow = rowSelectionActive && !singleSelection ? spanningRow('selection') : null;
    const selectionOfferCell = selectionOfferRow?.firstChild ?? null;
    if (selectionOfferRow) {
        selectionOfferRow.hidden = true;
        thead.appendChild(selectionOfferRow);
    }
    const selectionOfferButton = (label, action, part) => makeButton({ className: partClass(part), textContent: label, data: { vgridSelectionAction: action } });
    const selectionOfferText = () => {
        const total = selectionTotal();
        if (selection.all) {
            const except = selection.excluded.size ? `, except ${selection.excluded.size}` : '';
            return total === null ? `All matching rows are selected${except}.` : `All ${total} ${total === 1 ? 'row is' : 'rows are'} selected${except}.`;
        }
        const rows = pageSelectableRows();
        const onPage = rows.filter(isRowSelected).length;
        const lead = onPage && onPage === rows.length
            ? rows.length === 1 ? 'The 1 row on this page is selected' : `All ${rows.length} rows on this page are selected`
            : onPage ? `${onPage} of ${rows.length} rows on this page are selected` : 'No rows on this page are selected';
        return `${lead}${selection.picked.size > onPage ? ` (${selection.picked.size} in total)` : ''}.`;
    };
    const renderSelectionOffer = () => {
        if (!selectionOfferRow) return;
        if (!hasSelection()) selection.offerOpen = false;
        selectionOfferRow.hidden = !selection.offerOpen;
        if (!selection.offerOpen) {
            selectionOfferCell.replaceChildren();
            return;
        }
        const focused = selectionOfferCell.contains(document.activeElement) ? document.activeElement.dataset.vgridSelectionAction : null;
        const bar = make('div', { className: partClass('selection-bar') }, make('span', { className: partClass('selection-text'), textContent: selectionOfferText() }));
        const total = selectionTotal();
        if (selection.all) bar.appendChild(selectionOfferButton('Clear selection', 'clear', 'selection-action'));
        else if (total === null || pageSelectableRows().length < total) {
            bar.appendChild(selectionOfferButton(total === null ? 'Select all matching rows' : `Select all ${total} rows`, 'all', 'selection-action'));
        }
        const close = selectionOfferButton('×', 'hide', 'selection-close');
        close.title = 'Hide this message';
        close.setAttribute('aria-label', 'Hide this message');
        bar.appendChild(close);
        selectionOfferCell.replaceChildren(bar);
        if (focused) selectionOfferCell.querySelector(`[data-vgrid-selection-action="${focused}"]`)?.focus();
    };

    syncSelection = () => {
        if (!rowSelectionActive || destroyed) return;
        tbody.querySelectorAll(':scope > tr > td > input[data-vgrid-select-row]').forEach(box => {
            const tr = box.closest('tr');
            const selected = !box.disabled && isRowSelected(rowData.get(tr));
            box.checked = selected;
            tr.classList.toggle('vgrid-row-selected', selected);
        });
        if (selectAllBox) {
            const rows = pageSelectableRows();
            const onPage = rows.filter(isRowSelected).length;
            selectAllBox.disabled = !rows.length && !selection.all;
            if (selection.all) {
                selectAllBox.checked = selection.excluded.size === 0;
                selectAllBox.indeterminate = selection.excluded.size > 0;
            } else {
                selectAllBox.checked = rows.length > 0 && onPage === rows.length;
                selectAllBox.indeterminate = onPage > 0 && onPage < rows.length;
            }
            selectAllBox.setAttribute('aria-label', selection.all ? 'Clear the selection' : selectAllBox.checked ? 'Unselect the rows on this page' : 'Select the rows on this page');
        }
        renderSelectionOffer();
    };

    if (rowSelectionActive) {
        tbody.addEventListener('change', event => {
            const box = event.target;
            if (!box.matches?.('input[data-vgrid-select-row]') || box.closest('tbody') !== tbody) return;
            const row = rowData.get(box.closest('tr'));
            if (!row) return;
            setRowSelected(row, box.checked);
            syncSelection();
            notifySelection();
        }, { signal });
        headerRow.addEventListener('change', event => {
            if (!selectAllBox || event.target !== selectAllBox) return;
            togglePageSelection();
            syncSelection();
            announceResultCount(hasSelection() ? selectionOfferText() : 'Selection cleared.');
            notifySelection();
        }, { signal });
        selectionOfferRow?.addEventListener('click', event => {
            const action = event.target.closest('[data-vgrid-selection-action]')?.dataset.vgridSelectionAction;
            if (action === 'all') {
                selectAllMatching();
                syncSelection();
                announceResultCount(selectionOfferText());
                notifySelection();
                selectionOfferCell.querySelector('[data-vgrid-selection-action="clear"]')?.focus();
            } else if (action === 'clear') {
                clearSelectionState();
                syncSelection();
                announceResultCount('Selection cleared.');
                notifySelection();
                selectAllBox?.focus();
            } else if (action === 'hide') {
                selection.offerOpen = false;
                syncSelection();
                selectAllBox?.focus();
            }
        }, { signal });
    }

    const loadingSpacer = () => {
        const tr = spanningRow('loading-space');
        tr.dataset.vgridLoadingSpace = '1';
        return tr;
    };

    const dropLoadingSpacer = () => {
        Array.from(tbody.querySelectorAll('[data-vgrid-loading-space]')).forEach(tr => tr.remove());
    };

    const dimRows = dimmed => Array.from(tbody.rows).forEach(row => {
        if (dimmed && !row.dataset.vgridLoadingSpace) row.dataset.vgridDimmed = '1';
        else delete row.dataset.vgridDimmed;
    });

    const placeLoadingIndicator = () => {
        loadingIndicator.style.top = `${tbody.offsetTop}px`;
        loadingIndicator.style.height = `${Math.max(tbody.offsetHeight, 40)}px`;
        loadingIndicator.style.left = `${gridWrapper.scrollLeft}px`;
    };

    const showLoading = () => {
        if (!tbody.rows.length) tbody.appendChild(loadingSpacer());
        placeLoadingIndicator();
        dimRows(true);
        clearTimeout(loadingShowTimer);
        loadingShowTimer = setTimeout(() => {
            loadingBadge.classList.remove('vgrid-loading-error');
            loadingSpinner.hidden = false;
            loadingText.textContent = 'Loading…';
            loadingIndicator.setAttribute('aria-live', 'polite');
            loadingIndicator.hidden = false;
            placeLoadingIndicator();
        }, 200);
    };

    const hideLoading = () => {
        clearTimeout(loadingShowTimer);
        dropLoadingSpacer();
        dimRows(false);
        loadingIndicator.hidden = true;
    };

    if (rowsPerPage && (showPagination || showRowsPerPage)) tfoot.appendChild(makeBar());

    if (bottomActions) tfoot.appendChild(spanningRow('actions-row', make('div', { className: partClass('viewport') }, makeActions())));

    element.innerHTML = '';
    element.append(colgroup, thead, tbody);
    if ((rowsPerPage && (showPagination || showRowsPerPage)) || bottomActions) element.appendChild(tfoot);
    const gridWrapper = make('div', { className: 'vgrid-wrapper', data: { vgridBorders: borderPreset, vgridSize: currentSize } });
    if (striped !== false) gridWrapper.dataset.vgridStriped = '1';
    if (hover !== false) gridWrapper.dataset.vgridHover = '1';
    gridWrapper.style.setProperty('--vgrid-easing', `${easingMs}ms`);
    element.replaceWith(gridWrapper);
    gridWrapper.appendChild(element);
    if (sortInstructions) gridWrapper.appendChild(sortInstructions);
    gridWrapper.appendChild(settingsPanel);
    subgrids.forEach(sub => gridWrapper.appendChild(sub.menu));
    if (filterRowElement) gridWrapper.appendChild(filterModeMenu.menu);
    const resultStatus = make('span', { className: 'vgrid-visually-hidden', attrs: { role: 'status', 'aria-atomic': 'true' } });
    loadingSpinner = make('span', { className: 'vgrid-spinner', attrs: { 'aria-hidden': 'true' } });
    loadingText = make('span', { className: 'vgrid-loading-text' });
    loadingBadge = make('span', { className: 'vgrid-loading-badge' }, loadingSpinner, loadingText);
    loadingIndicator = make('output', { className: 'vgrid-loading', hidden: true, attrs: { 'aria-live': 'polite' } }, loadingBadge);
    gridWrapper.append(resultStatus, loadingIndicator);

    if (autoDestroy === true) {
        const destroyWhenDetached = () => { if (!gridWrapper.isConnected) instance.destroy(); };
        window.addEventListener('resize', destroyWhenDetached, { signal });
        window.addEventListener('scroll', destroyWhenDetached, { signal, capture: true });
    }

    let sortCriteria = (Array.isArray(sortBy) ? sortBy : sortBy ? [sortBy] : [])
        .filter(sort => sort && typeof sort.column === 'string' && activeColumns.some(column => column.name === sort.column && column.sort !== false))
        .map(sort => ({ column: sort.column, order: sort.order === 'desc' ? 'desc' : 'asc' }));
    let sortColIndex = sortCriteria.length ? activeColumns.findIndex(column => column.name === sortCriteria[0].column) : null;
    let sortOrder    = sortCriteria[0]?.order ?? null;
    let currentPage  = 1;
    let fetchAbort   = null;
    let filterTimer  = null;
    let resultStatusTimer = null;
    let resizeState  = null;
    let columnsFrozen = false;
    let freezePending = false;
    let columnFrame = 0;
    let frozenWidths = null;
    let displayedWidths = null;
    let widthGrowth = 0;
    const setViewportWidth = () => {
        const client = gridWrapper.clientWidth;
        if (!client) return;
        const contentLeft = gridWrapper.getBoundingClientRect().left + gridWrapper.clientLeft;
        const screen = document.documentElement.clientWidth || window.innerWidth;
        const start = Math.max(0, Math.min(client, -contentLeft));
        const end = screen ? Math.min(client, screen - contentLeft) : client;
        if (end <= start) return;
        const width = `${Math.floor(end - start)}px`;
        const offset = `${Math.floor(start)}px`;
        if (gridWrapper.style.getPropertyValue('--vgrid-viewport') !== width) gridWrapper.style.setProperty('--vgrid-viewport', width);
        if (gridWrapper.style.getPropertyValue('--vgrid-viewport-offset') !== offset) gridWrapper.style.setProperty('--vgrid-viewport-offset', offset);
    };
    const updateScrollRegion = () => {
        setViewportWidth();
        const scrolls = gridWrapper.scrollWidth > gridWrapper.clientWidth + 1;
        if (scrolls) {
            gridWrapper.tabIndex = 0;
            gridWrapper.setAttribute('role', 'region');
            gridWrapper.setAttribute('aria-label', `${accessibleCaptionText || 'Grid'}, scrolls sideways`);
        } else if (gridWrapper.hasAttribute('tabindex')) {
            gridWrapper.removeAttribute('tabindex');
            gridWrapper.removeAttribute('role');
            gridWrapper.removeAttribute('aria-label');
        }
    };
    const writeColumnWidths = () => {
        if (!columnsFrozen || !frozenWidths) return;
        const widths = frozenWidths;
        const flexIndexes = widths.map((width, i) => i).filter(i => !isFitCell(i));
        const toggleTotal = widths.reduce((sum, width, i) => sum + (isFitCell(i) ? width : 0), 0);
        const flexTotal = flexIndexes.reduce((sum, i) => sum + widths[i], 0);
        if (!flexTotal) return;
        element.style.minWidth = `${Math.round((toggleTotal + flexIndexes.length * MIN_COLUMN_WIDTH + widthGrowth) * 10) / 10}px`;
        const tableWidth = element.clientWidth;
        const available = tableWidth ? Math.max(0, tableWidth - toggleTotal) : flexTotal;
        const allocated = widths.map((width, i) => isFitCell(i) ? width : width / flexTotal * available);
        if (tableWidth) {
            const fixed = new Set();
            for (let pass = 0; pass < flexIndexes.length; pass++) {
                const short = flexIndexes.filter(i => !fixed.has(i) && allocated[i] < MIN_COLUMN_WIDTH);
                if (!short.length) break;
                short.forEach(i => { fixed.add(i); allocated[i] = MIN_COLUMN_WIDTH; });
                const free = flexIndexes.filter(i => !fixed.has(i));
                const freeTotal = free.reduce((sum, i) => sum + widths[i], 0);
                const remaining = Math.max(0, available - fixed.size * MIN_COLUMN_WIDTH);
                free.forEach(i => { allocated[i] = freeTotal ? widths[i] / freeTotal * remaining : 0; });
            }
        }
        const base = tableWidth || flexTotal;
        columnCols.forEach((col, i) => {
            col.style.width = isFitCell(i) ? `${widths[i]}px` : `${allocated[i] / base * 100}%`;
        });
        displayedWidths = tableWidth ? allocated : null;
        updateScrollRegion();
    };
    const growFitColumns = () => {
        if (!columnsFrozen || !frozenWidths || rowNumberIndex < 0) return;
        let needed = 0;
        [...tbody.rows].forEach(tr => {
            const cell = rowData.has(tr) ? tr.cells[rowNumberIndex] : null;
            if (cell) needed = Math.max(needed, cell.scrollWidth + cell.offsetWidth - cell.clientWidth);
        });
        if (needed > frozenWidths[rowNumberIndex] + .5) {
            frozenWidths[rowNumberIndex] = needed;
            writeColumnWidths();
        }
    };
    const resizeBaseWidths = () => (displayedWidths || frozenWidths).slice();
    let observedWidths = '';
    const columnObserver = new ResizeObserver(() => {
        const widths = `${gridWrapper.clientWidth}:${element.clientWidth}`;
        if (widths === observedWidths && !freezePending) return;
        observedWidths = widths;
        if (columnFrame) return;
        columnFrame = requestAnimationFrame(() => {
            columnFrame = 0;
            if (destroyed) return;
            setViewportWidth();
            if (freezePending) freezeColumns();
            else writeColumnWidths();
        });
    });
    columnObserver.observe(element);
    columnObserver.observe(gridWrapper);
    let screenFrame = 0;
    const screenObserver = new ResizeObserver(() => {
        if (screenFrame) return;
        screenFrame = requestAnimationFrame(() => {
            screenFrame = 0;
            if (!destroyed) setViewportWidth();
        });
    });
    screenObserver.observe(document.documentElement);
    window.addEventListener('resize', setViewportWidth, { signal });
    window.addEventListener('scroll', event => {
        if (event.target !== gridWrapper && !gridWrapper.contains(event.target)) setViewportWidth();
    }, { signal, capture: true, passive: true });
    gridWrapper.addEventListener('scroll', () => { if (!loadingIndicator.hidden) placeLoadingIndicator(); }, { signal, passive: true });
    let cursorHost = null;
    let suppressHeaderClick = false;
    let destroyed = false;
    const MIN_COLUMN_WIDTH = 40;
    const EDGE_TOLERANCE = 6;
    const requestFilters = () => {
        const filter = {};
        filterInputs.forEach(inp => {
            if (inp.value) filter[inp.dataset.param || activeColumns[parseInt(inp.dataset.col)].name] = inp.value;
        });
        externalFilterInputs.forEach(({ column, element }) => {
            if (element.value) filter[column] = element.value;
        });
        return filter;
    };
    const buildRequest = (extra = {}) => {
        const ps      = currentPageSize();
        const usePost = method.toUpperCase() === 'POST';

        const filter = requestFilters();
        const payload = { page: currentPage };
        if (ps) payload.limit = ps;
        if (sortCriteria.length) {
            const sorts = sortCriteria.filter(sort => activeColumns.some(column => column.name === sort.column));
            payload.sort = sorts.map(sort => sort.column).join(',');
            payload.dir  = sorts.map(sort => sort.order).join(',');
        }
        if (activeColumns.length !== columns.length) payload.columns = activeColumns.map(column => column.name).join(',');
        Object.assign(payload, filter, extra);
        payload.lang = gridLocale;

        const getUrl = () => {
            const p = new URLSearchParams({ page: payload.page });
            if (payload.limit)     p.set('limit', payload.limit);
            if (payload.sort)      p.set('sort', payload.sort);
            if (payload.dir)       p.set('dir', payload.dir);
            if (payload.columns)   p.set('columns', payload.columns);
            Object.entries(filter).forEach(([k, v]) => p.set(k, v));
            Object.entries(extra).forEach(([k, v]) => p.set(k, v));
            p.set('lang', gridLocale);
            const cut = dataSource.indexOf('?');
            return cut < 0 ? `${dataSource}?${p}` : mergeQuery(`${dataSource.slice(0, cut)}?${p}`, dataSource.slice(cut + 1));
        };

        return { usePost, payload, url: usePost ? dataSource : getUrl() };
    };

    const showGridError = message => {
        clearTimeout(loadingShowTimer);
        dimRows(false);
        loadingBadge.classList.add('vgrid-loading-error');
        loadingSpinner.hidden = true;
        loadingText.textContent = `${message}.`;
        loadingIndicator.setAttribute('aria-live', 'assertive');
        loadingIndicator.hidden = false;
        placeLoadingIndicator();
    };

    const announceResultCount = (message, delay = 0) => {
        clearTimeout(resultStatusTimer);
        resultStatusTimer = setTimeout(() => {
            if (!destroyed && resultStatus.textContent !== message) resultStatus.textContent = message;
        }, delay);
    };

    const fetchData = () => {
        if (fetchAbort) fetchAbort.abort();
        fetchAbort = new AbortController();

        const { usePost, payload, url } = buildRequest();

        showLoading();

        const fetchOpts = usePost
            ? { method: 'POST', headers: { 'Content-Type': 'application/json', ...requestHeaders(url) }, body: JSON.stringify(payload), signal: fetchAbort.signal }
            : { headers: requestHeaders(url), signal: fetchAbort.signal };

        fetch(url, fetchOpts)
            .then(r => {
                if (!r.ok) throw new Error(`The server answered ${r.status}${r.statusText ? ` ${r.statusText}` : ''}`);
                return r.json().catch(() => { throw new Error('The response is not valid JSON'); });
            })
            .then(body => {
                if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('The response is not an object carrying a "data" array');
                const { data: rows, total, page: pg, limit: ps2, summary } = body;
                if (rows === undefined) throw new Error('The response has no "data" field');
                if (!Array.isArray(rows)) throw new Error('The "data" field is not an array');
                const reportedTotal = toCount(total);
                const totalIsKnown = Number.isInteger(reportedTotal) && reportedTotal >= 0;
                const totalRows = reportedTotal ?? rows.length;
                remoteTotal = totalIsKnown ? reportedTotal : null;
                const pageSize  = Number.isInteger(toCount(ps2)) && toCount(ps2) > 0 ? toCount(ps2) : null;
                const rowPageSize = pageSize || currentPageSize() || null;
                const responsePage = toCount(pg);
                const pageNo = Number.isInteger(responsePage) && responsePage > 0 ? responsePage : currentPage;
                currentPage = pageNo;
                const rowOffset = rowPageSize ? (pageNo - 1) * rowPageSize : pageNo === 1 ? 0 : null;
                const rowCount = totalIsKnown ? reportedTotal : -1;
                const partial = totalIsKnown
                    ? rowOffset === null ? pageNo > 1 || rows.length < reportedTotal : rowOffset > 0 || rowOffset + rows.length < reportedTotal
                    : true;
                tableRowMetadata = { partial, total: rowCount, offset: rowOffset };
                buildRows(rows, rowOffset ?? 0);
                updateTableRowMetadata();
                hideLoading();
                freezeColumns();
                updatePageSizeOptions(totalRows);
                if (Array.isArray(summary) && externalSummaryTargets.length) {
                    const summaryValues = new Map(summary.map(({ key, value }) => [key, value]));
                    externalSummaryTargets.forEach(({ key, element }) => {
                        element.textContent = summaryValues.get(key) ?? '';
                    });
                }
                if (pageSize) {
                    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
                    const from = rows.length ? (pageNo - 1) * pageSize + 1 : 0;
                    const returnedTo = rows.length ? from + rows.length - 1 : 0;
                    const to = totalIsKnown ? Math.min(returnedTo, totalRows) : returnedTo;
                    const countText = totalIsKnown ? `Showing ${from}–${to} of ${totalRows}` : `Showing rows ${from}–${to}`;
                    infoEls.forEach(el => { el.textContent = countText; });
                    announceResultCount(totalIsKnown ? `Showing ${from}–${to} of ${totalRows} results.` : `Showing rows ${from}–${to}; total count unknown.`);
                    renderPagers(totalPages);
                    onPage?.({ page: pageNo, rowsPerPage: pageSize, total: totalRows });
                } else announceResultCount(totalIsKnown ? `${totalRows} results.` : `Showing ${rows.length} rows; total count unknown.`);
                onReady?.({ total: totalRows, rows: rows.length });
            })
            .catch(err => {
                if (err.name === 'AbortError') return;
                showGridError(err.message || 'The data could not be loaded');
                console.error('vGrid fetch error:', err);
                onReady?.({ error: err });
            });
    };

    const pageRange = (current, total, size) => {
        const run = (length, first) => Array.from({ length }, (_, i) => first + i);
        if (total <= size) return run(total, 1);
        const start = Math.min(Math.max(current - Math.floor(size / 2), 1), total - size + 1);
        const end = start + size - 1;
        return [...(start > 2 ? [1, '…'] : start > 1 ? [1] : []), ...run(size, start), ...(end < total - 1 ? ['…', total] : end < total ? [total] : [])];
    };

    const renderPageButtons = (pagerEl, totalPages, size = 7) => {
        const focused = pagerEl.contains(document.activeElement) ? document.activeElement : null;
        const keepFocus = focused ? (focused.getAttribute('aria-label') || `page ${focused.dataset.vgridPage}`) : null;
        pagerEl.innerHTML = '';
        const btn = (label, page, disabled, active, ariaLabel) => {
            const b = makeButton({ textContent: label, disabled, data: { vgridPage: String(page) } });
            if (active) b.setAttribute('aria-current', 'page');
            if (ariaLabel) b.setAttribute('aria-label', ariaLabel);
            return b;
        };
        pagerEl.appendChild(btn('«', 1, currentPage === 1, false, 'First page'));
        pagerEl.appendChild(btn('‹', currentPage - 1, currentPage === 1, false, 'Previous page'));
        pageRange(currentPage, totalPages, size).forEach(p => {
            pagerEl.appendChild(p === '…' ? make('span', { className: partClass('pager-ellipsis'), textContent: '…' }) : btn(p, p, false, p === currentPage));
        });
        pagerEl.appendChild(btn('›', currentPage + 1, currentPage === totalPages, false, 'Next page'));
        pagerEl.appendChild(btn('»', totalPages, currentPage === totalPages, false, 'Last page'));
        if (!keepFocus) return;
        const again = [...pagerEl.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || `page ${b.dataset.vgridPage}`) === keepFocus)
            || pagerEl.querySelector('button[aria-current="page"]');
        again?.focus();
    };

    const layoutPagination = entry => {
        if (!entry.paged || pagerTotalPages === null) return;
        const { bar, pager } = entry;
        delete bar.dataset.vgridStacked;
        renderPageButtons(pager, pagerTotalPages);
        entry.width = bar.clientWidth;
        if (bar.scrollWidth <= bar.clientWidth) return;
        bar.dataset.vgridStacked = '1';
        renderPageButtons(pager, pagerTotalPages, 5);
    };

    const renderPagers = totalPages => {
        pagerTotalPages = totalPages;
        const barPagers = new Set(paginationBars.map(entry => entry.pager));
        pagerEls.forEach(el => { if (!barPagers.has(el)) renderPageButtons(el, totalPages); });
        paginationBars.forEach(layoutPagination);
    };

    const activeFilterValues = () => filterInputs
        .map(inp => {
            const colIdx = parseInt(inp.dataset.col);
            const val = inp.value.toLowerCase();
            if (inp.tagName !== 'SELECT') return { colIdx, val };
            const label = String(inp.options[inp.selectedIndex]?.textContent ?? '').trim().toLowerCase();
            return { colIdx, val, exact: [...new Set([val.trim(), label])].filter(Boolean) };
        })
        .filter(({ val }) => val);

    const rowMatchesFilters = (row, values) => values.every(({ colIdx, val, exact }) => {
        const col = activeColumns[colIdx];
        if (!col) return false;
        const text = cellText(row, col).toLowerCase();
        return exact ? exact.includes(text.trim()) : text.includes(val);
    });

    const sortRows = rows => {
        const sorts = sortCriteria.map(sort => ({ ...sort, col: activeColumns.find(column => column.name === sort.column) })).filter(sort => sort.col);
        if (!sorts.length) return rows;
        return rows.sort((a, b) => {
            for (const sort of sorts) {
                const result = compare(cellText(a, sort.col), cellText(b, sort.col));
                if (result) return sort.order === 'asc' ? result : -result;
            }
            return 0;
        });
    };

    const visibleData = () => {
        const filterVals = activeFilterValues();
        return sortRows(filterVals.length ? localData.filter(row => rowMatchesFilters(row, filterVals)) : localData.slice());
    };

    const render = () => {
        if (isRemote) {
            if (pagerTotalPages !== null) renderPagers(pagerTotalPages);
            fetchData();
            return;
        }

        const filtered = visibleData();
        localMatchingCount = filtered.length;

        const ps = currentPageSize();
        const totalPages = Math.max(1, ps ? Math.ceil(filtered.length / ps) : 1);
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const start = ps ? (currentPage - 1) * ps : 0;
        const visibleRows = ps ? filtered.slice(start, start + ps) : filtered;
        tableRowMetadata = { partial: start > 0 || start + visibleRows.length < filtered.length, total: filtered.length, offset: start };
        buildRows(visibleRows, start);
        updateTableRowMetadata();

        if (ps) {
            const from = filtered.length ? start + 1 : 0;
            const to   = Math.min(start + ps, filtered.length);
            const countText = `Showing ${from}–${to} of ${filtered.length}`;
            infoEls.forEach(el => { el.textContent = countText; });
            announceResultCount(`${countText} results.`, 250);
            renderPagers(totalPages);
            onPage?.({ page: currentPage, rowsPerPage: ps, total: filtered.length });
        } else announceResultCount(`${filtered.length} results.`, 250);
        if (onReady) {
            const ready = { total: filtered.length, rows: currentRows.length };
            queueMicrotask(() => { if (!destroyed) onReady(ready); });
        }
    };

    const downloadBaseName = () => `${namePrefix || 'vgrid'}-${new Date().toISOString().slice(0, 10)}`;

    const saveBlob = (blob, name) => {
        const href = URL.createObjectURL(blob);
        const link = make('a', { href, download: name, hidden: true });
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(href), 1000);
    };

    const csvValue = (value, isNumeric = false) => {
        const text = String(value ?? '').replace(/\s+/g, ' ').trim();
        const formula = !isNumeric && (/^[=+@＝＋＠－\t\r\n]/u.test(text) || (text.startsWith('-') && !/^-?\d+(\.\d+)?$/.test(text)));
        const safe = formula ? `'${text}` : text;
        return /[",]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    };

    const downloadFromView = () => {
        const rows = isRemote ? currentRows : visibleData();
        const head = activeColumns.map(col => csvValue(col.label || col.name));
        const body = rows.map(row => activeColumns.map(col => {
            const value = row[col.name] ?? '';
            const isNumeric = typeof value === 'number' && Number.isFinite(value) && (!col.type || col.type === 'number' || col.type === 'currency');
            return csvValue(cellText(row, col, true), isNumeric);
        }));
        const csv = '\uFEFF' + [head, ...body].map(line => line.join(',')).join('\r\n');
        saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${downloadBaseName()}.csv`);
    };

    const fileNameFromHeaders = response => {
        const disposition = response.headers.get('content-disposition') || '';
        const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disposition);
        if (encoded) {
            try { return decodeURIComponent(encoded[1].trim()); } catch { }
        }
        const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(disposition);
        if (plain) return plain[1].trim();
        const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        const extension = {
            'text/csv': 'csv',
            'text/tab-separated-values': 'tsv',
            'text/plain': 'txt',
            'text/html': 'html',
            'text/xml': 'xml',
            'application/xml': 'xml',
            'application/json': 'json',
            'application/pdf': 'pdf',
            'application/zip': 'zip',
            'application/gzip': 'gz',
            'application/octet-stream': '',
            'application/vnd.ms-excel': 'xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
            'application/vnd.oasis.opendocument.spreadsheet': 'ods'
        }[type];
        return extension ? `${downloadBaseName()}.${extension}` : downloadBaseName();
    };

    const downloadFromServer = () => {
        const { usePost, payload, url } = buildRequest({ download: 'true', ...selectionParams() });
        const fetchOpts = usePost
            ? { method: 'POST', headers: { 'Content-Type': 'application/json', ...requestHeaders(url) }, body: JSON.stringify(payload) }
            : { headers: requestHeaders(url) };
        downloadButton.disabled = true;
        fetch(url, fetchOpts)
            .then(response => {
                if (!response.ok) throw new Error(`The server answered ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`);
                return response.blob().then(blob => ({ blob, name: fileNameFromHeaders(response) }));
            })
            .then(({ blob, name }) => saveBlob(blob, name))
            .catch(err => {
                showGridError(err.message || 'The download could not be prepared');
                console.error('vGrid download error:', err);
            })
            .finally(() => { downloadButton.disabled = false; });
    };

    const startDownload = () => {
        if (downloadMode === 'server') downloadFromServer();
        else downloadFromView();
    };

    const printStyles = `
        html, body { margin: 0; padding: 0; background: #fff; color: #000; }
        body { font: 12px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        table { width: 100%; border-collapse: collapse; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        tr { page-break-inside: avoid; break-inside: avoid; }
        th, td { border: 1px solid #999; padding: 4px 6px; text-align: left; vertical-align: top; font-size: 11px; word-break: break-word; }
        th { background: #eee; font-weight: 600; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        th:first-child, td:first-child { width: 1%; white-space: nowrap; text-align: right; }
        @page { margin: 12mm; }
    `;

    const buildPrintDocument = doc => {
        doc.open();
        doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>');
        doc.close();
        doc.title = downloadBaseName();

        const style = doc.createElement('style');
        style.textContent = printStyles;
        doc.head.appendChild(style);

        const table = doc.createElement('table');
        const head = doc.createElement('thead');
        const headRow = doc.createElement('tr');
        const numberHead = doc.createElement('th');
        numberHead.textContent = '#';
        headRow.appendChild(numberHead);
        activeColumns.forEach(col => {
            const th = doc.createElement('th');
            th.textContent = col.label || col.name;
            headRow.appendChild(th);
        });
        head.appendChild(headRow);
        table.appendChild(head);

        const body = doc.createElement('tbody');
        currentRows.forEach((data, index) => {
            const row = doc.createElement('tr');
            const numberCell = doc.createElement('td');
            const gridNumber = rowNumbers ? rowNumberText(data, index, currentOffset).trim() : '';
            numberCell.textContent = gridNumber || String(index + 1);
            row.appendChild(numberCell);
            activeColumns.forEach(col => {
                const td = doc.createElement('td');
                td.textContent = cellText(data, col, true).replace(/\s+/g, ' ').trim();
                row.appendChild(td);
            });
            body.appendChild(row);
        });
        table.appendChild(body);
        doc.body.appendChild(table);
    };

    const startPrint = () => {
        const frame = make('iframe', { className: 'vgrid-print-frame', attrs: { 'aria-hidden': 'true', tabindex: '-1' } });
        document.body.appendChild(frame);

        const view = frame.contentWindow;
        if (!view) {
            frame.remove();
            showGridError('The print view could not be prepared');
            return;
        }

        let removed = false;
        const cleanUp = () => {
            if (removed) return;
            removed = true;
            clearTimeout(fallback);
            frame.remove();
        };
        const fallback = setTimeout(cleanUp, 60000);

        try {
            buildPrintDocument(frame.contentDocument);
            view.addEventListener('afterprint', () => setTimeout(cleanUp, 0), { once: true });
            view.focus();
            view.print();
        } catch (err) {
            cleanUp();
            showGridError('The print view could not be prepared');
            console.error('vGrid print error:', err);
        }
    };

    const compare = (a, b) => {
        const numA = parseFloat(a), numB = parseFloat(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
    };

    const updateSortIndicators = () => {
        columnHeaders.forEach((th, i) => {
            const priority = sortCriteria.findIndex(sort => sort.column === activeColumns[i]?.name);
            const sort = priority < 0 ? null : sortCriteria[priority];
            if (th.hasAttribute('data-vgrid-sort')) {
                if (priority === 0) th.setAttribute('aria-sort', sort.order === 'asc' ? 'ascending' : 'descending');
                else if (priority === -1) th.setAttribute('aria-sort', 'none');
                else th.removeAttribute('aria-sort');
                const button = th.querySelector('button');
                if (button) button.setAttribute('aria-label', sort
                    ? `Sort by ${columnHeaderLabels[i]}, priority ${priority + 1}, ${sort.order === 'asc' ? 'ascending' : 'descending'}`
                    : `Sort by ${columnHeaderLabels[i]}`);
            } else th.removeAttribute('aria-sort');
            const indicator = th.querySelector('[data-vgrid-sort-indicator]');
            if (indicator) indicator.textContent = sort ? ` ${sortCriteria.length > 1 ? `${priority + 1} ` : ''}${sort.order === 'asc' ? '▲' : '▼'}` : '';
        });
    };

    const applySort = () => {
        updateSortIndicators();
        if (externalSortColumnElement) externalSortColumnElement.value = activeColumns[sortColIndex]?.name ?? '';
        if (externalSortDirectionElement) externalSortDirectionElement.value = sortOrder || 'asc';
        const primary = sortCriteria[0];
        const result = { column: primary?.column, order: primary?.order };
        if (sortCriteria.length > 1) result.sorts = sortCriteria.map(sort => ({ ...sort }));
        onSort?.(result);
        render();
    };

    const rebuildColumns = () => {
        const keptFilters = keptFilterValues();
        const keptSorts = sortCriteria.map(sort => ({ ...sort }));

        activeColumns = columns.filter(column => column.active !== false);
        totalCols = activeColumns.length + colOffset;
        computeToggleIndexes();

        sortCriteria = keptSorts.filter(sort => activeColumns.some(column => column.name === sort.column && column.sort !== false));
        sortColIndex = sortCriteria.length ? activeColumns.findIndex(column => column.name === sortCriteria[0].column) : null;
        sortOrder = sortCriteria[0]?.order ?? null;

        buildColgroup();
        buildHeaderRow();
        buildFilterRow();
        updateColSpans();
        buildExternalSortOptions();

        restoreFilterValues(keptFilters);

        columnsFrozen = false;
        frozenWidths = null;
        widthGrowth = 0;
        element.style.tableLayout = 'auto';
        element.style.minWidth = '';
        setCursorHost(null);
        updateSortIndicators();
        currentPage = 1;

        if (isRemote) { fetchData(); return; }
        if (sortColIndex !== null && sortColIndex !== -1) applySort();
        else render();
        freezeColumns();
    };

    const applyColumnWidths = widths => {
        if (!widths.reduce((sum, width) => sum + width, 0)) return;
        frozenWidths = widths.slice();
        writeColumnWidths();
    };

    const pixelWidth = value => {
        if (typeof value === 'number') return Number.isFinite(value) ? value : null;
        const text = String(value ?? '').trim();
        return /^\d+(\.\d+)?(px)?$/.test(text) ? parseFloat(text) : null;
    };

    const freezeColumns = () => {
        if (columnsFrozen) return;
        freezePending = !element.getBoundingClientRect().width;
        if (freezePending) return;
        const widths = headerCells.map((th, i) => {
            const configured = pixelWidth(columnAtCell(i)?.width);
            const width = configured ?? th.getBoundingClientRect().width;
            const minimum = isFitCell(i) ? 0 : MIN_COLUMN_WIDTH;
            return Math.max(minimum, width || minimum);
        });
        headerCells.forEach(th => th.removeAttribute('width'));
        element.style.tableLayout = 'fixed';
        columnsFrozen = true;
        applyColumnWidths(widths);
        paginationBars.forEach(layoutPagination);
    };

    const dividerIndexAt = event => {
        const index = headerCells.findIndex(th => Math.abs(th.getBoundingClientRect().right - event.clientX) <= EDGE_TOLERANCE);
        if (index < 0 || !isAdjustableColumn(index)) return -1;
        return headerCells.slice(index + 1).some((unused, offset) => isAdjustableColumn(index + offset + 1)) ? index : -1;
    };

    const resizableRow = target => {
        const row = target?.closest?.('tr');
        if (target?.closest?.('[data-vgrid-filter-mode], [data-vgrid-filter-clear]')) return false;
        return !!row && (row === headerRow || row === filterRowElement);
    };

    const resizeColumns = delta => {
        const { index, widths } = resizeState;
        const next = widths.slice();
        const room = i => !isAdjustableColumn(i) ? 0 : Math.max(0, widths[i] - MIN_COLUMN_WIDTH);
        const give = i => isAdjustableColumn(i) ? widths[i] : 0;
        let available = 0;
        for (let i = index + 1; i < widths.length; i++) available += delta > 0 ? room(i) : give(i);
        const move = delta > 0 ? Math.min(delta, available) : Math.min(-delta, room(index));
        if (available > 0) {
            for (let i = index + 1; i < widths.length; i++) {
                const share = (delta > 0 ? room(i) : give(i)) / available;
                next[i] = widths[i] + (delta > 0 ? -share * move : share * move);
            }
        }
        next[index] = widths[index] + (delta > 0 ? delta : -move);
        if (delta > 0) widthGrowth += delta - move;
        applyColumnWidths(next);
    };

    const resizeColumnBy = (column, delta) => {
        const position = activeColumns.indexOf(column);
        if (position < 0 || activeColumns.length < 2) return;
        freezeColumns();
        if (!columnsFrozen || !frozenWidths) return;
        let index = headerCells.indexOf(columnHeaders[position]);
        let adjustment = delta;
        if (position === activeColumns.length - 1) {
            index = headerCells.indexOf(columnHeaders[position - 1]);
            adjustment = -delta;
        }
        if (index < 0) return;
        resizeState = { index, widths: resizeBaseWidths() };
        resizeColumns(adjustment);
        resizeState = null;
        announceResultCount(`${column.label || column.name} column width ${Math.round(frozenWidths[headerCells.indexOf(columnHeaders[position])])} pixels.`);
    };

    const setCursorHost = host => {
        if (cursorHost && cursorHost !== host) cursorHost.style.cursor = '';
        cursorHost = host;
        if (host) host.style.cursor = 'col-resize';
    };

    const finishColumnResize = event => {
        if (!resizeState || resizeState.pointerId !== event.pointerId) return;
        if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
        resizeState = null;
        document.body.style.cursor = '';
        element.style.userSelect = '';
        setCursorHost(null);
        suppressHeaderClick = true;
        setTimeout(() => { suppressHeaderClick = false; }, 0);
    };

    element.addEventListener('pointermove', event => {
        if (reorderState) return;
        if (resizeState) {
            resizeColumns(event.clientX - resizeState.startX);
            return;
        }
        const overDivider = resizableRow(event.target) && dividerIndexAt(event) !== -1;
        setCursorHost(overDivider ? event.target : null);
    }, { capture: true, signal });
    element.addEventListener('pointerleave', () => {
        if (!resizeState) setCursorHost(null);
    }, { capture: true, signal });
    element.addEventListener('pointerdown', event => {
        if (event.button !== 0 || !resizableRow(event.target)) return;
        freezeColumns();
        const index = dividerIndexAt(event);
        if (index === -1) return;
        event.preventDefault();
        event.stopPropagation();
        resizeState = {
            index,
            pointerId: event.pointerId,
            startX: event.clientX,
            widths: headerCells.map(th => th.getBoundingClientRect().width),
        };
        element.setPointerCapture(event.pointerId);
        document.body.style.cursor = 'col-resize';
        element.style.userSelect = 'none';
    }, { capture: true, signal });
    element.addEventListener('pointerup', finishColumnResize, { capture: true, signal });
    element.addEventListener('pointercancel', finishColumnResize, { capture: true, signal });
    element.addEventListener('lostpointercapture', finishColumnResize, { capture: true, signal });

    const REORDER_SLOP = 6;
    let reorderState = null;

    const columnCells = position => {
        const slot = headerCells.indexOf(columnHeaders[position]);
        if (slot === -1) return [];
        return [...element.querySelectorAll(':scope > thead > tr, :scope > tbody > tr')]
            .filter(tr => tr.children.length === headerCells.length)
            .map(tr => tr.children[slot]);
    };

    const moveColumn = (from, to) => {
        if (to === from || to === from + 1) return false;
        const slots = columnHeaders.map(th => headerCells.indexOf(th));
        const order = activeColumns.map((unused, index) => index);
        order.splice(to > from ? to - 1 : to, 0, ...order.splice(from, 1));
        const permute = items => {
            const next = items.slice();
            slots.forEach((slot, index) => { next[slot] = items[slots[order[index]]]; });
            return next;
        };
        const kept = keptFilterValues();
        const keptSorts = sortCriteria.map(sort => ({ ...sort }));
        const widths = permute(columnCols.map(col => col.style.width));
        [...element.querySelectorAll(':scope > tbody > tr')]
            .filter(tr => tr.children.length === headerCells.length)
            .forEach(tr => tr.replaceChildren(...permute([...tr.children])));
        const moved = activeColumns[from];
        const anchor = activeColumns[to];
        const last = activeColumns[activeColumns.length - 1];
        columns.splice(columns.indexOf(moved), 1);
        columns.splice(anchor ? columns.indexOf(anchor) : columns.indexOf(last) + 1, 0, moved);
        activeColumns = columns.filter(column => column.active !== false);
        sortCriteria = keptSorts.filter(sort => activeColumns.some(column => column.name === sort.column));
        sortColIndex = sortCriteria.length ? activeColumns.findIndex(column => column.name === sortCriteria[0].column) : null;
        sortOrder = sortCriteria[0]?.order ?? null;
        buildHeaderRow();
        if (columnsFrozen) headerCells.forEach(th => th.removeAttribute('width'));
        updateSortIndicators();
        buildFilterRow();
        restoreFilterValues(kept);
        buildExternalSortOptions();
        columnCols.forEach((col, index) => { col.style.width = widths[index]; });
        if (frozenWidths) {
            frozenWidths = permute(frozenWidths);
            writeColumnWidths();
        }
        syncSettingsOrder();
        return true;
    };

    const placeReorder = x => {
        const state = reorderState;
        const wrap = gridWrapper.getBoundingClientRect();
        state.ghost.style.left = `${Math.max(0, Math.min(x - wrap.left - state.grab, wrap.width - state.width))}px`;
        const to = columnHeaders.filter(th => {
            const rect = th.getBoundingClientRect();
            return rect.left + rect.width / 2 < x;
        }).length;
        state.to = to;
        const edge = to < columnHeaders.length
            ? columnHeaders[to].getBoundingClientRect().left
            : columnHeaders[columnHeaders.length - 1].getBoundingClientRect().right;
        state.marker.style.left = `${Math.max(0, Math.min(edge - wrap.left - 1.5, wrap.width - 3))}px`;
        state.marker.style.opacity = to === state.from || to === state.from + 1 ? '0' : '1';
    };

    const startReorder = () => {
        const state = reorderState;
        const th = columnHeaders[state?.from];
        if (!state || destroyed || !th?.isConnected) { reorderState = null; return; }
        state.active = true;
        const rect = th.getBoundingClientRect();
        const wrap = gridWrapper.getBoundingClientRect();
        const table = element.getBoundingClientRect();
        const style = getComputedStyle(th);
        const align = style.textAlign;
        state.width = rect.width;
        state.grab = state.x - rect.left;
        const ghost = make('div', { className: partClass('column-ghost'), textContent: th.textContent, attrs: { 'aria-hidden': 'true' } });
        ghost.style.cssText = `top:${rect.top - wrap.top}px;left:${rect.left - wrap.left}px;width:${rect.width}px;height:${rect.height}px;padding:${style.padding};justify-content:${align === 'center' || align.endsWith('center') ? 'center' : align === 'right' || align === 'end' ? 'flex-end' : 'flex-start'};`;
        const marker = make('div', { className: partClass('column-marker'), attrs: { 'aria-hidden': 'true' } });
        marker.style.cssText = `top:${rect.top - wrap.top}px;height:${table.bottom - rect.top}px;`;
        gridWrapper.append(marker, ghost);
        state.ghost = ghost;
        state.marker = marker;
        state.cells = columnCells(state.from);
        state.cells.forEach(cell => { cell.dataset.vgridDragSource = '1'; });
        document.body.style.cursor = 'grabbing';
        element.style.userSelect = 'none';
        suppressHeaderClick = true;
        placeReorder(state.x);
    };

    const endReorder = commit => {
        const state = reorderState;
        if (!state) return;
        reorderState = null;
        clearTimeout(state.timer);
        if (!state.active) return;
        state.ghost.remove();
        state.marker.remove();
        state.cells.forEach(cell => { delete cell.dataset.vgridDragSource; });
        document.body.style.cursor = '';
        element.style.userSelect = '';
        setTimeout(() => { suppressHeaderClick = false; }, 0);
        if (!commit || !moveColumn(state.from, state.to)) return;
        const cells = columnCells(activeColumns.indexOf(state.column));
        cells.forEach(cell => { cell.dataset.vgridDropped = '1'; });
        setTimeout(() => cells.forEach(cell => { delete cell.dataset.vgridDropped; }), easingMs * 4 + 100);
    };

    if (reorderColumns !== false) {
        headerRow.addEventListener('pointerdown', event => {
            if (event.button !== 0 || reorderState || resizeState) return;
            const from = columnHeaders.indexOf(event.target.closest('th'));
            if (from === -1 || activeColumns.length < 2) return;
            reorderState = {
                pointerId: event.pointerId,
                from,
                to: from,
                column: activeColumns[from],
                x: event.clientX,
                startX: event.clientX,
                startY: event.clientY,
                active: false,
                timer: setTimeout(startReorder, reorderDelayMs),
            };
        }, { signal });
        document.addEventListener('pointermove', event => {
            const state = reorderState;
            if (!state || state.pointerId !== event.pointerId) return;
            state.x = event.clientX;
            if (state.active) placeReorder(event.clientX);
            else if (Math.hypot(event.clientX - state.startX, event.clientY - state.startY) > REORDER_SLOP) endReorder(false);
        }, { signal });
        document.addEventListener('pointerup', event => {
            if (reorderState?.pointerId === event.pointerId) endReorder(true);
        }, { signal });
        document.addEventListener('pointercancel', event => {
            if (reorderState?.pointerId === event.pointerId) endReorder(false);
        }, { signal });
        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape' || !reorderState?.active) return;
            event.preventDefault();
            endReorder(false);
        }, { signal });
        headerRow.addEventListener('touchmove', event => {
            if (reorderState?.active) event.preventDefault();
        }, { passive: false, signal });
        headerRow.addEventListener('contextmenu', event => {
            if (reorderState) event.preventDefault();
        }, { signal });
        gridWrapper.dataset.vgridReorder = '1';
    }

    externalFilterInputs.forEach(({ element }) => element.addEventListener('change', () => {
        if (resettingFilters) return;
        currentPage = 1;
        render();
    }, { signal }));

    externalRowsPerPageElements.forEach(select => select.addEventListener('change', () => {
        pageSizeSource = 'external';
        syncPageSizeControls(parseInt(select.value));
        currentPage = 1;
        render();
    }, { signal }));

    if (externalSortColumnElement) {
        externalSortColumnElement.addEventListener('change', () => {
            const idx = activeColumns.findIndex(c => c.name === externalSortColumnElement.value);
            if (idx === -1) return;
            sortOrder = idx === sortColIndex ? (sortOrder || 'asc') : (externalSortDirectionElement?.value || 'asc');
            sortColIndex = idx;
            sortCriteria = [{ column: activeColumns[idx].name, order: sortOrder }];
            currentPage = 1;
            applySort();
        }, { signal });
    }

    if (externalSortDirectionElement) {
        externalSortDirectionElement.addEventListener('change', () => {
            if (sortColIndex === null || sortColIndex === -1) return;
            sortOrder = externalSortDirectionElement.value === 'desc' ? 'desc' : 'asc';
            sortCriteria = [{ column: activeColumns[sortColIndex].name, order: sortOrder }];
            currentPage = 1;
            applySort();
        }, { signal });
    }

    rowsPerPageSelects.forEach(select => select.addEventListener('change', () => {
        pageSizeSource = 'grid';
        syncPageSizeControls(parseInt(select.value));
        currentPage = 1;
        render();
    }, { signal }));

    if (isRemote) {
        updateSortIndicators();
        fetchData();
    } else {
        if (sortColIndex !== null && sortColIndex !== -1) applySort();
        else render();
        freezeColumns();
    }

    const instance = {
        element,
        config,

        reload(newData) {
            if (destroyed) return instance;
            currentPage = 1;
            if (isRemote) { fetchData(); return instance; }
            if (newData !== undefined) {
                if (!Array.isArray(newData)) { console.error('vGrid: reload() expects an array of rows.'); return instance; }
                localData = newData;
                updatePageSizeOptions(newData.length);
            }
            if (sortColIndex !== null && sortColIndex !== -1) applySort();
            else render();
            return instance;
        },

        setPage(n) {
            if (destroyed) return instance;
            const page = parseInt(n);
            if (!Number.isFinite(page) || page < 1) { console.error('vGrid: setPage() expects a page number of 1 or greater.'); return instance; }
            currentPage = page;
            render();
            return instance;
        },

        sort(column, order = 'asc') {
            if (destroyed) return instance;
            const idx = activeColumns.findIndex(c => c.name === column);
            if (idx === -1) { console.warn(`vGrid: column "${column}" not found`); return instance; }
            if (activeColumns[idx].sort === false) { console.warn(`vGrid: column "${column}" is not sortable`); return instance; }
            sortColIndex = idx;
            sortOrder = order === 'desc' ? 'desc' : 'asc';
            sortCriteria = [{ column, order: sortOrder }];
            applySort();
            return instance;
        },

        getSelected() {
            return selectionState();
        },

        clearSelection() {
            if (destroyed || !rowSelectionActive) return instance;
            const changed = hasSelection();
            clearSelectionState();
            syncSelection();
            if (changed) notifySelection();
            return instance;
        },

        destroy() {
            if (destroyed) return;
            destroyed = true;
            controller.abort();
            if (resizeState) {
                resizeState = null;
                document.body.style.cursor = '';
            }
            setCursorHost(null);
            if (fetchAbort) fetchAbort.abort();
            clearSubgrids();
            subgrids.forEach(sub => {
                if (sub.menuFrame) cancelAnimationFrame(sub.menuFrame);
                sub.menuFrame = 0;
                sub.menu.remove();
            });
            if (filterModeMenu.menuFrame) cancelAnimationFrame(filterModeMenu.menuFrame);
            filterModeMenu.menuFrame = 0;
            filterModeMenu.menuOwner = null;
            filterModeMenu.menu.remove();
            filterModeKeys.clear();
            clearTimeout(filterTimer);
            clearTimeout(loadingShowTimer);
            clearTimeout(resultStatusTimer);
            tbody.replaceChildren();
            localData = [];
            currentRows = [];
            colSpanCells.length = 0;
            columnCols.length = 0;
            headerCells.length = 0;
            columnHeaders.length = 0;
            columnHeaderLabels.length = 0;
            filterInputs.length = 0;
            filterClears.length = 0;
            filterDefaults.clear();
            infoEls.length = 0;
            pagerEls.length = 0;
            rowsPerPageSelects.length = 0;
            barObserver.disconnect();
            paginationBars.forEach(entry => cancelAnimationFrame(entry.frame));
            columnObserver.disconnect();
            screenObserver.disconnect();
            cancelAnimationFrame(screenFrame);
            cancelAnimationFrame(columnFrame);
            paginationBars.length = 0;
            loadingIndicator.remove();
            resultStatus.remove();
            sortInstructions?.remove();
            if (sortInstructions) {
                if (originalAriaDescribedBy === null) element.removeAttribute('aria-describedby');
                else element.setAttribute('aria-describedby', originalAriaDescribedBy);
            }
            if (originalAriaLabel === null) element.removeAttribute('aria-label');
            else element.setAttribute('aria-label', originalAriaLabel);
            if (originalAriaLabelledBy === null) element.removeAttribute('aria-labelledby');
            else element.setAttribute('aria-labelledby', originalAriaLabelledBy);
            if (originalAriaRowCount === null) element.removeAttribute('aria-rowcount');
            else element.setAttribute('aria-rowcount', originalAriaRowCount);
            if (originalRole === null) element.removeAttribute('role');
            else element.setAttribute('role', originalRole);
            if (originalAriaMultiSelectable === null) element.removeAttribute('aria-multiselectable');
            else element.setAttribute('aria-multiselectable', originalAriaMultiSelectable);
            settingsPanel.remove();
            settingsButton?.remove();
            refreshButton?.remove();
            clearFiltersButton?.remove();
            downloadButton?.remove();
            printButton?.remove();
            if (createdTable) gridWrapper.remove();
            else {
                gridWrapper.replaceWith(element);
                element.innerHTML = '';
                element.classList.remove('vgrid');
                element.style.tableLayout = '';
                element.style.minWidth = '';
                element.style.userSelect = '';
            }
        }
    };

    return instance;
}
