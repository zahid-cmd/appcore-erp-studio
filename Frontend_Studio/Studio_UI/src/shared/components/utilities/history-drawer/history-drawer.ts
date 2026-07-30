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

import
{
    HistoryItem
}
from './history-drawer.model';

@Component(
{
    selector: 'app-history-drawer',

    standalone: true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './history-drawer.html',

    styleUrl:
        './history-drawer.css'
})
export class HistoryDrawerComponent
{
    /* =====================================================
       INPUTS
    ====================================================== */

    @Input()
    previewMode = false;

    @Input()
    opened = false;

    @Input()
    title = 'History';

    @Input()
    width = 420;

    @Input()
    items: HistoryItem[] = [];

    /* =====================================================
       OUTPUTS
    ====================================================== */

    @Output()
    readonly closed =
        new EventEmitter<void>();

    /* =====================================================
       PREVIEW DATA
    ====================================================== */

    readonly previewItems: HistoryItem[] =
    [
        {
            title:
                'Record Created',

            description:
                'New customer record was created successfully.',

            user:
                'Administrator',

            dateTime:
                '22 Jun 2026 03:45 AM',

            badge:
                'CREATE'
        },

        {
            title:
                'Record Updated',

            description:
                'Customer information was updated.',

            user:
                'Administrator',

            dateTime:
                '22 Jun 2026 03:40 AM',

            badge:
                'UPDATE'
        },

        {
            title:
                'Status Changed',

            description:
                'Customer status changed to Active.',

            user:
                'System',

            dateTime:
                '22 Jun 2026 03:35 AM',

            badge:
                'STATUS'
        },

        {
            title:
                'Approval Granted',

            description:
                'Request was approved by management.',

            user:
                'Manager',

            dateTime:
                '22 Jun 2026 03:30 AM',

            badge:
                'APPROVED'
        }
    ];

    /* =====================================================
       CLOSE
    ====================================================== */

    close(): void
    {
        if (this.previewMode)
        {
            return;
        }

        this.closed.emit();
    }

    /* =====================================================
       VIEW HELPERS
    ====================================================== */

    get currentItems(): HistoryItem[]
    {
        return this.previewMode
            ? this.previewItems
            : this.items;
    }

    get currentTitle(): string
    {
        return this.previewMode
            ? 'History'
            : this.title;
    }

    get totalActivities(): number
    {
        return this.currentItems.length;
    }

    get latestActivity(): string
    {
        if (this.currentItems.length === 0)
        {
            return '-';
        }

        return this.currentItems[0]?.dateTime ?? '-';
    }

    /* =====================================================
       BADGE
    ====================================================== */

    getBadge(
        item: HistoryItem
    ): string
    {
        return (
            item.badge ?? ''
        )
            .trim()
            .toUpperCase();
    }

    /* =====================================================
       ACTIVITY CLASS
    ====================================================== */

    getActivityClass(
        item: HistoryItem
    ): string
    {
        if (!item.badge)
        {
            return '';
        }

        return 'activity-' +
            item.badge
                .trim()
                .toLowerCase()
                .replace(/_/g, '-');
    }

    /* =====================================================
       TRACK BY
    ====================================================== */

    trackByIndex(
        index: number
    ): number
    {
        return index;
    }
}