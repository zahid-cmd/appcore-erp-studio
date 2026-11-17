import
{
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output
}
from '@angular/core';


//===============================================================
// Pagination (redesigned 2026-11-16) : the pager in a list's
// canvas footer.
//   left   : "1 - 10 of 48 records" (the range highlighted)
//   centre : first / previous, page numbers in a soft track (the
//            open page a raised white button; 1 ... 4 5 6 ... 12),
//            next / last
//   right  : "Rows" as clickable sizes (10 | 20 | 50 | 100, and
//            Auto (n) when the page offers it)
// Inputs and outputs unchanged.
//===============================================================

export type PagerItem = number | 'gap-l' | 'gap-r';

@Component(
{
    selector: 'app-pagination',

    standalone: true,

    changeDetection: ChangeDetectionStrategy.OnPush,

    templateUrl:
        './pagination.html',

    styleUrl:
        './pagination.css'
})
export class PaginationComponent
{
    /* =====================================================
       INPUTS
    ====================================================== */

    @Input()
    totalRecords = 0;

    @Input()
    currentPage = 1;

    @Input()
    pageSize = 10;

    // Auto page size (page canvas across monitors) : the rows
    // that fit the canvas. 0 = no Auto choice.
    @Input()
    autoRows = 0;

    // Auto is the current choice
    @Input()
    autoActive = false;

    @Input()
    pageSizeOptions: number[] =
    [
        10,
        20,
        50,
        100
    ];

    // the word after the count : "48 records"
    @Input()
    noun = 'records';

    /* =====================================================
       OUTPUTS
    ====================================================== */

    @Output()
    readonly pageChange =
        new EventEmitter<number>();

    @Output()
    readonly pageSizeChange =
        new EventEmitter<number>();

    /* =====================================================
       STATE
    ====================================================== */

    get totalPages(): number
    {
        return Math.max(Math.ceil(this.totalRecords / Math.max(1, this.pageSize)), 1);
    }

    get startRecord(): number
    {
        return this.totalRecords === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
    }

    get endRecord(): number
    {
        return Math.min(this.currentPage * this.pageSize, this.totalRecords);
    }

    get hasPrevious(): boolean
    {
        return this.currentPage > 1;
    }

    get hasNext(): boolean
    {
        return this.currentPage < this.totalPages;
    }

    // the sizes offered, with the current one if it is not a choice
    // (e.g. 5 on a two-line list)
    get sizes(): number[]
    {
        const all = new Set(this.pageSizeOptions);

        if (!this.autoActive && this.pageSize > 0)
        {
            all.add(this.pageSize);
        }

        return [...all].sort((a, b) => a - b);
    }

    // up to 7 places : 1 2 3 4 5 ... 12 / 1 ... 5 6 7 ... 12 / 1 ... 8 9 10 11 12
    get pages(): PagerItem[]
    {
        const total = this.totalPages;
        const current = Math.min(Math.max(1, this.currentPage), total);

        if (total <= 7)
        {
            return Array.from({ length: total }, (_, i) => i + 1);
        }

        if (current <= 4)
        {
            return [1, 2, 3, 4, 5, 'gap-r', total];
        }

        if (current >= total - 3)
        {
            return [1, 'gap-l', total - 4, total - 3, total - 2, total - 1, total];
        }

        return [1, 'gap-l', current - 1, current, current + 1, 'gap-r', total];
    }

    isPage(item: PagerItem): item is number
    {
        return typeof item === 'number';
    }

    /* =====================================================
       NAVIGATION
    ====================================================== */

    previous(): void
    {
        this.goToPage(this.currentPage - 1);
    }

    next(): void
    {
        this.goToPage(this.currentPage + 1);
    }

    goToPage(page: number): void
    {
        if (page < 1 || page > this.totalPages || page === this.currentPage)
        {
            return;
        }

        this.pageChange.emit(page);
    }

    // 0 = Auto
    choose(size: number): void
    {
        const active = size === 0 ? this.autoActive : (!this.autoActive && size === this.pageSize);

        if (!active)
        {
            this.pageSizeChange.emit(size);
        }
    }
}
