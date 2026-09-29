import type { ComponentPropsWithoutRef, ReactElement } from 'react';
import type { vGridOptions } from './index.js';

export type VGRIDProps<Row extends object = object> =
    Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'dangerouslySetInnerHTML'> & {
        config: vGridOptions<Row>;
    };
export type vGridProps<Row extends object = object> = VGRIDProps<Row>;

export declare function VGRID<Row extends object = object>(props: VGRIDProps<Row>): ReactElement;
export { VGRID as vGrid };
export default VGRID;
