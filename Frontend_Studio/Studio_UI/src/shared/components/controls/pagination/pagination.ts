import
{
    Component,
    EventEmitter,
    Input,
    Output
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

@Component(
{
    selector: 'app-pagination',

    standalone: true,

    imports:
    [
        CommonModule
    ],

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

    @Input()
    pageSizeOptions: number[] =
    [
        10,
        20,
        50,
        100
    ];

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
       TOTAL PAGES
    ====================================================== */

    get totalPages(): number
    {
        return Math.max(
            Math.ceil(
                this.totalRecords / this.pageSize
            ),
            1
        );
    }

    /* =====================================================
       RECORD RANGE
    ====================================================== */

    get startRecord(): number
    {
        if (this.totalRecords === 0)
        {
            return 0;
        }

        return (
            (
                this.currentPage - 1
            )
            *
            this.pageSize
        ) + 1;
    }

    get endRecord(): number
    {
        return Math.min(
            this.currentPage * this.pageSize,
            this.totalRecords
        );
    }

    /* =====================================================
       NAVIGATION STATE
    ====================================================== */

    get hasPrevious(): boolean
    {
        return this.currentPage > 1;
    }

    get hasNext(): boolean
    {
        return this.currentPage < this.totalPages;
    }

    /* =====================================================
       VISIBLE PAGES
    ====================================================== */

    get visiblePages(): number[]
    {
        const pages: number[] = [];

        let start =
            Math.max(
                this.currentPage - 1,
                1
            );

        let end =
            start + 2;

        if (end > this.totalPages)
        {
            end = this.totalPages;

            start =
                Math.max(
                    end - 2,
                    1
                );
        }

        for (
            let page = start;
            page <= end;
            page++
        )
        {
            pages.push(page);
        }

        return pages;
    }

    /* =====================================================
       PAGE NAVIGATION
    ====================================================== */

    previous(): void
    {
        if (!this.hasPrevious)
        {
            return;
        }

        this.goToPage(
            this.currentPage - 1
        );
    }

    next(): void
    {
        if (!this.hasNext)
        {
            return;
        }

        this.goToPage(
            this.currentPage + 1
        );
    }

    goToPage(
        page: number
    ): void
    {
        if (
            page < 1 ||
            page > this.totalPages ||
            page === this.currentPage
        )
        {
            return;
        }

        this.pageChange.emit(page);
    }

    /* =====================================================
       PAGE SIZE
    ====================================================== */

    changePageSize(
        event: Event
    ): void
    {
        const target =
            event.target as HTMLSelectElement;

        this.pageSizeChange.emit(
            Number(target.value)
        );
    }
}