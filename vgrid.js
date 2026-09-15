/* vGrid v1.0.0.5.29 | Last updated: 2026-09-09 */
function vGrid(config) {

    const { el, caption, columns = [], data = [], dataSource, method = 'GET',
        rowNumbers = true, rowNumbersType = 'sequential',
        filterRow = true, sortBy, rowsPerPage: rowsPerPageConfig, rowsPerPageOptions: rowsPerPageOptionsConfig, showPaginationControls = true,
        showPagination = showPaginationControls, showRowsPerPage = showPaginationControls,
        externalFilters = {}, externalRowsPerPage, externalPagination, externalSort = {}, externalSummary = {},
        settings = true, externalSettings,
        onSort, onFilter, onPage } = config;

    const toPageSize = value => {
        const size = parseInt(value);
        return Number.isFinite(size) && size > 0 ? size : null;
    };
    const rowsPerPage = toPageSize(rowsPerPageConfig) ?? undefined;
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

    const externalFilterInputs = Object.entries(externalFilters)
        .map(([column, selector]) => ({ column, element: typeof selector === 'string' ? document.querySelector(selector) : selector }))
        .filter(({ column, element }) => {
            if (element) return true;
            console.error(`vGrid: external filter for "${column}" was not found.`);
            return false;
        });
    const externalRowsPerPageElement = typeof externalRowsPerPage === 'string'
        ? document.querySelector(externalRowsPerPage)
        : externalRowsPerPage;

    if (externalRowsPerPage && !externalRowsPerPageElement) {
        console.error('vGrid: external rows-per-page control was not found.');
    }

    const resolveExternal = selector => typeof selector === 'string' ? document.querySelector(selector) : selector;
    const externalPaginationElement = resolveExternal(externalPagination);
    if (externalPagination && !externalPaginationElement) {
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
    element.border = '1';
    element.rules = 'all';
    element.style.width = '100%';
    element.style.maxWidth = '100%';
    element.style.borderCollapse = 'collapse';
    element.style.tableLayout = 'auto';

    const colOffset = rowNumbers ? 1 : 0;
    let totalCols = activeColumns.length + colOffset;
    const colgroup = document.createElement('colgroup');
    const columnCols = [];
    const colSpanCells = [];
    const buildColgroup = () => {
        columnCols.length = 0;
        colgroup.replaceChildren(...Array.from({ length: totalCols }, () => {
            const col = document.createElement('col');
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
    const addBorders = tr => {
        tr.style.border = '1px solid';
        Array.from(tr.cells).forEach(cell => { cell.style.border = '1px solid'; });
        return tr;
    };

    const controller = new AbortController();
    const { signal } = controller;

    const thead = document.createElement('thead');
    const tfoot = document.createElement('tfoot');

    const settingsPanel = document.createElement('div');
    let settingsButton = null;

    if (settings && columns.length) {
        vGrid.instanceCount = (vGrid.instanceCount || 0) + 1;
        settingsPanel.id = `vgrid-settings-${vGrid.instanceCount}`;
        settingsPanel.setAttribute('popover', '');
        settingsButton = document.createElement('button');
        settingsButton.type = 'button';
        settingsButton.title = 'Settings';
        settingsButton.textContent = '\u2699\uFE0E';
        settingsButton.setAttribute('popovertarget', settingsPanel.id);

        const fieldset = document.createElement('fieldset');
        const legend = document.createElement('legend');
        legend.textContent = 'Display columns';
        fieldset.appendChild(legend);
        columns.forEach(col => {
            const row = document.createElement('label');
            row.style.display = 'block';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = col.active !== false;
            checkbox.addEventListener('change', () => {
                if (!checkbox.checked && columns.filter(c => c.active !== false).length === 1) {
                    checkbox.checked = true;
                    return;
                }
                col.active = checkbox.checked;
                rebuildColumns();
            }, { signal });
            row.append(checkbox, document.createTextNode(` ${col.label || col.name}`));
            fieldset.appendChild(row);
        });
        settingsPanel.appendChild(fieldset);
    }

    const inlineSettings = settingsButton && !externalSettingsElement;

    if (caption || inlineSettings) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = totalCols;
        if (caption) td.innerHTML = caption;
        if (inlineSettings) {
            settingsButton.style.float = 'right';
            td.insertBefore(settingsButton, td.firstChild);
        }
        tr.appendChild(td);
        colSpanCells.push(td);
        thead.appendChild(addBorders(tr));
    }

    if (settingsButton && externalSettingsElement) externalSettingsElement.replaceChildren(settingsButton);

    const infoEls = [], pagerEls = [], rowsPerPageSelects = [];

    if (externalPaginationElement) {
        const info = document.createElement('span');
        const pager = document.createElement('span');
        externalPaginationElement.replaceChildren(info, document.createTextNode(' '), pager);
        infoEls.push(info);
        pagerEls.push(pager);
    }

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
        const td = document.createElement('td');
        td.colSpan = totalCols;
        const left = document.createElement('span');
        const center = document.createElement('span');
        const right = document.createElement('span');

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
        return addBorders(tr);
    };

    if (rowsPerPage && (showPagination || showRowsPerPage)) thead.appendChild(makeBar());

    const headerRow = document.createElement('tr');
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
            headerCells.push(th);
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
            headerCells.push(th);
            columnHeaderLabels.push(th.textContent);
        });
        headerRow.replaceChildren(...cells);
        addBorders(headerRow);
    };

    buildHeaderRow();
    thead.appendChild(headerRow);

    const filterInputs = [];
    const filterRowElement = filterRow ? document.createElement('tr') : null;

    const buildFilterRow = () => {
        if (!filterRowElement) return;
        filterInputs.length = 0;
        const cells = [];
        if (rowNumbers) cells.push(clipCell(document.createElement('td')));
        activeColumns.forEach((col, i) => {
            const td = document.createElement('td');
            if (col.filter !== false) {
                if (col.filterType === 'select') {
                    const select = document.createElement('select');
                    select.dataset.col = String(i);
                    (col.filterOptions || '').split(';').forEach(pair => {
                        const sep = pair.indexOf(':');
                        const val  = sep === -1 ? pair : pair.slice(0, sep);
                        const text = sep === -1 ? pair : pair.slice(sep + 1);
                        const o = document.createElement('option');
                        o.value = val; o.textContent = text;
                        select.appendChild(o);
                    });
                    select.style.width = '100%';
                    select.style.boxSizing = 'border-box';
                    td.appendChild(select);
                    filterInputs.push(select);
                } else {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.placeholder = col.label || col.name;
                    input.dataset.col = String(i);
                    input.style.width = '100%';
                    input.style.boxSizing = 'border-box';
                    td.appendChild(input);
                    filterInputs.push(input);
                }
            }
            cells.push(clipCell(td));
        });
        filterRowElement.replaceChildren(...cells);
        addBorders(filterRowElement);
        filterInputs.forEach(inp => inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => {
            currentPage = 1;
            if (isRemote) {
                clearTimeout(filterTimer);
                filterTimer = setTimeout(render, 300);
            } else {
                onFilter?.({ filters: filterInputs.map(i => ({ column: activeColumns[parseInt(i.dataset.col)]?.name, value: i.value })) });
                render();
            }
        }, { signal }));
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

    const buildRows = (rows, offset = 0) => {
        tbody.innerHTML = '';
        rows.forEach((row, index) => {
            const tr = document.createElement('tr');
            if (row.id !== undefined) tr.id = row.id;
            if (rowNumbers) {
                const td = document.createElement('td');
                td.textContent = rowKeyColumn
                    ? String(row[rowKeyColumn.name] ?? '')
                    : rowNumbersType === 'sequential'
                    ? String(offset + index + 1)
                    : String(row[rowNumbersType] ?? '');
                tr.appendChild(clipCell(td));
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
                tr.appendChild(clipCell(td));
            });
            tbody.appendChild(addBorders(tr));
        });
    };

    const showLoading = () => {
        loadingIndicator.style.top = `${tbody.offsetTop}px`;
        loadingIndicator.style.height = `${tbody.offsetHeight || 40}px`;
        Array.from(tbody.rows).forEach(row => {
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
        }, 200);
    };

    const hideLoading = () => {
        clearTimeout(loadingShowTimer);
        Array.from(tbody.rows).forEach(row => {
            row.style.filter = '';
            row.style.opacity = '';
        });
        loadingIndicator.hidden = true;
        loadingIndicator.style.display = 'none';
    };

    if (!isRemote) buildRows(data);

    if (rowsPerPage && (showPagination || showRowsPerPage)) tfoot.appendChild(makeBar());

    element.innerHTML = '';
    element.appendChild(colgroup);
    element.appendChild(thead);
    element.appendChild(tbody);
    if (rowsPerPage && (showPagination || showRowsPerPage)) element.appendChild(tfoot);
    const gridWrapper = document.createElement('div');
    gridWrapper.style.cssText = 'display:block;position:relative;width:100%;overflow:hidden;';
    element.replaceWith(gridWrapper);
    gridWrapper.appendChild(element);
    gridWrapper.appendChild(settingsPanel);
    loadingIndicator = document.createElement('output');
    loadingIndicator.setAttribute('aria-live', 'polite');
    loadingIndicator.hidden = true;
    loadingIndicator.style.cssText = 'position:absolute;left:0;width:100%;display:none;align-items:center;justify-content:center;pointer-events:none;';
    loadingBadge = document.createElement('span');
    loadingBadge.className = 'vgrid-loading-badge';
    loadingSpinner = document.createElement('span');
    loadingSpinner.className = 'vgrid-spinner';
    loadingSpinner.setAttribute('aria-hidden', 'true');
    loadingText = document.createElement('span');
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
            return `${dataSource}?${p}`;
        };

        const fetchOpts = usePost
            ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: fetchAbort.signal }
            : { signal: fetchAbort.signal };

        fetch(usePost ? dataSource : getUrl(), fetchOpts)
            .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(({ data: rows, total, page: pg, limit: ps2, summary }) => {
                if (!Array.isArray(rows)) throw new Error('response field "data" must be an array');
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
                loadingText.textContent = 'Failed to load data.';
                loadingIndicator.setAttribute('aria-live', 'assertive');
                loadingIndicator.hidden = false;
                loadingIndicator.style.display = 'flex';
                console.error('vGrid fetch error:', err);
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
            b.textContent = label;
            b.setAttribute('aria-current', active ? 'page' : 'false');
            if (ariaLabel) b.setAttribute('aria-label', ariaLabel);
            b.disabled = disabled;
            b.addEventListener('click', () => { currentPage = page; render(); }, { signal });
            return b;
        };
        pagerEl.appendChild(btn('«', 1, currentPage === 1, false, 'First page'));
        pagerEl.appendChild(btn('←', currentPage - 1, currentPage === 1, false, 'Previous page'));
        pageRange(currentPage, totalPages).forEach(p => {
            if (p === '…') {
                const span = document.createElement('span');
                span.textContent = '…';
                pagerEl.appendChild(span);
            } else {
                pagerEl.appendChild(btn(p, p, false, p === currentPage));
            }
        });
        pagerEl.appendChild(btn('→', currentPage + 1, currentPage === totalPages, false, 'Next page'));
        pagerEl.appendChild(btn('»', totalPages, currentPage === totalPages, false, 'Last page'));
    };

    const render = () => {
        if (isRemote) { fetchData(); return; }

        const filterVals = filterInputs.map(inp => ({
            colIdx: parseInt(inp.dataset.col),
            val:    inp.value.toLowerCase()
        }));

        const allRows = Array.from(tbody.rows);
        const filtered = allRows.filter(tr =>
            filterVals.every(({ colIdx, val }) => {
                if (!val) return true;
                const cell = tr.cells[colIdx + colOffset];
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
            if (visible && rowNumbers && !rowKeyColumn && rowNumbersType === 'sequential') tr.cells[0].textContent = String(rowNum++);
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

        const rows = Array.from(tbody.rows);
        rows.sort((a, b) => {
            const aVal = (a.cells[sortColIndex + colOffset] || {}).textContent || '';
            const bVal = (b.cells[sortColIndex + colOffset] || {}).textContent || '';
            return sortOrder === 'asc' ? compare(aVal, bVal) : compare(bVal, aVal);
        });
        rows.forEach(row => tbody.appendChild(row));
        render();
    };

    const rebuildColumns = () => {
        const keptFilters = new Map(filterInputs
            .map(inp => [activeColumns[parseInt(inp.dataset.col)]?.name, inp.value])
            .filter(([name, value]) => name && value));
        const sortName = sortColIndex !== null && sortColIndex !== -1 ? activeColumns[sortColIndex]?.name : null;

        activeColumns = columns.filter(column => column.active !== false);
        totalCols = activeColumns.length + colOffset;

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
            const configured = i >= colOffset ? pixelWidth(activeColumns[i - colOffset].width) : null;
            const width = configured ?? th.getBoundingClientRect().width;
            return Math.max(MIN_COLUMN_WIDTH, width || MIN_COLUMN_WIDTH);
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
        const overDivider = event.target.closest?.('thead') && dividerIndexAt(event) !== -1;
        setCursorHost(overDivider ? event.target : null);
    }, { capture: true, signal });
    element.addEventListener('pointerleave', () => {
        if (!resizeState) setCursorHost(null);
    }, { capture: true, signal });
    element.addEventListener('pointerdown', event => {
        if (event.button !== 0 || !event.target.closest?.('thead')) return;
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

    if (externalRowsPerPageElement) {
        externalRowsPerPageElement.addEventListener('change', () => {
            pageSizeSource = 'external';
            currentPage = 1;
            render();
        }, { signal });
    }

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
            clearTimeout(filterTimer);
            clearTimeout(loadingShowTimer);
            loadingIndicator.remove();
            settingsPanel.remove();
            settingsButton?.remove();
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
