//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,
    DestroyRef,
    Directive,
    inject,
    signal
}
from '@angular/core';

import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import
{
    Router
}
from '@angular/router';

import
{
    Subscription,
    timeout
}
from 'rxjs';

import
{
    ToastService
}
from '../../../../shared/components/utilities/toast/toast.service';

import
{
    TrialBalanceService
}
from '../services/trial-balance.service';

import
{
    FinalAccountsService
}
from '../services/final-accounts.service';

import
{
    FA_LEVELS,
    FaLevel,
    FaLine,
    faChange,
    faChangePct,
    faChangeTone,
    faMoney,
    faPct,
    faTotal,
    formatLedgerDate,
    statementRoute
}
from '../models/final-accounts.model';


export interface FaOption
{
    label:string;
    value:any;
}

// Period a ledger statement opens with
export interface FaStatementPeriod
{
    from:string;
    to:string;
    branchId:number;
    showCancelled:boolean;
}

export const FA_REQUEST_TIMEOUT =
    120000;


//===============================================================
// Shared part of the Profit & Loss and Balance Sheet pages
//
//   Branch list (allotted branches), Show cancelled, level,
//   Show codes, Show zero rows, search, the collapse set, the
//   statement-table helpers, the ledger → statement link and the
//   zoneless repaint (same as the Trial Balance page).
//===============================================================

@Directive()
export abstract class FaStatementPage
{
    protected readonly branchService =
        inject(TrialBalanceService);

    protected readonly finalAccounts =
        inject(FinalAccountsService);

    protected readonly router =
        inject(Router);

    protected readonly toast =
        inject(ToastService);

    protected readonly cdr =
        inject(ChangeDetectorRef);

    protected readonly destroyRef =
        inject(DestroyRef);

    readonly levels =
        FA_LEVELS;

    // Name in console messages
    protected abstract readonly pageName:
        string;

    //===========================================================
    // Filter (Submit)
    //===========================================================

    branchId:
        number = 0;

    showCancelled:
        boolean = false;

    branchItems:
        FaOption[] = [];

    branchesLoading:
        boolean = false;

    branchesError:
        string = '';

    //===========================================================
    // View (no reload)
    //===========================================================

    // Class by default (as the Trial Balance)
    level:
        FaLevel = 1;

    showCodes:
        boolean = true;

    showZero:
        boolean = false;

    searchText:
        string = '';

    // Lines closed by a click (keys)
    collapsed =
        new Set<string>();

    //===========================================================
    // Canvas
    //===========================================================

    loaded:
        boolean = false;

    loading:
        boolean = false;

    loadError:
        string = '';

    // Every line down to the level / the lines shown (collapse)
    allLines:
        FaLine[] = [];

    lines:
        FaLine[] = [];

    private branchRequest?:
        Subscription;

    //===========================================================
    // Page parts
    //===========================================================

    // The statement lines of the loaded report (empty = none)
    protected abstract buildLines():
        FaLine[];

    // Period / branch of a ledger statement opened from a row
    protected abstract statementPeriod():
        FaStatementPeriod | null;

    //===========================================================
    // View refresh (zoneless : painted once more on the next turn)
    //===========================================================

    private repaintQueued =
        false;

    readonly renderTick =
        signal(0);

    protected refreshView():
        void
    {
        this.renderTick.update((x: number) => x + 1);

        this.cdr.markForCheck();

        try
        {
            this.cdr.detectChanges();
        }
        catch (error)
        {
            console.error(`[${this.pageName}] view update failed`, error);
        }

        if (!this.repaintQueued)
        {
            this.repaintQueued = true;

            setTimeout(() =>
            {
                this.repaintQueued = false;

                this.cdr.markForCheck();

                try
                {
                    this.cdr.detectChanges();
                }
                catch (error)
                {
                    console.error(`[${this.pageName}] view update failed (repaint)`, error);
                }
            });
        }
    }

    //===========================================================
    // Branches
    //===========================================================

