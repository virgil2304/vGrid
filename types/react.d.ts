import type { ComponentPropsWithoutRef, ReactElement } from 'react';
import type { vGridOptions } from './index.js';

export type vGridProps<Row extends object = object> =
    Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'dangerouslySetInnerHTML'> & {
        config: vGridOptions<Row>;
    };

/** React component. Use `import * as grids from 'vgrid/react'` and <grids.vGrid />. */
export declare function vGrid<Row extends object = object>(props: vGridProps<Row>): ReactElement;
export default vGrid;
