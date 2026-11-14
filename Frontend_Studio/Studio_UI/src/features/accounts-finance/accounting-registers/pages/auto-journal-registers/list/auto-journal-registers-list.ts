//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    DestroyRef,
    OnInit,
    inject
}
from '@angular/core';

import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import
{
    CommonModule
}
from '@angular/common';

import
{
    Router
}
from '@angular/router';

import
{
    Subscription
}
from 'rxjs';

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
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

import
{
    SearchBoxComponent
}
from '../../../../../../shared/components/utilities/search-box/search-box';

import
{
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    DatepickerComponent
}
from '../../../../../../shared/components/controls/datepicker/datepicker';

import
{
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';

import
{
    formatMoney
}
from '../../../../../../shared/components/accounting/accounting.models';

//===============================================================
// Auto Journal Registers
//===============================================================

import
{
    AUTO_JOURNAL_OTHER,
    AUTO_JOURNAL_PRINT_KEY,
    AutoJournal,
    AutoJournalLine,
    AutoJournalList,
    AutoJournalNode,
    formatJournalDate,
    journalMatches,
    journalShowsNotes,
    journalShowsParty,
    lineNote,
    lineParty,
    partyText,
    toIsoDate
}
from '../../../models/auto-journal-registers.model';

import
{
    AutoJournalRegistersService
}
from '../../../services/auto-journal-registers.service';

import
{
    saveJournalPrintRequest
}
from '../../../print/auto-journal-registers.print';


//===============================================================
// Option of the dropdowns
//===============================================================

interface Option
{
    label:string;
    value:any;
}


//===============================================================
// Auto Journal Registers : one page, no pop-ups
//
//   Left  : Module › Menu › Submenu (pages that post by
//           themselves) with the journal count of the period
//   Right : the journals of the chosen node, one under another
//           (header line, Dr / Cr lines, total; a cancelled
//           journal shows its reversal right after)
//
// From / To / Branch (toolbar) reload both sides. The Journal
// dropdown narrows the right side to one voucher (no reload).
//===============================================================

@Component(
{
    selector:'auto-journal-registers-list',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        CommandCenterComponent,
        SearchBoxComponent,
        SearchDropdownComponent,
        DatepickerComponent,
        ToastComponent
    ],

    templateUrl:'./auto-journal-registers-list.html',

    styleUrl:'./auto-journal-registers-list.css'
})