    protected loadBranches():
        void
    {
        this.branchRequest?.unsubscribe();

        this.branchesLoading = true;

        this.branchesError = '';

        this.branchRequest =
            this.branchService
                .getBranches()
                .pipe(timeout(FA_REQUEST_TIMEOUT), takeUntilDestroyed(this.destroyRef))
                .subscribe
                (
                    {
                        next:
                            branches =>
                            {
                                this.branchItems =
                                [
                                    {
                                        label:branches.length > 1
                                            ? `All Allotted Branches (${branches.length})`
                                            : 'All Allotted Branches',
                                        value:0
                                    },
                                    ...branches.map(x => ({ label:x.Name, value:x.Id }))
                                ];

                                if (branches.length === 0)
                                {
                                    this.branchesError =
                                        'You are not allotted to any branch (Security & Permission > Branch Assignment).';
                                }

                                this.branchesLoading = false;

                                this.refreshView();
                            },
                        error:
                            err =>
                            {
                                this.branchesLoading = false;

                                this.branchesError = faErrorText(err, 'The branches could not be loaded.');

                                this.refreshView();
                            }
                    }
                );
    }

    onBranchChange
    (
        value:
            any
    ):
        void
    {
        this.branchId = Number(value) || 0;
    }

    onCancelledChange
    (
        event:
            Event
    ):
        void
    {
        this.showCancelled = !!(event.target as HTMLInputElement | null)?.checked;
    }

    //===========================================================
    // View changes (no reload)
    //===========================================================

    setLevel
    (
        level:
            FaLevel
    ):
        void
    {
        if (this.level === level)
        {
            return;
        }

        this.level = level;

        this.collapsed.clear();

        this.rebuild();
    }

    onCodesChange
    (
        event:
            Event
    ):
        void
    {
        this.showCodes = !!(event.target as HTMLInputElement | null)?.checked;

        this.refreshView();
    }

    onZeroChange
    (
        event:
            Event
    ):
        void
    {
        this.showZero = !!(event.target as HTMLInputElement | null)?.checked;

        this.rebuild();
    }

    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText = value ?? '';

