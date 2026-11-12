//===============================================================
// Page canvas : the list card that fills the rest of the page.
// Toolbar on top, body scrolls inside (no page scroll), footer
// (pagination / summary line) pinned at the bottom.
//
//   <ac-page-canvas>
//       <div canvasToolbar>...</div>
//       <table canvasBody>...</table>
//       <ac-pagination canvasFooter ... />
//   </ac-page-canvas>
//===============================================================

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'ac-page-canvas',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        :host { display: flex; flex: 1; flex-direction: column; min-height: 0; border: 1px solid var(--ac-border); border-radius: var(--ac-radius); background: var(--ac-card); box-shadow: var(--ac-shadow); overflow: hidden; }
        .pc-toolbar:not(:empty) { display: flex; flex: none; flex-wrap: wrap; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--ac-border-2); }
        .pc-body { display: flex; flex: 1; flex-direction: column; min-height: 0; overflow: auto; }
        .pc-body > * { flex-shrink: 0; }
        .pc-foot:not(:empty) { flex: none; border-top: 1px solid var(--ac-border-2); background: var(--ac-card-2); }
    `],
    template: `
        <div class="pc-toolbar"><ng-content select="[canvasToolbar]" /></div>
        <div class="pc-body ac-scroll"><ng-content /></div>
        <div class="pc-foot"><ng-content select="[canvasFooter]" /></div>
    `
})
export class PageCanvas
{
}
