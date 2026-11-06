//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    ChangeDetectorRef,
    HostListener,
    OnDestroy,
    inject
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    FormsModule
}
from '@angular/forms';

import
{
    Router
}
from '@angular/router';

//===============================================================
// Shared Components
//===============================================================

import
{
    PageHeaderComponent
}
from '../../../../../../shared/components/layout/page-header/page-header';

import
{
    PageToolbarComponent
}
from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';

import
{
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    SearchBoxComponent
}
from '../../../../../../shared/components/utilities/search-box/search-box';

import
{
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

import
{
    OrbitLoaderComponent
}
from '../../../../../../shared/components/utilities/orbit-loader/orbit-loader';

import
{
    HistoryDrawerComponent
}
from '../../../../../../shared/components/utilities/history-drawer/history-drawer';

import
{
    HistoryItem
}
from '../../../../../../shared/components/utilities/history-drawer/history-drawer.model';

//===============================================================
// Models & Services
//===============================================================

import
{
    PostingSetupRow,
    PostingSetupLedgerOption,
    PostingSetupHistory,
    PostingSwitch
}
from '../../../models/posting-setup.model';

import
{
    PostingSetupService
}
from '../../../services/posting-setup.service';

//===============================================================
// View Types
//===============================================================

type PostingFilter =
    'all'
    | 'attention';

interface PostingGroupView
{
    name: string;

    rows: PostingSetupRow[];
}

interface LedgerChoice
{
    value: string;

    label: string;
}

// System Configurations page (switches are changed there)
const SYSTEM_CONFIGURATIONS_ROUTE:
    string =
    '/settings/general-settings/system-configurations';

const REASON_MIN_LENGTH:
    number =
    5;

// How long the "Saved" mark stays on a card (ms)
const SAVED_MARK_MS:
    number =
    4000;

// Posting switches panel width (px, matches the CSS)
const SWITCHES_PANEL_WIDTH:
    number =
    360;

type StatusTone =
    'ok'
    | 'optional'
    | 'alert';

//===============================================================
// Posting Setup (single page)
//
// One route tile per posting purpose (purpose -> ledger),
// grouped (VAT Current Account, Branch, Stock). "Change ledger"
// opens a small dialog : the ledgers the purpose may use + a
// reason. Saved changes go to history; old postings keep their
// ledger. The posting switches (read-only) open from the bell
// in the toolbar. No toasts : results show on the page.
//===============================================================

@Component(
{
    selector: 'app-posting-setup-view',

    standalone: true,

    imports:
    [
        CommonModule,

        FormsModule,

        PageHeaderComponent,

        PageToolbarComponent,

        SearchDropdownComponent,

        SearchBoxComponent,

        CommandCenterComponent,

        OrbitLoaderComponent,

        HistoryDrawerComponent
    ],

    templateUrl:
        './posting-setup-view.html',

    styleUrl:
        './posting-setup-view.css'
})
export class PostingSetupView implements OnInit, OnDestroy
{
    //===========================================================
    // Services
    //===========================================================

    private readonly service =
        inject(PostingSetupService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly router =
        inject(Router);

    //===========================================================
    // State
    //===========================================================

    loading =
        false;

    loadError =
        '';

    canChange =
        false;

    rows:
        PostingSetupRow[] = [];

    ledgers:
        PostingSetupLedgerOption[] = [];

    switches:
        PostingSwitch[] = [];

    searchText =
        '';

    filter:
        PostingFilter = 'all';

    // Toolbar dropdown : one group (null = all groups)
    groupFilter:
        string | null = null;

    groupItems:
        { label: string; value: string }[] = [];

    // Bumped by Refresh so the dropdown is rebuilt empty
    filtersVersion =
        0;

    // Change dialog
    editing:
        PostingSetupRow | null = null;

    editLedgerCode =
        '';

    editReason =
        '';

    editChoices:
        LedgerChoice[] = [];

    editError =
        '';

    saving =
        false;

    // History panel
    historyOpen =
        false;

    historyLoading =
        false;

    historyPurpose:
        PostingSetupRow | null = null;

    historyItems:
        HistoryItem[] = [];

    readonly reasonMinLength =
        REASON_MIN_LENGTH;

    // Posting switches panel (toolbar bell)
    switchesOpen =
        false;

    switchesTop =
        0;

    switchesRight =
        0;

    // Card just saved (shows "Saved" for a moment)
    savedCode =
        '';

    private savedTimer:
        ReturnType<typeof setTimeout> | null = null;

    // Inline page notice (instead of a toast)
    pageNotice =
        '';

    //===========================================================
    // Lifecycle
    //===========================================================

    ngOnInit():
        void
    {
        this.load();
    }

    ngOnDestroy():
        void
    {
        if (this.savedTimer)
        {
            clearTimeout(this.savedTimer);
        }
    }

    //===========================================================
    // Load
    //===========================================================

    load():
        void
    {
        this.loading =
            true;

        this.loadError =
            '';

        this.pageNotice =
            '';

        this.service
            .getWorkspace()
            .subscribe(
            {
                next:
                    workspace =>
                    {
                        this.canChange =
                            !!workspace?.canChange;

                        this.rows =
                            workspace?.rows ?? [];

                        this.buildGroupItems();

                        this.ledgers =
                            workspace?.ledgers ?? [];

                        this.switches =
                            workspace?.switches ?? [];

                        this.loading =
                            false;

                        this.cdr.markForCheck();
                    },

                error:
                    error =>
                    {
                        this.loading =
                            false;

                        this.loadError =
                            this.errorText(
                                error,
                                'Unable to load the posting setup.');

                        this.cdr.markForCheck();
                    }
            });
    }

    refresh():
        void
    {
        this.groupFilter =
            null;

        this.searchText =
            '';

        this.filter =
            'all';

        this.filtersVersion++;

        this.load();
    }

    // Groups in page order, with how many purposes each holds
    private buildGroupItems():
        void
    {
        const counts =
            new Map<string, number>();

        for (const row of this.rows)
        {
            const name =
                row.groupName || 'Other';

            counts.set(name, (counts.get(name) ?? 0) + 1);
        }

        this.groupItems =
            [
                { label: `All groups (${this.rows.length})`, value: '' },
                ...[...counts.entries()].map
                (
                    ([name, count]) =>
                    ({
                        label: `${name} (${count})`,
                        value: name
                    })
                )
            ];

        if (this.groupFilter && !counts.has(this.groupFilter))
        {
            this.groupFilter =
                null;
        }
    }

    onGroupFilter(
        value: string | null
    ):
        void
    {
        this.groupFilter =
            value || null;
    }

    //===========================================================
    // Counters / Filtering
    //===========================================================

    get readyCount():
        number
    {
        return this.rows
            .filter(x => x.status === 'Ready')
            .length;
    }

    get attentionCount():
        number
    {
        return this.rows
            .filter(x => this.needsAttention(x))
            .length;
    }

    needsAttention(
        row: PostingSetupRow
    ):
        boolean
    {
        if (row.status === 'Ready')
        {
            return false;
        }

        // An optional purpose without a ledger is fine
        return !(row.status === 'NotSet' && !row.isRequired);
    }

    setFilter(
        filter: PostingFilter
    ):
        void
    {
        this.filter =
            filter;
    }

    onSearch(
        value: string
    ):
        void
    {
        this.searchText =
            value ?? '';
    }

    get groups():
        PostingGroupView[]
    {
        const keyword =
            this.searchText
                .trim()
                .toLowerCase();

        const result:
            PostingGroupView[] = [];

        for (const row of this.rows)
        {
            if (this.filter === 'attention' && !this.needsAttention(row))
            {
                continue;
            }

            if (this.groupFilter && (row.groupName || 'Other') !== this.groupFilter)
            {
                continue;
            }

            if (keyword)
            {
                const text =
                    [
                        row.purposeName,
                        row.purposeCode,
                        row.groupName,
                        row.ledgerCode,
                        row.ledgerName,
                        row.usedBy
                    ]
                    .join(' ')
                    .toLowerCase();

                if (!text.includes(keyword))
                {
                    continue;
                }
            }

            let group =
                result.find(x => x.name === row.groupName);

            if (!group)
            {
                group =
                {
                    name: row.groupName || 'Other',

                    rows: []
                };

                result.push(group);
            }

            group.rows.push(row);
        }

        return result;
    }

    trackByCode(
        _index: number,
        row: PostingSetupRow
    ):
        string
    {
        return row.purposeCode;
    }

    groupIcon(
        name: string
    ):
        string
    {
        const key =
            (name ?? '').toLowerCase();

        if (key.includes('vat'))
        {
            return 'fa-solid fa-receipt';
        }

        if (key.includes('branch'))
        {
            return 'fa-solid fa-code-branch';
        }

        if (key.includes('stock'))
        {
            return 'fa-solid fa-boxes-stacked';
        }

        if (key.includes('reserve'))
        {
            return 'fa-solid fa-piggy-bank';
        }

        if (key.includes('recovery'))
        {
            return 'fa-solid fa-hand-holding-dollar';
        }

        if (key.includes('charge'))
        {
            return 'fa-solid fa-coins';
        }

        return 'fa-solid fa-sliders';
    }

    statusLabel(
        row: PostingSetupRow
    ):
        string
    {
        switch (row.status)
        {
            case 'Ready':
                return 'Ready';

            case 'NotSet':
                return row.isRequired ? 'Not set' : 'Optional';

            case 'NotFound':
                return 'Not found';

            case 'Inactive':
                return 'Inactive';

            case 'OutsideGroup':
                return 'Wrong group';

            default:
                return row.status;
        }
    }

    statusTone(
        row: PostingSetupRow
    ):
        StatusTone
    {
        if (row.status === 'Ready')
        {
            return 'ok';
        }

        if (row.status === 'NotSet' && !row.isRequired)
        {
            return 'optional';
        }

        return 'alert';
    }

    allowedText(
        row: PostingSetupRow
    ):
        string
    {
        return row.allowedSubGroupCodes?.length
            ? row.allowedSubGroupCodes.join(' / ')
            : 'Any general ledger';
    }

    // Balance split for the card : figure + Dr / Cr
    balanceAmount(
        value: number | null | undefined
    ):
        string
    {
        return Math.abs(Number(value ?? 0))
            .toLocaleString(
                'en-US',
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
    }

    balanceSide(
        value: number | null | undefined
    ):
        string
    {
        return Number(value ?? 0) >= 0
            ? 'Dr'
            : 'Cr';
    }

    //===========================================================
    // Posting Switches (read-only)
    //===========================================================

    switchState(
        item: PostingSwitch
    ):
        string
    {
        if (!item.found)
        {
            return 'Not set up';
        }

        return item.isEnabled
            ? 'ON'
            : 'OFF';
    }

    get switchOnCount():
        number
    {
        return this.switches
            .filter(x => x.found && x.isEnabled)
            .length;
    }

    get switchOffCount():
        number
    {
        return this.switches
            .filter(x => x.found && !x.isEnabled)
            .length;
    }

    get switchMissingCount():
        number
    {
        return this.switches
            .filter(x => !x.found)
            .length;
    }

    get switchesTitle():
        string
    {
        if (this.switches.length === 0)
        {
            return 'Posting switches';
        }

        const missing =
            this.switchMissingCount > 0
                ? `, ${this.switchMissingCount} not set up`
                : '';

        return `Posting switches : ${this.switchOnCount} on, ${this.switchOffCount} off${missing}`;
    }

    // The toolbar clips overflow, so the panel is fixed and
    // placed under the bell
    toggleSwitches(
        event: MouseEvent,
        anchor: HTMLElement
    ):
        void
    {
        event.stopPropagation();

        if (this.switchesOpen)
        {
            this.closeSwitches();

            return;
        }

        const rect =
            anchor.getBoundingClientRect();

        this.switchesTop =
            Math.round(rect.bottom + 8);

        this.switchesRight =
            Math.max(
                12,
                Math.round(
                    Math.min(
                        window.innerWidth - rect.right,
                        window.innerWidth - SWITCHES_PANEL_WIDTH - 12)));

        this.switchesOpen =
            true;
    }

    closeSwitches():
        void
    {
        this.switchesOpen =
            false;
    }

    @HostListener('document:click')
    onDocumentClick():
        void
    {
        if (this.switchesOpen)
        {
            this.switchesOpen =
                false;

            this.cdr.markForCheck();
        }
    }

    @HostListener('document:keydown.escape')
    onEscape():
        void
    {
        if (this.switchesOpen)
        {
            this.switchesOpen =
                false;

            this.cdr.markForCheck();
        }
    }

    @HostListener('window:resize')
    onResize():
        void
    {
        this.onEscape();
    }

    openSystemConfigurations():
        void
    {
        this.switchesOpen =
            false;

        this.router.navigate(
            [SYSTEM_CONFIGURATIONS_ROUTE]);
    }

    //===========================================================
    // Change Dialog
    //===========================================================

    openChange(
        row: PostingSetupRow
    ):
        void
    {
        if (!this.canChange)
        {
            return;
        }

        const allowed =
            (row.allowedSubGroupCodes ?? [])
                .map(x => x.toUpperCase());

        const choices:
            LedgerChoice[] =
            this.ledgers
                .filter(
                    x =>
                        allowed.length === 0
                        ||
                        allowed.includes(
                            (x.subGroupCode ?? '').toUpperCase()))
                .map(
                    x =>
                    ({
                        value: x.ledgerCode,

                        label: `${x.ledgerCode} · ${x.ledgerName}`
                    }));

        if (!row.isRequired)
        {
            choices.unshift(
            {
                value: '',

                label: '(No ledger)'
            });
        }

        this.editing =
            row;

        this.editChoices =
            choices;

        this.editLedgerCode =
            row.ledgerCode ?? '';

        this.editReason =
            '';

        this.editError =
            '';
    }

    closeChange():
        void
    {
        if (this.saving)
        {
            return;
        }

        this.editing =
            null;
    }

    onLedgerPicked(
        value: any
    ):
        void
    {
        this.editLedgerCode =
            value == null
                ? ''
                : String(value);

        this.editError =
            '';
    }

    get editLedger():
        PostingSetupLedgerOption | null
    {
        return this.ledgers.find(
            x => x.ledgerCode === this.editLedgerCode)
            ?? null;
    }

    get canSave():
        boolean
    {
        if (!this.editing || this.saving)
        {
            return false;
        }

        if ((this.editLedgerCode ?? '') === (this.editing.ledgerCode ?? ''))
        {
            return false;
        }

        if (this.editing.isRequired && !this.editLedgerCode)
        {
            return false;
        }

        return this.editReason.trim().length >= REASON_MIN_LENGTH;
    }

    saveChange():
        void
    {
        const row =
            this.editing;

        if (!row || !this.canSave)
        {
            return;
        }

        this.saving =
            true;

        this.editError =
            '';

        this.service
            .update(
                row.purposeCode,
                {
                    ledgerCode: this.editLedgerCode,

                    reason: this.editReason.trim()
                })
            .subscribe(
            {
                next:
                    updated =>
                    {
                        this.rows =
                            this.rows.map(
                                x =>
                                    x.purposeCode === updated.purposeCode
                                        ? updated
                                        : x);

                        this.saving =
                            false;

                        this.editing =
                            null;

                        this.markSaved(
                            updated.purposeCode);

                        this.cdr.markForCheck();
                    },

                error:
                    error =>
                    {
                        this.saving =
                            false;

                        this.editError =
                            this.errorText(
                                error,
                                'Unable to save the change.');

                        this.cdr.markForCheck();
                    }
            });
    }

    private markSaved(
        purposeCode: string
    ):
        void
    {
        if (this.savedTimer)
        {
            clearTimeout(this.savedTimer);
        }

        this.savedCode =
            purposeCode;

        this.savedTimer =
            setTimeout(
                () =>
                {
                    this.savedCode =
                        '';

                    this.savedTimer =
                        null;

                    this.cdr.markForCheck();
                },
                SAVED_MARK_MS);
    }

    //===========================================================
    // History Panel
    //===========================================================

    openHistory(
        row: PostingSetupRow | null = null
    ):
        void
    {
        this.historyOpen =
            true;

        this.historyPurpose =
            row;

        this.historyLoading =
            true;

        this.historyItems =
            [];

        this.pageNotice =
            '';

        this.service
            .getHistory(row?.purposeCode ?? null)
            .subscribe(
            {
                next:
                    rows =>
                    {
                        this.historyItems =
                            (rows ?? []).map(
                                x =>
                                    this.toHistoryItem(x));

                        this.historyLoading =
                            false;

                        this.cdr.markForCheck();
                    },

                error:
                    error =>
                    {
                        this.historyLoading =
                            false;

                        this.historyOpen =
                            false;

                        this.pageNotice =
                            this.errorText(
                                error,
                                'Unable to load the history.');

                        this.cdr.markForCheck();
                    }
            });
    }

    closeHistory():
        void
    {
        this.historyOpen =
            false;
    }

    get historyTitle():
        string
    {
        return this.historyPurpose
            ? `History · ${this.historyPurpose.purposeName}`
            : 'Posting Setup History';
    }

    private toHistoryItem(
        row: PostingSetupHistory
    ):
        HistoryItem
    {
        const from =
            row.oldLedgerCode
                ? `${row.oldLedgerCode} (${row.oldLedgerName || '—'})`
                : 'None';

        const to =
            row.newLedgerCode
                ? `${row.newLedgerCode} (${row.newLedgerName || '—'})`
                : 'None';

        return {
            title:
                `${row.purposeName} : ledger changed`,

            description:
                `${from} → ${to}. Reason : ${row.reason}`,

            user:
                row.changedByName || 'Unknown',

            dateTime:
                this.formatDateTime(row.changedDate),

            badge:
                row.oldLedgerCode
                    ? 'UPDATE'
                    : 'CREATE'
        };
    }

    private formatDateTime(
        value: string
    ):
        string
    {
        const date =
            new Date(value);

        if (isNaN(date.getTime()))
        {
            return value ?? '';
        }

        const months =
            ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const hours =
            date.getHours() % 12 || 12;

        const minutes =
            String(date.getMinutes()).padStart(2, '0');

        const day =
            String(date.getDate()).padStart(2, '0');

        return `${day} ${months[date.getMonth()]} ${date.getFullYear()} ${String(hours).padStart(2, '0')}:${minutes} ${date.getHours() < 12 ? 'AM' : 'PM'}`;
    }

    //===========================================================
    // Helpers
    //===========================================================

    private errorText(
        error: any,
        fallback: string
    ):
        string
    {
        const body =
            error?.error;

        if (typeof body === 'string' && body.trim())
        {
            return body;
        }

        if (body?.message)
        {
            return body.message;
        }

        if (body?.title)
        {
            return body.title;
        }

        return fallback;
    }
}
