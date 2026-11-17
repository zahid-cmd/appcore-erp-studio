//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectionStrategy,
    Component,
    Input
}
from '@angular/core';


//===============================================================
// Workspace Art (2026-11-15) : the built-in line drawings that give
// each page its own place - an office for Company, a map for
// Branches, shelves for Warehouses ... Drawn in code (no image
// files), in the AppCore blue with a touch of copper.
//
//   <app-workspace-art theme="company"></app-workspace-art>
//
// Sizes :
//   panel  the drawing on top of a form's workspace panel (default)
//   empty  the drawing on an empty list
//   tile   the small glyph in the page header's icon tile (white)
//
// A theme not drawn yet falls back to "workspace" (a desk). New
// themes are added here as their pages are redesigned.
//===============================================================

export type WorkspaceArtTheme =
    'company' | 'workspace' | string;

@Component(
{
    selector:'app-workspace-art',

    standalone:true,

    changeDetection:ChangeDetectionStrategy.OnPush,

    host:
    {
        '[class.wa-panel]':"size === 'panel'",
        '[class.wa-empty]':"size === 'empty'",
        '[class.wa-tile]':"size === 'tile'",
        'aria-hidden':'true'
    },

    templateUrl:'./workspace-art.html',

    styleUrl:'./workspace-art.css'
})
export class WorkspaceArtComponent
{
    @Input()
    theme:
        WorkspaceArtTheme = 'workspace';

    @Input()
    size:
        'panel' | 'empty' | 'tile' = 'panel';

    // the themes drawn so far
    private static readonly DRAWN =
        new Set<string>(['company', 'workspace', 'wings', 'branches', 'warehouses', 'locations', 'financial-years', 'backup', 'terms', 'accounts', 'ledger', 'cash', 'bank', 'mfs', 'pos', 'card', 'cheques', 'catalog', 'bike', 'parts', 'helmet', 'palette', 'brand', 'people', 'truck']);

    get drawn(): string
    {
        return WorkspaceArtComponent.DRAWN.has(this.theme) ? this.theme : 'workspace';
    }

    // a map pin, its point at x, y ; r = the head's radius
    pinPath(x: number, y: number, r: number): string
    {
        const top = y - r * 2.4;
        return `M${x} ${y} C${x - r * 0.9} ${y - r} ${x - r * 1.25} ${y - r * 1.45} ${x - r * 1.25} ${top + r} `
             + `A${r * 1.25} ${r * 1.25} 0 0 1 ${x + r * 1.25} ${top + r} `
             + `C${x + r * 1.25} ${y - r * 1.45} ${x + r * 0.9} ${y - r} ${x} ${y} Z`;
    }

    // window grid of a building : x, y of each pane
    panes(x: number, y: number, cols: number, rows: number, w: number, h: number, gx: number, gy: number): { x: number; y: number }[]
    {
        const out: { x: number; y: number }[] = [];

        for (let r = 0; r < rows; r++)
        {
            for (let c = 0; c < cols; c++)
            {
                out.push({ x:x + c * (w + gx), y:y + r * (h + gy) });
            }
        }

        return out;
    }
}