        this.rebuild();
    }

    get levelWord():
        string
    {
        return this.levels.find(x => x.value === this.level)?.label ?? '';
    }

    //===========================================================
    // Lines
    //===========================================================

    protected rebuild():
        void
    {
        try
        {
            this.allLines = this.buildLines();
        }
        catch (error)
        {
            console.error(`[${this.pageName}] could not build the lines`, error);

            this.allLines = [];

            this.loadError = 'The statement came back but could not be shown.';
        }

        this.applyCollapse();

        this.refreshView();
    }

    protected applyCollapse():
        void
    {
        this.lines =
            this.allLines.filter(
                line => !line.parentKeys.some(key => this.collapsed.has(key)));
    }

    get hasLedgers():
        boolean
    {
        return this.allLines.some(x => x.kind === 'node');
    }

    // A section opens / closes its tree; a class / group / sub
    // group above the level opens / closes its children
    canToggle
    (
        line:
            FaLine
    ):
        boolean
    {
        return line.kind === 'section'
            ? line.count > 0
            : line.kind === 'node' && line.level < this.level;
    }

    isCollapsed
    (
        line:
            FaLine
    ):
        boolean
    {
        return this.collapsed.has(line.key);
    }

    isLedger
    (
        line:
            FaLine
    ):
        boolean
    {
        return line.kind === 'node' && line.level === 4 && !!line.row?.ClassCode;
    }

    lineTitle
    (
        line:
            FaLine
    ):
        string
    {
        if (this.isLedger(line))
        {
            return 'Open the statement (new tab)';
        }

        if (this.canToggle(line))
        {
            return this.isCollapsed(line) ? 'Show what is under it' : 'Hide what is under it';
        }

        return line.hint ?? '';
    }

    lineClick
    (
        line:
            FaLine
    ):
        void
    {
        if (this.isLedger(line))
        {
            this.openStatement(line.row?.LedgerCode ?? '', line.row?.LedgerType ?? '');

            return;
        }

        if (!this.canToggle(line))
        {
            return;
        }

        if (this.collapsed.has(line.key))
        {
            this.collapsed.delete(line.key);
        }
        else
        {
            this.collapsed.add(line.key);
        }

        this.applyCollapse();

        this.refreshView();
    }

    expandAll():
        void
    {
        this.collapsed.clear();

        this.applyCollapse();

        this.refreshView();
    }

    // Sections stay open; their classes close
    collapseAll():
        void
    {
        this.allLines
            .filter(x => x.kind === 'node' && x.level === 1 && this.canToggle(x))
            .forEach(x => this.collapsed.add(x.key));

        this.applyCollapse();

        this.refreshView();
    }

    //===========================================================
    // Ledger → its statement (new tab)
    //===========================================================

    openStatement
    (
        ledgerCode:
            string,
        ledgerType:
            string
    ):
        void
    {
        const period =
            this.statementPeriod();

        if (!ledgerCode || !period)
        {
            return;
        }

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    [statementRoute(ledgerType)],
                    {
                        queryParams:
                        {
                            ledger:ledgerCode,
                            from:period.from,
                            to:period.to,
                            branchId:period.branchId || 0,
                            showCancelled:period.showCancelled ? 1 : 0
                        }
                    }
                )
            );

        const tab =
            window.open(url, '_blank');

        if (!tab)
        {
            this.toast.error(
                'Statement Not Opened',
                'The browser blocked the new tab. Allow pop-ups for this site.'
            );
        }
    }

    //===========================================================
    // Print viewer (new tab)
    //===========================================================

    protected openPrint
    (
        key:
            string,
        token:
            number
    ):
        void
    {
        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    ['/print-viewer', key, token],
                    {
                        queryParams:{ doc:key }
                    }
                )
            );

        // Not "noopener" : the new tab keeps this session's login
        const tab =
            window.open(url, '_blank');

        if (!tab)
        {
            this.toast.error(
                'Print Failed',
                'The browser blocked the print tab. Allow pop-ups for this site.'
            );
        }
    }

    //===========================================================
    // Figures
    //===========================================================

    amountText
    (
        line:
            FaLine,
        value:
            number
    ):
        string
    {
        if (line.check)
        {
            return Math.abs(value) < 0.005 ? 'Balanced' : faTotal(value);
        }

        return line.kind === 'node' || line.kind === 'extra'
            ? faMoney(value)
            : faTotal(value);
    }

    change
    (
        line:
            FaLine
    ):
        string
    {
        return line.check ? '' : faMoney(faChange(line.amount, line.compare));
    }

    changePct
    (
        line:
            FaLine
    ):
        string
    {
        return line.check ? '' : faPct(faChangePct(line.amount, line.compare));
    }

    changeTone
    (
        line:
            FaLine
    ):
        string
    {
        return faChangeTone(line);
    }

    pct
    (
        value:
            number | null | undefined
    ):
        string
    {
        return faPct(value);
    }

    money
    (
        value:
            number
    ):
        string
    {
        return faMoney(value);
    }

    total
    (
        value:
            number
    ):
        string
    {
        return faTotal(value);
    }

    date
    (
        iso:
            string
    ):
        string
    {
        return formatLedgerDate(iso);
    }
}


//===============================================================
// Helpers
//===============================================================

export function faToday():
    Date
{
    const now =
        new Date();

    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// yyyy-MM-dd → local date (null when not a date)
export function faParseIso
(
    iso:
        string
):
    Date | null
{
    const match =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');

    return match
        ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
        : null;
}

export function faErrorText
(
    err:
        any,
    fallback:
        string
):
    string
{
    if (err?.name === 'TimeoutError')
    {
        return 'The server took too long to answer. Narrow the period and submit again.';
    }

    const body =
        err?.error;

    if (typeof body === 'string' && body.trim())
    {
        return body.trim();
    }

    if (typeof body?.message === 'string' && body.message.trim())
    {
        return body.message.trim();
    }

    return fallback;
}