export class AutoJournalRegistersList
    implements OnInit
{
    private readonly service =
        inject(AutoJournalRegistersService);

    private readonly toast =
        inject(ToastService);

    private readonly router =
        inject(Router);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly destroyRef =
        inject(DestroyRef);

    readonly otherNode =
        AUTO_JOURNAL_OTHER;

    //===========================================================
    // Filters
    //===========================================================

    fromDate:
        Date =
        new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    toDate:
        Date =
        new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    branchId:
        number = 0;

    branchItems:
        Option[] =
        [{ label:'All Branches', value:0 }];

    //===========================================================
    // Tree
    //===========================================================

    modules:
        AutoJournalNode[] = [];

    total:
        number = 0;

    otherCount:
        number = 0;

    treeLoading:
        boolean = false;

    treeError:
        string = '';

    // Selected node ("" = all journals)
    node:
        string = '';

    // Opened modules / menus (by code). Empty = the tree loads
    // with every module collapsed (2026-11-14)
    private readonly expanded =
        new Set<string>();

    //===========================================================
    // Journals
    //===========================================================

    result:
        AutoJournalList | null = null;

    loading:
        boolean = false;

    loadError:
        string = '';

    // "" = every journal loaded
    voucherNo:
        string = '';

    voucherItems:
        Option[] = [];

    private treeRequest?:
        Subscription;

    private journalRequest?:
        Subscription;

    //===========================================================
    // View refresh after an answer : marks the page for the
    // next check and checks it now (a failure is logged, never
    // left as a stuck "Loading")
    //===========================================================

    private refreshView():
        void
    {
        this.cdr.markForCheck();

        try
        {
            this.cdr.detectChanges();
        }
        catch (error)
        {
            console.error('[Auto Journal Registers] view update failed', error);
        }
    }

    //===========================================================
    // Start
    //===========================================================

    ngOnInit():
        void
    {
        this.reload();
    }

    //===========================================================
    // Period / branch
    //===========================================================

    get fromText():
        string
    {
        return toIsoDate(this.fromDate);
    }

    get toText():
        string
    {
        return toIsoDate(this.toDate);
    }

    onFromChange
    (
        date:
            Date
    ):
        void
    {
        this.fromDate = date;

        if
        (
            this.fromDate > this.toDate
        )
        {
            this.toDate = date;
        }

        this.reload();
    }

    onToChange
    (
        date:
            Date
    ):
        void
    {
        this.toDate = date;

        if
        (
            this.toDate < this.fromDate
        )
        {
            this.fromDate = date;
        }

        this.reload();
    }

    onBranchChange
    (
        value:
            any
    ):
        void
    {
        this.branchId = Number(value) || 0;

        this.reload();
    }

    // Refresh : the default view (this month, all branches,
    // all journals, tree collapsed) loaded again
    refresh():
        void
    {
        const today =
            new Date();

        this.fromDate = new Date(today.getFullYear(), today.getMonth(), 1);

        this.toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        this.branchId = 0;

        this.node = '';

        this.voucherNo = '';

        this.searchText = '';

        this.expanded.clear();

        this.reload();
    }

    // Tree counts and the journals of the node (every change
    // of period, branch or node loads at once)
    reload():
        void
    {
        this.loadTree();

        this.loadJournals();
    }

    //===========================================================
    // Tree
    //===========================================================

    private loadTree():
        void
    {
        this.treeRequest?.unsubscribe();

        this.treeLoading = true;

        this.treeError = '';

        this.refreshView();

        this.treeRequest =
            this.service
                .getTree(this.fromText, this.toText, this.branchId)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe
                (
                    {
                        next:
                            tree =>
                            {
                                this.modules = tree.Modules;

                                this.total = tree.Total;

                                this.otherCount = tree.OtherCount;

                                this.branchItems =
                                [
                                    { label:'All Branches', value:0 },
                                    ...tree.Branches.map(x => ({ label:x.Name, value:x.Id }))
                                ];

                                // Node gone (page unlinked) : back to all
                                if
                                (
                                    this.node
                                    &&
                                    this.node !== AUTO_JOURNAL_OTHER
                                    &&
                                    !this.findNode(this.node)
                                )
                                {
                                    this.selectNode('');
                                }

                                this.treeLoading = false;

                                this.refreshView();
                            },

                        error:
                            err =>
                            {
                                this.treeLoading = false;

                                this.treeError = errorText(err, 'The journal sources could not be loaded.');

                                this.refreshView();
                            }
                    }
                );
    }

    private findNode
    (
        code:
            string,
        nodes:
            AutoJournalNode[] =
            this.modules
    ):
        AutoJournalNode | null
    {
        for (const item of nodes)
        {
            if
            (
                item.Code === code
            )
            {
                return item;
            }

            const child =
                this.findNode(code, item.Children);

            if
            (
                child
            )
            {
                return child;
            }
        }

        return null;
    }

    isOpen
    (
        code:
            string
    ):
        boolean
    {
        return this.expanded.has(code);
    }

    toggle
    (
        code:
            string,
        event:
            Event
    ):
        void
    {
        event.stopPropagation();

        if
        (
            this.expanded.has(code)
        )
        {
            this.expanded.delete(code);
        }
        else
        {
            this.expanded.add(code);
        }
    }

    // Module / menu row : the whole row opens it (and shows its
    // journals); a second click on the chosen row closes it
    openNode
    (
        code:
            string
    ):
        void
    {
        if
        (
            this.node === code
            ||
            !this.expanded.has(code)
        )
        {
            if
            (
                this.expanded.has(code)
            )
            {
                this.expanded.delete(code);
            }
            else
            {
                this.expanded.add(code);
            }
        }

        this.selectNode(code);
    }

    selectNode
    (
        code:
            string
    ):
        void
    {
        if
        (
            this.node === code
            &&
            this.result
        )
        {
            return;
        }

        this.node = code;

        this.loadJournals();
    }

    //===========================================================
    // Journals
    //===========================================================

    private loadJournals():
        void
    {
        this.journalRequest?.unsubscribe();

        this.loading = true;

        this.loadError = '';

        this.voucherNo = '';

        this.refreshView();

        this.journalRequest =
            this.service
                .getJournals(this.fromText, this.toText, this.branchId, this.node)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe
                (
                    {
                        next:
                            list =>
                            {
                                this.result = list;

                                this.applyFilter();

                                this.voucherItems =
                                [
                                    { label:'All journals in the period', value:'' },
                                    ...list.Journals.map
                                    (
                                        x =>
                                        ({
                                            label:`${x.VoucherNo} · ${formatJournalDate(x.VoucherDate)}`,
                                            value:x.VoucherNo
                                        })
                                    )
                                ];

                                this.loading = false;

                                this.refreshView();
                            },

                        error:
                            err =>
                            {
                                this.result = null;

                                this.journals = [];

                                this.voucherItems = [];

                                this.loading = false;

                                this.loadError = errorText(err, 'The journals could not be loaded.');

                                this.refreshView();
                            }
                    }
                );
    }

    onVoucherChange
    (
        value:
            any
    ):
        void
    {
        this.voucherNo = String(value ?? '');

        this.applyFilter();
    }

    // Search text (page header) : filters the loaded journals
    searchText:
        string = '';

    // Journals on the panel (journal dropdown + search); built
    // once per change
    journals:
        AutoJournal[] = [];

    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText = value ?? '';

        this.applyFilter();
    }

    private applyFilter():
        void
    {
        const all =
            this.result?.Journals ?? [];

        this.journals =
            all.filter
            (
                x =>
                    (!this.voucherNo || x.VoucherNo === this.voucherNo)
                    &&
                    journalMatches(x, this.searchText)
            );

        this.refreshView();
    }

    get panelTitle():
        string
    {
        return this.result?.NodePath
            || (this.node === AUTO_JOURNAL_OTHER ? 'Other' : 'All Auto Journals');
    }

    get periodText():
        string
    {
        return `${formatJournalDate(this.fromText)} – ${formatJournalDate(this.toText)}`;
    }

    get shownDebit():
        number
    {
        return this.journals.reduce((t, x) => t + x.TotalDebit, 0);
    }

    get shownCredit():
        number
    {
        return this.journals.reduce((t, x) => t + x.TotalCredit, 0);
    }

    // The source is shown on a journal when the node holds
    // more than one page
    get showSource():
        boolean
    {
        const item =
            this.node ? this.findNode(this.node) : null;

        return !item || item.Children.length > 0;
    }

    //===========================================================
    // Display helpers
    //===========================================================

    money
    (
        value:
            number
    ):
        string
    {
        return value ? formatMoney(value) : '';
    }

    total2
    (
        value:
            number
    ):
        string
    {
        return formatMoney(value);
    }

    date
    (
        iso:
            string
    ):
        string
    {
        return formatJournalDate(iso);
    }

    party
    (
        type:
            string,
        code:
            string,
        name:
            string
    ):
        string
    {
        return partyText(type, code, name);
    }

    // No repeats : a line's party / narration only when it adds
    // something; the column is left out when no line has any
    partyOf
    (
        line:
            AutoJournalLine,
        journal:
            AutoJournal
    ):
        string
    {
        return lineParty(line, journal);
    }

    noteOf
    (
        line:
            AutoJournalLine,
        journal:
            AutoJournal,
        reversal:
            boolean
    ):
        string
    {
        return lineNote(line, journal, reversal);
    }

    showParty
    (
        journal:
            AutoJournal
    ):
        boolean
    {
        return journalShowsParty(journal);
    }

    showNotes
    (
        journal:
            AutoJournal
    ):
        boolean
    {
        return journalShowsNotes(journal);
    }

    // Columns before Debit : Particulars, L.F., [Party], [Narration]
    leadCols
    (
        journal:
            AutoJournal
    ):
        number
    {
        return 2 + (this.showParty(journal) ? 1 : 0) + (this.showNotes(journal) ? 1 : 0);
    }

    // Credit line : "To …" (classic journal); debit : "… Dr."
    isCredit
    (
        line:
            AutoJournalLine
    ):
        boolean
    {
        return line.Credit > 0 && !line.Debit;
    }

    lineTotal
    (
        lines:
            AutoJournalLine[],
        side:
            'Debit' | 'Credit'
    ):
        number
    {
        return lines.reduce((t, x) => t + x[side], 0);
    }

    trackJournal
    (
        _index:
            number,
        journal:
            AutoJournal
    ):
        string
    {
        return journal.VoucherType + journal.VoucherNo;
    }

    //===========================================================
    // Print : what is on the panel (Print Viewer, new tab)
    //===========================================================

    print():
        void
    {
        const token =
            saveJournalPrintRequest(
                {
                    from:this.fromText,
                    to:this.toText,
                    branchId:this.branchId,
                    node:this.node,
                    voucherNo:this.voucherNo,
                    search:this.searchText
                }
            );

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    ['/print-viewer', AUTO_JOURNAL_PRINT_KEY, token],
                    {
                        queryParams:{ doc:'journal-register' }
                    }
                )
            );

        // Not "noopener" : the new tab keeps this session's login
        const tab =
            window.open(
                url,
                '_blank'
            );

        if
        (
            !tab
        )
        {
            this.toast.error(
                'Print Failed',
                'The browser blocked the print tab. Allow pop-ups for this site.'
            );
        }
    }
}


//===============================================================
// Error text of a failed request
//===============================================================

function errorText
(
    err:
        any,
    fallback:
        string
):
    string
{
    const body =
        err?.error;

    return typeof body === 'string' && body.trim()
        ? body.trim()
        : fallback;
}
