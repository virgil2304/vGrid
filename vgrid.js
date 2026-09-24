/* vGrid v1.0.0.5.39 | Last updated: 2026-09-17 */
function vGrid(config) {

    const { el, caption, columns = [], data = [], dataSource, method = 'GET', headers = {},
        rowNumbers = true, rowNumbersType = 'sequential',
        filterRow = true, filterClear = true, sortBy, rowsPerPage: rowsPerPageConfig, rowsPerPageOptions: rowsPerPageOptionsConfig, showPaginationControls = true,
        showPagination = showPaginationControls, showRowsPerPage = showPaginationControls,
        externalFilters = {}, externalRowsPerPage, externalPagination, externalSort = {}, externalSummary = {},
        settings = true, externalSettings, subgrid, borders = 'horizontal', size = 'medium', actions = 'caption', easing = 160,
        onSort, onFilter, onPage, onReady, namespace } = config;

    const toPageSize = value => {
        const size = parseInt(value);
        return Number.isFinite(size) && size > 0 ? size : null;
    };
    const rowsPerPageDefault = showPagination || showRowsPerPage || externalPagination || externalRowsPerPage ? 10 : 0;
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

    const actionsPresets = ['caption', 'bottom', 'none'];
    if (!actionsPresets.includes(actions)) {
        console.error(`vGrid: actions must be one of ${actionsPresets.join(', ')}.`);
    }
    const actionsPreset = actionsPresets.includes(actions) ? actions : 'caption';

    const easingValue = Number(easing);
    if (!Number.isFinite(easingValue) || easingValue < 0) {
        console.error('vGrid: easing must be a duration in milliseconds, 0 for none.');
    }
    const easingMs = Number.isFinite(easingValue) && easingValue >= 0 ? easingValue : 160;

    const reservedColumnNames = new Set([
        'page', 'limit', 'sort', 'dir', 'offset', 'cursor',
        'perpage', 'pagesize', 'sortby', 'sortorder', 'columns',
    ]);
    const invalidColumns = [...columns.map(column => String(column.name || '')), ...Object.keys(externalFilters)]
        .map(name => name.toLowerCase())
        .filter(name => reservedColumnNames.has(name));

    if (invalidColumns.length) {
        console.error(`vGrid: column name(s) ${[...new Set(invalidColumns)].join(', ')} are reserved for remote API controls. Rename the column(s) and update the data source.`);
        return null;
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
            menuClosedAt: 0,
            order: 0,
        };
    }).filter(sub => sub.panels.length > 0);
    subgrids.forEach((sub, index) => { sub.order = index; });
    const hasPanels = subgrids.length > 0;

    const settingsStorageKey = `vgrid:${typeof el === 'string' ? el : (el?.id || '')}:${dataSource || ''}:columns`;
    if (settings && columns.length) {
        try {
            const saved = JSON.parse(localStorage.getItem(settingsStorageKey));
            if (saved && typeof saved === 'object') {
                columns.forEach(column => {
                    if (typeof saved[column.name] === 'boolean') column.active = saved[column.name];
                });
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

    const isRemote = !!dataSource;

    const target = typeof el === 'string' ? document.querySelector(el) : el;

    if (!target) {
        console.error('vGrid: "el" must identify an element.');
        return null;
    }

    const namePrefix = typeof namespace === 'string' && namespace ? namespace : (target.id || '');
    const partClass = (part, ...extra) => ['vgrid-' + part, namePrefix ? `${namePrefix}-${part}` : '', ...extra].filter(Boolean).join(' ');

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

    const resolveExternal = selector => typeof selector === 'string' ? document.querySelector(selector) : selector;
    const externalPaginationElements = resolveExternalAll(externalPagination);
    if (externalPagination && !externalPaginationElements.length) {
        console.error('vGrid: external pagination control was not found.');
    }
    const externalSettingsElement = resolveExternal(externalSettings);
    if (externalSettings && !externalSettingsElement) {
        console.error('vGrid: external settings control was not found.');
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
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Sort by…';
        externalSortColumnElement.replaceChildren(placeholder, ...activeColumns
            .filter(c => c.sort !== false)
            .map(c => {
                const opt = document.createElement('option');
                opt.value = c.name;
                opt.textContent = c.label || c.name;
                return opt;
            }));
        externalSortColumnElement.value = selected || sortBy?.column || '';
    };
    buildExternalSortOptions();
    if (externalSortDirectionElement?.tagName === 'SELECT' && !externalSortDirectionElement.options.length) {
        const asc = document.createElement('option');
        asc.value = 'asc';
        asc.textContent = 'Ascending';
        const desc = document.createElement('option');
        desc.value = 'desc';
        desc.textContent = 'Descending';
        externalSortDirectionElement.replaceChildren(asc, desc);
    }
    if (externalSortDirectionElement && sortBy?.order) externalSortDirectionElement.value = sortBy.order;

    const element = target.tagName === 'TABLE' ? target : document.createElement('table');
    const createdTable = element !== target;
    if (createdTable) target.replaceChildren(element);
    element.classList.add('vgrid');
    element.border = '1';
    element.rules = 'all';
    element.style.width = '100%';
    element.style.maxWidth = '100%';
    element.style.borderCollapse = 'collapse';
    element.style.tableLayout = 'auto';

    const colOffset = subgrids.length + (rowNumbers ? 1 : 0);
    let totalCols = activeColumns.length + colOffset;
    let toggleIndexes = [];
    let toggleIndexesSorted = [];
    const computeToggleIndexes = () => {
        toggleIndexes = new Array(subgrids.length).fill(-1);
        const ends = subgrids.filter(sub => sub.position === 'end');
        const numbered = subgrids
            .filter(sub => typeof sub.position === 'number')
            .sort((a, b) => a.position - b.position || a.order - b.order);
        let next = 0;
        subgrids.filter(sub => sub.position === 'start').forEach(sub => { toggleIndexes[sub.order] = next++; });
        const limit = Math.max(totalCols - ends.length - 1, next);
        numbered.forEach(sub => {
            next = Math.min(Math.max(sub.position - 1, next), limit);
            toggleIndexes[sub.order] = next++;
        });
        ends.forEach((sub, index) => { toggleIndexes[sub.order] = totalCols - ends.length + index; });
        toggleIndexesSorted = [...toggleIndexes].sort((a, b) => a - b);
    };
    computeToggleIndexes();
    const placeToggleCells = (cells, makeCell) => {
        subgrids
            .map(sub => ({ sub, at: toggleIndexes[sub.order] }))
            .sort((a, b) => a.at - b.at)
            .forEach(({ sub, at }) => cells.splice(Math.min(Math.max(at, 0), cells.length), 0, makeCell(sub)));
        return cells;
    };
    const shiftCellIndex = base => {
        let cell = base;
        toggleIndexesSorted.forEach(at => { if (at <= cell) cell++; });
        return cell;
    };
    const cellIndexOf = index => shiftCellIndex(index + (rowNumbers ? 1 : 0));
    const rowNumberCellIndex = () => shiftCellIndex(0);
    const columnAtCell = index => {
        if (toggleIndexesSorted.includes(index)) return null;
        let position = index - toggleIndexesSorted.filter(at => at < index).length - (rowNumbers ? 1 : 0);
        return position >= 0 ? activeColumns[position] : null;
    };
    const colgroup = document.createElement('colgroup');
    const columnCols = [];
    const colSpanCells = [];
    const isToggleCell = index => toggleIndexesSorted.includes(index);
    const buildColgroup = () => {
        columnCols.length = 0;
        colgroup.replaceChildren(...Array.from({ length: totalCols }, (unused, index) => {
            const col = document.createElement('col');
            if (isToggleCell(index)) {
                col.className = partClass('toggle-column');
                col.style.width = '1px';
            }
            columnCols.push(col);
            return col;
        }));
    };
    const updateColSpans = () => colSpanCells.forEach(cell => { cell.colSpan = totalCols; });
    buildColgroup();
    const clipCell = cell => {
        cell.style.overflow = 'hidden';
        cell.style.textOverflow = 'ellipsis';
        cell.style.whiteSpace = 'nowrap';
        return cell;
    };

    const controller = new AbortController();
    const { signal } = controller;

    const thead = document.createElement('thead');
    const tfoot = document.createElement('tfoot');

    const settingsPanel = document.createElement('div');
    let settingsButton = null;
    let refreshButton = null;

    if (settings && columns.length) {
        refreshButton = document.createElement('button');
        refreshButton.type = 'button';
        refreshButton.title = 'Refresh';
        refreshButton.textContent = '↻︎';
        refreshButton.addEventListener('click', () => {
            if (isRemote) fetchData();
            else if (sortColIndex !== null && sortColIndex !== -1) applySort();
            else render();
        }, { signal });

        vGrid.instanceCount = (vGrid.instanceCount || 0) + 1;
        settingsPanel.id = `vgrid-settings-${vGrid.instanceCount}`;
        settingsPanel.className = partClass('settings');
        settingsPanel.setAttribute('popover', '');
        settingsButton = document.createElement('button');
        settingsButton.type = 'button';
        settingsButton.title = 'Settings';
        settingsButton.textContent = '\u2699\uFE0E';
        settingsButton.setAttribute('popovertarget', settingsPanel.id);

        const settingsClose = document.createElement('button');
        settingsClose.type = 'button';
        settingsClose.className = partClass('settings-close');
        settingsClose.textContent = '\u00D7';
        settingsClose.title = 'Close';
        settingsClose.setAttribute('aria-label', 'Close');
        settingsClose.setAttribute('popovertarget', settingsPanel.id);
        settingsClose.setAttribute('popovertargetaction', 'hide');
        settingsPanel.appendChild(settingsClose);

        const fieldset = document.createElement('fieldset');
        const legend = document.createElement('legend');
        legend.textContent = 'Display columns';
        fieldset.appendChild(legend);
        const settingsCheckboxes = [];
        columns.forEach(col => {
            const row = document.createElement('label');
            row.style.display = 'block';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = col.active !== false;
            checkbox.addEventListener('change', () => {
                if (!checkbox.checked && !settingsCheckboxes.some(entry => entry.checkbox.checked)) {
                    checkbox.checked = true;
                }
            }, { signal });
            settingsCheckboxes.push({ column: col, checkbox });
            row.append(checkbox, document.createTextNode(` ${col.label || col.name}`));
            fieldset.appendChild(row);
        });
        settingsPanel.appendChild(fieldset);

        const applyPending = () => {
            settingsCheckboxes.forEach(({ column, checkbox }) => { column.active = checkbox.checked; });
            settingsPanel.hidePopover();
            rebuildColumns();
        };

        const applyButton = document.createElement('button');
        applyButton.type = 'button';
        applyButton.textContent = 'Apply';
        applyButton.addEventListener('click', applyPending, { signal });

        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.textContent = 'Save';
        saveButton.addEventListener('click', () => {
            applyPending();
            const preference = {};
            settingsCheckboxes.forEach(({ column, checkbox }) => { preference[column.name] = checkbox.checked; });
            try { localStorage.setItem(settingsStorageKey, JSON.stringify(preference)); } catch { }
        }, { signal });

        const settingsActions = document.createElement('div');
        settingsActions.className = partClass('settings-actions');
        settingsActions.append(applyButton, saveButton);
        settingsPanel.appendChild(settingsActions);

        const placeSettingsPanel = () => {
            const anchor = settingsButton;
            if (!anchor?.isConnected || !settingsPanel.matches(':popover-open')) return;
            const gap = 4;
            const button = anchor.getBoundingClientRect();
            const panel = settingsPanel.getBoundingClientRect();
            const below = button.bottom + gap;
            const above = button.top - gap - panel.height;
            const top = below + panel.height <= window.innerHeight || above < 0 ? below : above;
            const left = Math.max(gap, Math.min(button.right - panel.width, window.innerWidth - panel.width - gap));
            settingsPanel.style.top = `${Math.max(gap, top)}px`;
            settingsPanel.style.left = `${left}px`;
        };

        settingsPanel.addEventListener('toggle', event => {
            if (event.newState !== 'open') return;
            settingsCheckboxes.forEach(({ column, checkbox }) => { checkbox.checked = column.active !== false; });
            placeSettingsPanel();
        }, { signal });

        window.addEventListener('resize', placeSettingsPanel, { signal });
        window.addEventListener('scroll', placeSettingsPanel, { signal, capture: true });
    }

    const inlineSettings = settingsButton && !externalSettingsElement;
    const captionActions = inlineSettings && actionsPreset === 'caption';
    const bottomActions = inlineSettings && actionsPreset === 'bottom';

    const makeActions = () => {
        const group = document.createElement('span');
        group.className = partClass('actions');
        group.style.float = 'right';
        group.append(refreshButton, settingsButton);
        return group;
    };

    if (caption || captionActions) {
        const tr = document.createElement('tr');
        tr.className = partClass('caption');
        const td = document.createElement('td');
        td.colSpan = totalCols;
        if (caption) td.innerHTML = caption;
        if (captionActions) td.insertBefore(makeActions(), td.firstChild);
        tr.appendChild(td);
        colSpanCells.push(td);
        thead.appendChild(tr);
    }

    if (settingsButton && externalSettingsElement) externalSettingsElement.replaceChildren(refreshButton, settingsButton);

    const infoEls = [], pagerEls = [], rowsPerPageSelects = [];

    externalPaginationElements.forEach(container => {
        const info = document.createElement('span');
        info.className = partClass('count');
        const pager = document.createElement('span');
        pager.className = partClass('pager');
        container.replaceChildren(info, document.createTextNode(' '), pager);
        infoEls.push(info);
        pagerEls.push(pager);
    });

    const pageSizeOptions = total => [...new Set(rowsPerPageOptions
        ? [...rowsPerPageOptions, rowsPerPage]
        : [
            ...(total <= 10 ? [5, 10] : total <= 50 ? [10, 20, 50] : [20, 40, 50, 100]),
            rowsPerPage,
        ])].filter(size => Number.isFinite(size)).sort((a, b) => a - b);

    const updatePageSizeOptions = total => {
        if (rowsPerPageOptions) return;
        const selected = rowsPerPageSelects[0] ? parseInt(rowsPerPageSelects[0].value) : rowsPerPage;
        const sizes = [...new Set([...pageSizeOptions(total), selected])].filter(size => Number.isFinite(size)).sort((a, b) => a - b);
        rowsPerPageSelects.forEach(select => {
            select.replaceChildren(...sizes.map(s => {
                const opt = document.createElement('option');
                opt.value = String(s);
                opt.textContent = s;
                return opt;
            }));
            select.value = String(selected);
        });
    };

    const makeBar = () => {
        const tr = document.createElement('tr');
        tr.className = partClass('pagination');
        const td = document.createElement('td');
        td.colSpan = totalCols;
        const left = document.createElement('span');
        left.className = partClass('count');
        const center = document.createElement('span');
        center.className = partClass('pager');
        const right = document.createElement('span');
        right.className = partClass('rows-per-page');

        if (showPagination) {
            infoEls.push(left);
            pagerEls.push(center);
        }

        if (showRowsPerPage) {
            const label = document.createElement('label');
            label.textContent = 'Show ';
            const rowsPerPageSelect = document.createElement('select');
            const sizes = pageSizeOptions(isRemote ? 0 : data.length);
            sizes.forEach(s => {
                const opt = document.createElement('option');
                opt.value = String(s);
                opt.textContent = s;
                if (s === rowsPerPage) opt.selected = true;
                rowsPerPageSelect.appendChild(opt);
            });
            rowsPerPageSelects.push(rowsPerPageSelect);
            const after = document.createElement('span');
            after.textContent = ' rows';
            label.appendChild(rowsPerPageSelect);
            label.appendChild(after);
            right.appendChild(label);
        }

        td.append(left, document.createTextNode(' '), center, document.createTextNode(' '), right);
        tr.appendChild(td);
        colSpanCells.push(td);
        return tr;
    };

    if (rowsPerPage && (showPagination || showRowsPerPage)) thead.appendChild(makeBar());

    const headerRow = document.createElement('tr');
    headerRow.className = partClass('header');
    const headerCells = [];
    const columnHeaders = [];
    const columnHeaderLabels = [];

    const buildHeaderRow = () => {
        headerCells.length = 0;
        columnHeaders.length = 0;
        columnHeaderLabels.length = 0;
        const cells = [];
        if (rowNumbers) {
            const th = document.createElement('th');
            th.scope = 'col';
            cells.push(clipCell(th));
        }
        activeColumns.forEach((col, i) => {
            const th = document.createElement('th');
            th.textContent = col.label || col.name;
            th.scope = 'col';
            if (col.width) th.width = String(col.width);
            if (col.sort !== false) {
                th.title = `Sort by ${th.textContent}`;
                th.addEventListener('click', () => {
                    if (suppressHeaderClick) {
                        suppressHeaderClick = false;
                        return;
                    }
                    if (sortColIndex === i) {
                        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
                    } else {
                        sortColIndex = i;
                        sortOrder = 'asc';
                    }
                    currentPage = 1;
                    applySort();
                }, { signal });
            }
            cells.push(clipCell(th));
            columnHeaders.push(th);
            columnHeaderLabels.push(th.textContent);
        });
        if (hasPanels) {
            placeToggleCells(cells, () => {
                const th = document.createElement('th');
                th.scope = 'col';
                return clipCell(th);
            });
        }
        headerCells.push(...cells);
        headerRow.replaceChildren(...cells);
    };

    buildHeaderRow();
    thead.appendChild(headerRow);

    const filterInputs = [];
    const filterClears = [];
    const filterRowElement = filterRow ? document.createElement('tr') : null;
    if (filterRowElement) filterRowElement.className = partClass('filter');

    const syncFilterClears = () => filterClears.forEach(({ control, button, pad }) => {
        const filled = control.value !== '';
        button.hidden = !filled;
        control.style.paddingRight = filled ? pad : '';
    });

    const clearFilterInput = control => {
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

    const addFilterClear = (control, col) => {
        const isSelect = control.tagName === 'SELECT';
        const wrap = document.createElement('span');
        wrap.style.position = 'relative';
        wrap.style.display = 'block';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = partClass('filter-clear');
        button.tabIndex = -1;
        button.hidden = true;
        button.textContent = '\u00D7';
        button.setAttribute('aria-label', `Clear ${col.label || col.name} filter`);
        button.style.position = 'absolute';
        button.style.top = '0';
        button.style.bottom = '0';
        button.style.right = isSelect ? '1.2em' : '0';
        button.style.width = '1.2em';
        button.style.padding = '0';
        button.style.border = '0';
        button.style.background = 'none';
        button.style.font = 'inherit';
        button.style.lineHeight = '1';
        button.style.color = 'inherit';
        button.style.opacity = '.6';
        button.style.cursor = 'pointer';
        button.addEventListener('click', () => clearFilterInput(control), { signal });
        button.addEventListener('mouseenter', () => { button.style.opacity = '1'; }, { signal });
        button.addEventListener('mouseleave', () => { button.style.opacity = '.6'; }, { signal });
        if (!isSelect) {
            control.addEventListener('keydown', event => {
                if (event.key !== 'Escape' || control.value === '') return;
                event.preventDefault();
                clearFilterInput(control);
            }, { signal });
        }
        wrap.append(control, button);
        filterClears.push({ control, button, pad: isSelect ? '2.4em' : '1.2em' });
        return wrap;
    };

    const buildFilterRow = () => {
        if (!filterRowElement) return;
        filterInputs.length = 0;
        filterClears.length = 0;
        const cells = [];
        if (rowNumbers) cells.push(clipCell(document.createElement('td')));
        activeColumns.forEach((col, i) => {
            const td = document.createElement('td');
            if (col.filter !== false) {
                let control;
                let clearable = filterClear && col.filterClear !== false;
                if (col.filterType === 'select') {
                    const select = document.createElement('select');
                    select.className = partClass(`filter-${col.name}`);
                    select.dataset.col = String(i);
                    (col.filterOptions || '').split(';').forEach(pair => {
                        const sep = pair.indexOf(':');
                        const val  = sep === -1 ? pair : pair.slice(0, sep);
                        const text = sep === -1 ? pair : pair.slice(sep + 1);
                        const o = document.createElement('option');
                        o.value = val; o.textContent = text;
                        select.appendChild(o);
                    });
                    clearable = clearable && [...select.options].some(option => option.value === '');
                    control = select;
                } else {
                    const input = document.createElement('input');
                    input.className = partClass(`filter-${col.name}`);
                    input.type = 'text';
                    input.placeholder = col.label || col.name;
                    input.dataset.col = String(i);
                    control = input;
                }
                control.style.width = '100%';
                control.style.boxSizing = 'border-box';
                td.appendChild(clearable ? addFilterClear(control, col) : control);
                filterInputs.push(control);
            }
            cells.push(clipCell(td));
        });
        if (hasPanels) placeToggleCells(cells, () => clipCell(document.createElement('td')));
        filterRowElement.replaceChildren(...cells);
        filterInputs.forEach(inp => inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => {
            syncFilterClears();
            currentPage = 1;
            if (isRemote) {
                clearTimeout(filterTimer);
                filterTimer = setTimeout(render, 300);
            } else {
                onFilter?.({ filters: filterInputs.map(i => ({ column: activeColumns[parseInt(i.dataset.col)]?.name, value: i.value })) });
                render();
            }
        }, { signal }));
        syncFilterClears();
    };

    buildFilterRow();
    if (filterRowElement) thead.appendChild(filterRowElement);

    const tbody = document.createElement('tbody');
    let loadingIndicator, loadingBadge, loadingSpinner, loadingText, loadingShowTimer;

    const isSafeHref = (href) => {
        if (!href) return false;
        if (href.startsWith('/')) return true;
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

    const panelUrl = (panel, value, withFilters = true) => {
        const encoded = encodeURIComponent(value);
        const base = panel.idInPath
            ? `${panel.dataSource.replace(/\/+$/, '')}/${encoded}`
            : `${panel.dataSource}${panel.dataSource.includes('?') ? '&' : '?'}id=${encoded}`;
        const params = withFilters ? panelFilterParams(panel) : [];
        return params.length ? `${base}${base.includes('?') ? '&' : '?'}${params.join('&')}` : base;
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
            node.style.cursor = 'pointer';
            return node;
        };
        const toggleClasses = partClass('toggle-subgrid', partClass(`toggle-subgrid-${sub.order + 1}`)).split(' ');
        const opensMenu = panelCount > 1;
        const node = markupNode();
        if (node) {
            node.classList.add(...toggleClasses);
            if (opensMenu) {
                node.dataset.vgridMenu = '1';
                node.setAttribute('aria-haspopup', 'menu');
            }
            return node;
        }
        const button = document.createElement('button');
        button.type = 'button';
        button.className = toggleClasses.join(' ');
        if (opensMenu) {
            button.dataset.vgridMenu = '1';
            button.setAttribute('aria-haspopup', 'menu');
        }
        button.textContent = opensMenu ? SUBGRID_MENU : SUBGRID_CLOSED;
        return button;
    };

    const panelNotice = (kind, text) => {
        const box = document.createElement('div');
        box.className = partClass(`panel-${kind}`);
        if (kind === 'loading') {
            const spinner = document.createElement('span');
            spinner.className = 'vgrid-spinner';
            spinner.setAttribute('aria-hidden', 'true');
            box.appendChild(spinner);
        }
        box.appendChild(document.createTextNode(text));
        return box;
    };

    const failureReason = error => {
        const message = String(error?.message || '').trim();
        if (/^\d{3}$/.test(message)) return `the server answered ${message}`;
        return message ? message.charAt(0).toLowerCase() + message.slice(1) : 'the response could not be read';
    };

    const panelLabel = panel => panel?.label || panel?.name || 'details';

    const setToggleState = (sub, toggle, open, panel) => {
        if (!sub.toggleMarkup) toggle.textContent = toggle.dataset.vgridMenu ? SUBGRID_MENU : open ? SUBGRID_OPEN : SUBGRID_CLOSED;
        toggle.title = open ? `Showing ${panelLabel(panel)}` : toggle.dataset.vgridPanel ? `Show ${toggle.dataset.vgridPanel}` : 'Choose what to show';
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    const panelCaption = panel => {
        const caption = panel?.caption;
        return caption === false || caption === undefined || caption === null ? '' : String(caption).trim();
    };

    const fillPanel = (body, panel, row, entry) => {
        entry.instance?.destroy();
        entry.instance = null;
        const token = entry.token = (entry.token || 0) + 1;
        entry.ready = false;
        const ready = () => {
            if (entry.token !== token) return;
            entry.ready = true;
            syncPanelHeight(entry);
        };
        const caption = panelCaption(panel);
        const content = document.createElement('div');
        const captionEl = document.createElement('div');
        captionEl.className = partClass('subgrid-caption');
        const captionText = document.createElement('span');
        captionText.className = partClass('subgrid-title');
        if (caption) captionText.innerHTML = caption;
        captionEl.append(captionText, entry.close);
        body.replaceChildren(captionEl, content);
        const value = panelValue(panel, row);
        if (value === '') {
            content.textContent = `No "${panel.id}" value on this row.`;
            ready();
            return;
        }
        if (panel.type === 'grid') {
            const host = document.createElement('div');
            const loading = panelNotice('loading', 'Loading\u2026');
            host.hidden = true;
            content.replaceChildren(loading, host);
            entry.instance = vGrid({
                el: host,
                columns: panel.columns || [],
                dataSource: panelUrl(panel, value, false),
                method: panel.method || 'GET',
                headers: panel.headers || {},
                rowsPerPage: panel.rowsPerPage || 10,
                rowNumbers: panel.rowNumbers ?? rowNumbers,
                rowNumbersType: panel.rowNumbersType || rowNumbersType,
                externalFilters: panel.externalFilters || {},
                borders: panel.borders || borderPreset,
                size: panel.size || 'medium',
                easing: panel.easing ?? easingMs,
                namespace: namePrefix,
                settings: false,
                onReady: () => {
                    if (entry.token !== token) return;
                    loading.remove();
                    host.hidden = false;
                    ready();
                },
            });
            return;
        }
        content.replaceChildren(panelNotice('loading', 'Loading\u2026'));
        const url = panelUrl(panel, value);
        fetch(url, { signal, method: panel.method || 'GET', headers: requestHeaders(url, panel.headers) })
            .then(response => { if (!response.ok) throw new Error(String(response.status)); return response.text(); })
            .then(text => {
                if (!content.isConnected || entry.token !== token) return;
                if (!String(text).trim()) {
                    content.replaceChildren(panelNotice('empty', `Nothing to show here for ${panelLabel(panel)}.`));
                } else if (panel.type === 'html') {
                    content.innerHTML = text;
                } else {
                    const pre = document.createElement('pre');
                    pre.className = partClass('panel-text');
                    pre.textContent = text;
                    content.replaceChildren(pre);
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
        entry.panelRow.remove();
    };

    const closePanel = (sub, tr) => {
        const entry = sub.entries.get(tr);
        if (!entry) return;
        sub.entries.delete(tr);
        setToggleState(sub, entry.toggle, false);
        entry.state = 'closing';
        entry.observer?.disconnect();
        entry.observer = null;
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
        const panelRow = document.createElement('tr');
        panelRow.dataset.vgridSubgrid = '1';
        const cell = document.createElement('td');
        cell.colSpan = totalCols;
        cell.className = partClass('subgrid-cell');
        const slide = document.createElement('div');
        slide.className = partClass('subgrid-slide');
        slide.style.height = '0px';
        slide.style.overflow = 'hidden';
        const clip = document.createElement('div');
        clip.className = partClass('subgrid-clip');
        const body = document.createElement('div');
        body.className = partClass('subgrid-body');
        const close = document.createElement('button');
        close.type = 'button';
        close.className = partClass('subgrid-close');
        close.textContent = '\u00D7';
        close.title = 'Close';
        close.setAttribute('aria-label', 'Close');
        close.addEventListener('click', () => closePanel(sub, tr), { signal });
        const entry = { panelRow, toggle, body, slide, clip, close, state: 'opening', ready: false, observer: null, instance: null, panel: null };
        sub.entries.set(tr, entry);
        clip.appendChild(body);
        slide.appendChild(clip);
        cell.appendChild(slide);
        panelRow.appendChild(cell);
        const attached = panelRowsOf(tr);
        (attached[attached.length - 1] || tr).after(panelRow);
        slide.style.height = '0px';
        showPanelContent(sub, entry, panel, row);
        entry.observer = new ResizeObserver(() => syncPanelHeight(entry));
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
        const item = document.createElement('button');
        item.type = 'button';
        item.className = partClass('panel-menu-item');
        item.setAttribute('role', selectable ? 'menuitemradio' : 'menuitem');
        if (selectable) item.setAttribute('aria-checked', current ? 'true' : 'false');
        item.textContent = text;
        item.title = text;
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
            item.addEventListener('click', () => {
                hidePanelMenus();
                selectPanel(sub, tr, row, toggle, panel);
            }, { signal });
            if (current || (!focusItem && !entry && panel === sub.defaultPanel)) focusItem = item;
            sub.menu.appendChild(item);
        });
        if (entry) {
            const hide = panelMenuItem('Hide', false, false);
            hide.addEventListener('click', () => {
                hidePanelMenus();
                closePanel(sub, tr);
            }, { signal });
            sub.menu.appendChild(hide);
        }
        sub.menuOwner = toggle;
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
            });
            sub.entries.clear();
        });
    };

    const dataRows = () => Array.from(tbody.rows).filter(tr => !tr.dataset.vgridSubgrid && !tr.dataset.vgridEmpty);

    const emptyRow = () => {
        const tr = document.createElement('tr');
        tr.dataset.vgridEmpty = '1';
        tr.className = partClass('empty');
        const td = document.createElement('td');
        td.colSpan = totalCols;
        td.textContent = 'No records to show.';
        tr.appendChild(td);
        colSpanCells.push(td);
        return tr;
    };

    const buildRows = (rows, offset = 0) => {
        clearSubgrids();
        tbody.innerHTML = '';
        if (!rows.length) {
            tbody.appendChild(emptyRow());
            return;
        }
        rows.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.className = partClass('row', row.id !== undefined && namePrefix ? `${namePrefix}-row-${row.id}` : '');
            const cells = [];
            if (rowNumbers) {
                const td = document.createElement('td');
                td.textContent = rowKeyColumn
                    ? String(row[rowKeyColumn.name] ?? '')
                    : rowNumbersType === 'sequential'
                    ? String(offset + index + 1)
                    : String(row[rowNumbersType] ?? '');
                cells.push(clipCell(td));
            }
            activeColumns.forEach(col => {
                const td = document.createElement('td');
                const value = row[col.name] ?? '';
                if (col.type === 'link' && isSafeHref(row.link)) {
                    const a = document.createElement('a');
                    a.href = row.link;
                    a.textContent = value;
                    td.appendChild(a);
                } else if (col.type === 'html') {
                    td.innerHTML = value;
                } else if (col.type === 'enum') {
                    td.textContent = col.options?.[value] ?? value;
                } else {
                    td.textContent = value;
                }
                cells.push(clipCell(td));
            });
            if (hasPanels) {
                placeToggleCells(cells, sub => {
                    const td = document.createElement('td');
                    const available = availablePanels(sub, row);
                    if (available.length) {
                        const toggle = createToggle(sub, available.length);
                        if (available.length === 1) toggle.dataset.vgridPanel = panelLabel(available[0]);
                        setToggleState(sub, toggle, false);
                        toggle.addEventListener('click', () => {
                            if (sub.menuOwner === toggle && sub.menu.matches(':popover-open')) { hidePanelMenus(); return; }
                            if (sub.menuOwner === toggle && Date.now() - sub.menuClosedAt < 200) return;
                            if (available.length === 1) { selectPanel(sub, tr, row, toggle, available[0]); return; }
                            showPanelMenu(sub, tr, row, toggle);
                        }, { signal });
                        if (toggle.tagName !== 'BUTTON') {
                            toggle.addEventListener('keydown', event => {
                                if (event.key !== 'Enter' && event.key !== ' ') return;
                                event.preventDefault();
                                toggle.click();
                            }, { signal });
                        }
                        td.appendChild(toggle);
                    }
                    return td;
                });
            }
            cells.forEach(cell => tr.appendChild(cell));
            tbody.appendChild(tr);
        });
    };

    const loadingSpacer = () => {
        const tr = document.createElement('tr');
        tr.dataset.vgridLoadingSpace = '1';
        tr.className = partClass('loading-space');
        const td = document.createElement('td');
        td.colSpan = totalCols;
        tr.appendChild(td);
        colSpanCells.push(td);
        return tr;
    };

    const dropLoadingSpacer = () => {
        Array.from(tbody.querySelectorAll('[data-vgrid-loading-space]')).forEach(tr => tr.remove());
    };

    const placeLoadingIndicator = () => {
        loadingIndicator.style.top = `${tbody.offsetTop}px`;
        loadingIndicator.style.height = `${Math.max(tbody.offsetHeight, 40)}px`;
    };

    const showLoading = () => {
        if (!tbody.rows.length) tbody.appendChild(loadingSpacer());
        placeLoadingIndicator();
        Array.from(tbody.rows).forEach(row => {
            if (row.dataset.vgridLoadingSpace) return;
            row.style.filter = 'blur(1px)';
            row.style.opacity = '.55';
        });
        clearTimeout(loadingShowTimer);
        loadingShowTimer = setTimeout(() => {
            loadingBadge.classList.remove('vgrid-loading-error');
            loadingSpinner.hidden = false;
            loadingText.textContent = 'Loading…';
            loadingIndicator.setAttribute('aria-live', 'polite');
            loadingIndicator.hidden = false;
            loadingIndicator.style.display = 'flex';
            placeLoadingIndicator();
        }, 200);
    };

    const hideLoading = () => {
        clearTimeout(loadingShowTimer);
        dropLoadingSpacer();
        Array.from(tbody.rows).forEach(row => {
            row.style.filter = '';
            row.style.opacity = '';
        });
        loadingIndicator.hidden = true;
        loadingIndicator.style.display = 'none';
    };

    if (!isRemote) buildRows(data);

    if (rowsPerPage && (showPagination || showRowsPerPage)) tfoot.appendChild(makeBar());

    if (bottomActions) {
        const tr = document.createElement('tr');
        tr.className = partClass('actions-row');
        const td = document.createElement('td');
        td.colSpan = totalCols;
        td.appendChild(makeActions());
        tr.appendChild(td);
        colSpanCells.push(td);
        tfoot.appendChild(tr);
    }

    element.innerHTML = '';
    element.appendChild(colgroup);
    element.appendChild(thead);
    element.appendChild(tbody);
    if ((rowsPerPage && (showPagination || showRowsPerPage)) || bottomActions) element.appendChild(tfoot);
    const gridWrapper = document.createElement('div');
    gridWrapper.className = 'vgrid-wrapper';
    gridWrapper.dataset.vgridBorders = borderPreset;
    gridWrapper.dataset.vgridSize = sizePreset;
    gridWrapper.style.cssText = 'display:block;position:relative;width:100%;overflow:hidden;';
    gridWrapper.style.setProperty('--vgrid-easing', `${easingMs}ms`);
    element.replaceWith(gridWrapper);
    gridWrapper.appendChild(element);
    gridWrapper.appendChild(settingsPanel);
    subgrids.forEach(sub => gridWrapper.appendChild(sub.menu));
    loadingIndicator = document.createElement('output');
    loadingIndicator.setAttribute('aria-live', 'polite');
    loadingIndicator.hidden = true;
    loadingIndicator.style.cssText = 'position:absolute;left:0;width:100%;display:none;align-items:center;justify-content:center;padding:0 .5em;box-sizing:border-box;pointer-events:none;';
    loadingBadge = document.createElement('span');
    loadingBadge.className = 'vgrid-loading-badge';
    loadingSpinner = document.createElement('span');
    loadingSpinner.className = 'vgrid-spinner';
    loadingSpinner.setAttribute('aria-hidden', 'true');
    loadingText = document.createElement('span');
    loadingText.className = 'vgrid-loading-text';
    loadingBadge.append(loadingSpinner, loadingText);
    loadingIndicator.appendChild(loadingBadge);
    gridWrapper.appendChild(loadingIndicator);

    let sortColIndex = sortBy ? activeColumns.findIndex(c => c.name === sortBy.column) : null;
    let sortOrder    = sortBy ? (sortBy.order || 'asc') : null;
    let currentPage  = 1;
    let fetchAbort   = null;
    let filterTimer  = null;
    let resizeState  = null;
    let columnsFrozen = false;
    let cursorHost = null;
    let suppressHeaderClick = false;
    const MIN_COLUMN_WIDTH = 40;
    const EDGE_TOLERANCE = 6;
    let pageSizeSource = externalRowsPerPageElement ? 'external' : 'grid';

    const fetchData = () => {
        if (fetchAbort) fetchAbort.abort();
        fetchAbort = new AbortController();

        const ps      = pageSizeSource === 'external' && externalRowsPerPageElement
            ? parseInt(externalRowsPerPageElement.value)
            : (rowsPerPageSelects[0] ? parseInt(rowsPerPageSelects[0].value) : (rowsPerPage || 0));
        const usePost = method.toUpperCase() === 'POST';

        const filter = {};
        filterInputs.forEach(inp => {
            if (inp.value) filter[activeColumns[parseInt(inp.dataset.col)].name] = inp.value;
        });
        externalFilterInputs.forEach(({ column, element }) => {
            if (element.value) filter[column] = element.value;
        });
        const payload = { page: currentPage };
        if (ps) payload.limit = ps;
        if (sortColIndex !== null && sortColIndex !== -1) {
            payload.sort = activeColumns[sortColIndex].name;
            payload.dir  = sortOrder || 'asc';
        }
        if (activeColumns.length !== columns.length) payload.columns = activeColumns.map(column => column.name).join(',');
        Object.assign(payload, filter);

        showLoading();

        const getUrl = () => {
            const p = new URLSearchParams({ page: payload.page });
            if (payload.limit)     p.set('limit', payload.limit);
            if (payload.sort)      p.set('sort', payload.sort);
            if (payload.dir)       p.set('dir', payload.dir);
            if (payload.columns)   p.set('columns', payload.columns);
            Object.entries(filter).forEach(([k, v]) => p.set(k, v));
            return `${dataSource}${dataSource.includes('?') ? '&' : '?'}${p}`;
        };

        const url = usePost ? dataSource : getUrl();
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
                const totalRows = Number.isFinite(total) ? total : rows.length;
                const pageSize  = Number.isFinite(ps2) && ps2 > 0 ? ps2 : null;
                const pageNo    = Number.isFinite(pg) && pg > 0 ? pg : currentPage;
                currentPage = pageNo;
                buildRows(rows, pageSize ? (pageNo - 1) * pageSize : 0);
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
                    const from = totalRows ? (pageNo - 1) * pageSize + 1 : 0;
                    const to   = Math.min((pageNo - 1) * pageSize + pageSize, totalRows);
                    infoEls.forEach(el => { el.textContent = `Showing ${from}–${to} of ${totalRows}`; });
                    pagerEls.forEach(el => renderPageButtons(el, totalPages));
                    onPage?.({ page: pageNo, rowsPerPage: pageSize, total: totalRows });
                }
                onReady?.({ total: totalRows, rows: rows.length });
            })
            .catch(err => {
                if (err.name === 'AbortError') return;
                clearTimeout(loadingShowTimer);
                Array.from(tbody.rows).forEach(row => {
                    row.style.filter = '';
                    row.style.opacity = '';
                });
                loadingBadge.classList.add('vgrid-loading-error');
                loadingSpinner.hidden = true;
                loadingText.textContent = `${err.message || 'The data could not be loaded'}.`;
                loadingIndicator.setAttribute('aria-live', 'assertive');
                loadingIndicator.hidden = false;
                loadingIndicator.style.display = 'flex';
                placeLoadingIndicator();
                console.error('vGrid fetch error:', err);
                onReady?.({ error: err });
            });
    };

    const pageRange = (current, total) => {
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
        if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
        if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
        return [1, '…', current - 1, current, current + 1, '…', total];
    };

    const renderPageButtons = (pagerEl, totalPages) => {
        pagerEl.innerHTML = '';
        const btn = (label, page, disabled, active, ariaLabel) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = label;
            if (active) b.setAttribute('aria-current', 'page');
            if (ariaLabel) b.setAttribute('aria-label', ariaLabel);
            b.disabled = disabled;
            b.addEventListener('click', () => { currentPage = page; render(); }, { signal });
            return b;
        };
        pagerEl.appendChild(btn('«', 1, currentPage === 1, false, 'First page'));
        pagerEl.appendChild(btn('‹', currentPage - 1, currentPage === 1, false, 'Previous page'));
        pageRange(currentPage, totalPages).forEach(p => {
            if (p === '…') {
                const span = document.createElement('span');
                span.className = partClass('pager-ellipsis');
                span.textContent = '…';
                pagerEl.appendChild(span);
            } else {
                pagerEl.appendChild(btn(p, p, false, p === currentPage));
            }
        });
        pagerEl.appendChild(btn('›', currentPage + 1, currentPage === totalPages, false, 'Next page'));
        pagerEl.appendChild(btn('»', totalPages, currentPage === totalPages, false, 'Last page'));
    };

    const render = () => {
        if (isRemote) { fetchData(); return; }

        const filterVals = filterInputs.map(inp => ({
            colIdx: parseInt(inp.dataset.col),
            val:    inp.value.toLowerCase()
        }));

        const allRows = dataRows();
        const filtered = allRows.filter(tr =>
            filterVals.every(({ colIdx, val }) => {
                if (!val) return true;
                const cell = tr.cells[cellIndexOf(colIdx)];
                return cell && cell.textContent.toLowerCase().includes(val);
            })
        );

        const ps = rowsPerPageSelects[0] ? parseInt(rowsPerPageSelects[0].value) : (rowsPerPage || 0);
        const totalPages = Math.max(1, ps ? Math.ceil(filtered.length / ps) : 1);
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const start   = ps ? (currentPage - 1) * ps : 0;
        const pageSet = new Set(ps ? filtered.slice(start, start + ps) : filtered);

        let rowNum = start + 1;
        allRows.forEach(tr => {
            const visible = pageSet.has(tr);
            tr.hidden = !visible;
            panelRowsOf(tr).forEach(panelRow => { panelRow.hidden = !visible; });
            if (visible && rowNumbers && !rowKeyColumn && rowNumbersType === 'sequential') tr.cells[rowNumberCellIndex()].textContent = String(rowNum++);
        });

        if (ps) {
            const from = filtered.length ? start + 1 : 0;
            const to   = Math.min(start + ps, filtered.length);
            infoEls.forEach(el => { el.textContent = `Showing ${from}–${to} of ${filtered.length}`; });
            pagerEls.forEach(el => renderPageButtons(el, totalPages));
            onPage?.({ page: currentPage, rowsPerPage: ps, total: filtered.length });
        }
    };

    const compare = (a, b) => {
        const numA = parseFloat(a), numB = parseFloat(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
    };

    const updateSortIndicators = () => {
        columnHeaders.forEach((th, i) => {
            const active = i === sortColIndex;
            th.setAttribute('aria-sort', active ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none');
            th.textContent = active ? `${columnHeaderLabels[i]} ${sortOrder === 'asc' ? '▲' : '▼'}` : columnHeaderLabels[i];
        });
    };

    const applySort = () => {
        updateSortIndicators();
        if (externalSortColumnElement) externalSortColumnElement.value = activeColumns[sortColIndex]?.name ?? '';
        if (externalSortDirectionElement) externalSortDirectionElement.value = sortOrder || 'asc';
        onSort?.({ column: activeColumns[sortColIndex]?.name, order: sortOrder });

        if (isRemote) { render(); return; }

        const rows = dataRows();
        const attachedPanelRows = new Map(rows.map(tr => [tr, panelRowsOf(tr)]));
        rows.sort((a, b) => {
            const aVal = (a.cells[cellIndexOf(sortColIndex)] || {}).textContent || '';
            const bVal = (b.cells[cellIndexOf(sortColIndex)] || {}).textContent || '';
            return sortOrder === 'asc' ? compare(aVal, bVal) : compare(bVal, aVal);
        });
        rows.forEach(row => {
            tbody.appendChild(row);
            attachedPanelRows.get(row)?.forEach(panelRow => tbody.appendChild(panelRow));
        });
        render();
    };

    const rebuildColumns = () => {
        const keptFilters = new Map(filterInputs
            .map(inp => [activeColumns[parseInt(inp.dataset.col)]?.name, inp.value])
            .filter(([name, value]) => name && value));
        const sortName = sortColIndex !== null && sortColIndex !== -1 ? activeColumns[sortColIndex]?.name : null;

        activeColumns = columns.filter(column => column.active !== false);
        totalCols = activeColumns.length + colOffset;
        computeToggleIndexes();

        if (sortName) {
            sortColIndex = activeColumns.findIndex(column => column.name === sortName);
            if (sortColIndex === -1) {
                sortColIndex = null;
                sortOrder = null;
            }
        }

        buildColgroup();
        buildHeaderRow();
        buildFilterRow();
        updateColSpans();
        buildExternalSortOptions();

        filterInputs.forEach(inp => {
            const value = keptFilters.get(activeColumns[parseInt(inp.dataset.col)]?.name);
            if (value) inp.value = value;
        });
        syncFilterClears();

        columnsFrozen = false;
        element.style.tableLayout = 'auto';
        updateSortIndicators();
        currentPage = 1;

        if (isRemote) { fetchData(); return; }
        buildRows(localData);
        if (sortColIndex !== null && sortColIndex !== -1) applySort();
        else render();
    };

    const applyColumnWidths = widths => {
        const total = widths.reduce((sum, width) => sum + width, 0);
        if (!total) return;
        columnCols.forEach((col, i) => { col.style.width = `${(widths[i] / total) * 100}%`; });
    };

    const pixelWidth = value => {
        if (typeof value === 'number') return Number.isFinite(value) ? value : null;
        const text = String(value ?? '').trim();
        return /^\d+(\.\d+)?(px)?$/.test(text) ? parseFloat(text) : null;
    };

    const freezeColumns = () => {
        if (columnsFrozen || !element.getBoundingClientRect().width) return;
        const widths = headerCells.map((th, i) => {
            const configured = pixelWidth(columnAtCell(i)?.width);
            const width = configured ?? th.getBoundingClientRect().width;
            const minimum = isToggleCell(i) ? 0 : MIN_COLUMN_WIDTH;
            return Math.max(minimum, width || minimum);
        });
        headerCells.forEach(th => th.removeAttribute('width'));
        element.style.tableLayout = 'fixed';
        applyColumnWidths(widths);
        columnsFrozen = true;
    };

    const dividerIndexAt = event => {
        const index = headerCells.findIndex(th => Math.abs(th.getBoundingClientRect().right - event.clientX) <= EDGE_TOLERANCE);
        return index === headerCells.length - 1 ? -1 : index;
    };

    const resizableRow = target => {
        const row = target?.closest?.('tr');
        return !!row && (row === headerRow || row === filterRowElement);
    };

    const resizeColumns = delta => {
        const { index, widths } = resizeState;
        const next = widths.slice();
        const room = i => Math.max(0, widths[i] - MIN_COLUMN_WIDTH);
        let available = 0;
        for (let i = index + 1; i < widths.length; i++) available += delta > 0 ? room(i) : widths[i];
        const move = delta > 0 ? Math.min(delta, available) : Math.min(-delta, room(index));
        if (available > 0) {
            for (let i = index + 1; i < widths.length; i++) {
                const share = (delta > 0 ? room(i) : widths[i]) / available;
                next[i] = widths[i] + (delta > 0 ? -share * move : share * move);
            }
        }
        next[index] = widths[index] + (delta > 0 ? move : -move);
        applyColumnWidths(next);
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

    externalFilterInputs.forEach(({ element }) => element.addEventListener('change', () => {
        currentPage = 1;
        render();
    }, { signal }));

    externalRowsPerPageElements.forEach(select => select.addEventListener('change', () => {
        externalRowsPerPageElements.forEach(other => { other.value = select.value; });
        pageSizeSource = 'external';
        currentPage = 1;
        render();
    }, { signal }));

    if (externalSortColumnElement) {
        externalSortColumnElement.addEventListener('change', () => {
            const idx = activeColumns.findIndex(c => c.name === externalSortColumnElement.value);
            if (idx === -1) return;
            sortOrder = idx === sortColIndex ? (sortOrder || 'asc') : (externalSortDirectionElement?.value || 'asc');
            sortColIndex = idx;
            currentPage = 1;
            applySort();
        }, { signal });
    }

    if (externalSortDirectionElement) {
        externalSortDirectionElement.addEventListener('change', () => {
            if (sortColIndex === null || sortColIndex === -1) return;
            sortOrder = externalSortDirectionElement.value === 'desc' ? 'desc' : 'asc';
            currentPage = 1;
            applySort();
        }, { signal });
    }

    rowsPerPageSelects.forEach(select => select.addEventListener('change', () => {
        rowsPerPageSelects.forEach(other => { other.value = select.value; });
        pageSizeSource = 'grid';
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
            currentPage = 1;
            if (isRemote) { fetchData(); return instance; }
            if (newData !== undefined) {
                if (!Array.isArray(newData)) { console.error('vGrid: reload() expects an array of rows.'); return instance; }
                localData = newData;
                buildRows(newData);
                updatePageSizeOptions(newData.length);
            }
            if (sortColIndex !== null && sortColIndex !== -1) applySort();
            else render();
            return instance;
        },

        setPage(n) {
            const page = parseInt(n);
            if (!Number.isFinite(page) || page < 1) { console.error('vGrid: setPage() expects a page number of 1 or greater.'); return instance; }
            currentPage = page;
            render();
            return instance;
        },

        sort(column, order = 'asc') {
            const idx = activeColumns.findIndex(c => c.name === column);
            if (idx === -1) { console.warn(`vGrid: column "${column}" not found`); return instance; }
            sortColIndex = idx;
            sortOrder = order;
            applySort();
            return instance;
        },

        destroy() {
            controller.abort();
            if (resizeState) {
                resizeState = null;
                document.body.style.cursor = '';
            }
            if (fetchAbort) fetchAbort.abort();
            clearSubgrids();
            subgrids.forEach(sub => sub.menu.remove());
            clearTimeout(filterTimer);
            clearTimeout(loadingShowTimer);
            loadingIndicator.remove();
            settingsPanel.remove();
            settingsButton?.remove();
            refreshButton?.remove();
            if (createdTable) gridWrapper.remove();
            else {
                gridWrapper.replaceWith(element);
                element.innerHTML = '';
                element.style.width = '';
                element.style.maxWidth = '';
                element.style.borderCollapse = '';
                element.style.tableLayout = '';
                element.style.userSelect = '';
            }
        }
    };

    return instance;
}
