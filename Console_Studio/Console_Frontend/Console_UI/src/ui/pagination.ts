//===============================================================
// Pagination (same layout as Studio's app-pagination) :
// summary left, pages centre, rows per page right.
//
//   <ac-pagination [total]="rows.length" [page]="page()" [size]="size()"
//                  (pageChange)="page.set($event)" (sizeChange)="setSize($event)" />
//===============================================================

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { SelectBox } from './select-box';

@Component({
    selector: 'ac-pagination',
    imports: [SelectBox],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        :host { display: block; }
        .pg { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; padding: 9px 14px; }
        .pg-info { display: flex; align-items: center; gap: 9px; color: var(--ac-muted); font-size: 12.5px; }
        .pg-info i { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; background: var(--ac-accent-soft); color: var(--ac-accent); font-size: 12px; }
        .pg-info b { color: var(--ac-text); font-weight: 700; }
        .pg-nav { display: flex; align-items: center; gap: 4px; padding: 3px; border: 1px solid var(--ac-border); border-radius: 12px; background: var(--ac-card); }
        .pg-nav button { min-width: 30px; height: 30px; padding: 0 8px; border: 0; border-radius: 9px; background: transparent; color: var(--ac-text-2); font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; transition: background 0.15s, color 0.15s; }
        .pg-nav button:hover:not(:disabled):not(.on) { background: var(--ac-hover); color: var(--ac-text); }
        .pg-nav button:disabled { color: var(--ac-faint); cursor: default; opacity: 0.5; }
        .pg-nav button.on { background: var(--ac-gradient); color: #fff; box-shadow: 0 6px 14px -8px rgba(20, 16, 12, 0.9); }
        .pg-dots { padding: 0 4px; color: var(--ac-faint); }
        .pg-size { display: flex; align-items: center; justify-content: flex-end; gap: 9px; color: var(--ac-muted); font-size: 12.5px; }
        .pg-size ac-select-box { width: 84px; }
        @media (max-width: 760px) { .pg { grid-template-columns: 1fr; justify-items: center; } .pg-size { justify-content: center; } }
    `],
    template: `
        <div class="pg">
            <div class="pg-info">
                <i class="fas fa-table-list"></i>
                <span>Showing <b>{{ from() }}</b> to <b>{{ to() }}</b> of <b>{{ total() }}</b> {{ noun() }}</span>
            </div>

            <div class="pg-nav">
                <button type="button" title="First page" [disabled]="page() <= 1" (click)="go(1)"><i class="fas fa-angles-left"></i></button>
                <button type="button" title="Previous page" [disabled]="page() <= 1" (click)="go(page() - 1)"><i class="fas fa-angle-left"></i></button>

                @for (p of pages(); track p)
                {
                    <button type="button" [class.on]="p === page()" (click)="go(p)">{{ p }}</button>
                }

                @if (pages()[pages().length - 1] < pageCount())
                {
                    <span class="pg-dots">...</span>
                    <button type="button" (click)="go(pageCount())">{{ pageCount() }}</button>
                }

                <button type="button" title="Next page" [disabled]="page() >= pageCount()" (click)="go(page() + 1)"><i class="fas fa-angle-right"></i></button>
                <button type="button" title="Last page" [disabled]="page() >= pageCount()" (click)="go(pageCount())"><i class="fas fa-angles-right"></i></button>
            </div>

            <div class="pg-size">
                <span>Rows per page</span>
                <ac-select-box [options]="sizeOptions()" [value]="size()" (valueChange)="sizeChange.emit(+$any($event))" [compact]="true" [up]="true" />
            </div>
        </div>
    `
})
export class Pagination
{
    readonly total = input(0);

    readonly page = input(1);

    readonly size = input(10);

    readonly sizes = input<number[]>([10, 20, 50, 100]);

    readonly noun = input('records');

    readonly pageChange = output<number>();

    readonly sizeChange = output<number>();

    readonly pageCount = computed(() => Math.max(Math.ceil(this.total() / this.size()), 1));

    readonly from = computed(() => this.total() === 0 ? 0 : (this.page() - 1) * this.size() + 1);

    readonly to = computed(() => Math.min(this.page() * this.size(), this.total()));

    readonly sizeOptions = computed(() => this.sizes().map(x => ({ value: x, label: String(x) })));

    // three page buttons around the current page
    readonly pages = computed(() =>
    {
        const count = this.pageCount();

        let start = Math.max(this.page() - 1, 1);
        let end = start + 2;

        if (end > count)
        {
            end = count;
            start = Math.max(end - 2, 1);
        }

        const list: number[] = [];

        for (let p = start; p <= end; p++)
        {
            list.push(p);
        }

        return list;
    });

    go(p: number): void
    {
        if (p >= 1 && p <= this.pageCount() && p !== this.page())
        {
            this.pageChange.emit(p);
        }
    }
}

// Client-side paging helper for the list pages
export function pageSlice<T>(rows: T[], page: number, size: number): T[]
{
    const start = (page - 1) * size;

    return rows.slice(start, start + size);
}
