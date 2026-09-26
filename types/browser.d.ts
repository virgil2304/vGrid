import { vGrid as createGrid } from './index.js';

export { vGrid } from './index.js';

declare global {
    var vGrid: typeof createGrid;
}
