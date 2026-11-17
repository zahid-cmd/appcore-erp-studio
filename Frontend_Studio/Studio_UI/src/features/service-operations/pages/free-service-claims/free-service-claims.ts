//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    ChangeDetectorRef,
    DestroyRef,
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
    ActivatedRoute,
    Router
}
from '@angular/router';

import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import
{
    catchError,
    forkJoin,
    of
}
from 'rxjs';

import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../shared/components/layout/page-toolbar/page-toolbar';
import { ControlTab, ControlTabsComponent } from '../../../../shared/components/controls/control-tabs/control-tabs';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../shared/components/layout/page-canvas/page-canvas';
import { SearchDropdownComponent } from '../../../../shared/components/controls/search-dropdown/search-dropdown';
import { TextboxComponent } from '../../../../shared/components/controls/textbox/textbox';
import { DatepickerComponent } from '../../../../shared/components/controls/datepicker/datepicker';
import { SearchBoxComponent } from '../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { ListTableColumn, ListTableComponent } from '../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../shared/components/controls/pagination/pagination';
import { HistoryDrawerComponent } from '../../../../shared/components/utilities/history-drawer/history-drawer';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogComponent } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ConfirmDialogService } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ProgressDialogComponent } from '../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../human-resource-manangement/services/hr-progress.service';
import { hrToDate, hrToText } from '../../../human-resource-manangement/services/hr-date';

import { WsService } from '../../shared/ws.service';

import
{
    FreeServiceClaim,
    FreeServiceClaimLine,
    FreeServiceClaimLookups,
    WS_BILLING_PAGES,
    WsLedger,
    wsDay,
    wsMoney,
    wsStatusColor
}
from '../../shared/ws.models';


//===============================================================
// Model
//===============================================================

type Mode =
    'list' | 'add' | 'view';

interface Option
{
    label: string;
    value: any;
}


//===============================================================
// Free Service Claims (Service Operations > Service Billing)
//
// A free service on a service invoice left what the brand pays back
// on the brand's claim ledger. A claim collects those free services
// of one brand; when the brand pays (or adjusts) it, the claim is
// settled : Dr the account the money went to / Cr the claim ledger.
//===============================================================

@Component(
{
    selector:'free-service-claims',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        ControlTabsComponent,
        SearchDropdownComponent,
        TextboxComponent,
        DatepickerComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./free-service-claims.html',

    styleUrl:'../service-invoices/service-invoices.css'
})

export class FreeServiceClaimsPage
implements OnInit
{
    private readonly ws = inject(WsService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly toast = inject(ToastService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly progress = inject(HrProgressService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly destroyRef = inject(DestroyRef);

    readonly asDate = hrToDate;
    readonly money = wsMoney;
    readonly day = wsDay;

    mode:
        Mode = 'list';

    entityId =
        '';

    loading =
        false;

    loadFailed =
        false;

    isSaving =
        false;

    readonly listConfig:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:true,
        reserveFooterSpace:true,
        bodyScrollable:true,
        fixedHeight:true,
        visibleRows:10,
        rowHeight:32,
        headerHeight:36,
        footerHeight:56
    };

    readonly formConfig:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:false,
        reserveFooterSpace:false,
        bodyScrollable:true,
        fixedHeight:true
    };

    readonly tabs:
        ControlTab[] =
    [
        { id:'all', label:'All' },
        { id:'Open', label:'Open' },
        { id:'Settled', label:'Settled' },
        { id:'Cancelled', label:'Cancelled' }
    ];

    selectedTab =
        'all';

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Claim No', field:'ClaimNo', width:'115px', align:'center' },
        { header:'Date', field:'DateText', width:'105px', align:'center' },
        { header:'Brand', field:'BrandName', width:'180px', align:'left' },
        { header:'Services', field:'ServiceCount', width:'80px', align:'right' },
        { header:'Amount', field:'AmountText', width:'120px', align:'right' },
        { header:'Settled On', field:'SettledText', width:'105px', align:'center' },
        { header:'Settled In', field:'SettledLedgerName', width:'200px', align:'left' },
        { header:'Voucher', field:'SettlementNo', width:'190px', align:'center' },
        { header:'Status', field:'Status', width:'110px', align:'left', dotField:'StatusColor' },
        { header:'Actions', field:'actions', type:'actions', width:'80px', align:'center' }
    ];

    readonly listActions =
        { view:true, edit:false, delete:false };

    private all:
        any[] = [];

    rows:
        any[] = [];

    searchText =
        '';

    currentPage =
        1;

    pageSize =
        10;

    totalRecords =
        0;

    historyOpened =
        false;

    historyItems:
        any[] = [];

    // Form

    lookups:
        FreeServiceClaimLookups | null = null;

    doc:
        FreeServiceClaim | null = null;

    brandItems:
        Option[] = [];

    ledgerItems:
        Option[] = [];

    private ledgers:
        WsLedger[] = [];

    brandId:
        number | null = null;

    claimDate =
        '';

    remarks =
        '';

    lines:
        FreeServiceClaimLine[] = [];

    ticked:
        Record<number, boolean> = {};

    // Settlement

    settledDate =
        '';

    settledLedger =
        '';

    settledRef =
        '';

    get canEdit(): boolean
    {
        return this.mode === 'add' && !!this.brandId;
    }

    get isOpen(): boolean
    {
        return this.mode === 'view' && this.doc?.Status === 'Open';
    }

    get statusColor(): string
    {
        return wsStatusColor(this.doc?.Status ?? 'Open');
    }

    get total(): number
    {
        return this.mode === 'add'
            ? Math.round(this.lines.filter(x => this.ticked[x.LineId]).reduce((sum, x) => sum + x.Amount, 0) * 100) / 100
            : (this.doc?.TotalAmount ?? 0);
    }

    get tickedCount(): number
    {
        return this.lines.filter(x => this.ticked[x.LineId]).length;
    }

    ngOnInit():
        void
    {
        const url =
            this.router.url.toLowerCase();

        this.mode =
            url.includes('/view/') ? 'view' : url.includes('/add') ? 'add' : 'list';

        this.entityId =
            this.route.snapshot.paramMap.get('id') ?? '';

        if (this.mode === 'list')
        {
            this.loadList();
        }
        else
        {
            this.loadForm();
        }
    }

    private failed(error: any, fallback: string):
        void
    {
        this.toast.error('Error', error?.error?.message ?? fallback);
        this.cdr.detectChanges();
    }


    //===========================================================
    // List
    //===========================================================

    loadList():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.ws
            .getClaims()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:claims =>
                {
                    this.all =
                        (claims ?? []).map(x => ({
                            ...x,
                            DateText:wsDay(x.ClaimDate),
                            AmountText:wsMoney(x.TotalAmount),
                            SettledText:wsDay(x.SettledDate),
                            StatusColor:wsStatusColor(x.Status)
                        }));

                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.failed(error, 'Claims could not be loaded.');
                }
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const matched =
            this.all.filter(x =>
                (this.selectedTab === 'all' || x.Status === this.selectedTab)
                && (!find
                    || [x.ClaimNo, x.BrandName, x.SettlementNo, x.SettlementRef, x.SettledLedgerName, x.Status]
                        .some(v => String(v ?? '').toLowerCase().includes(find))));

        this.totalRecords = matched.length;

        const pages = Math.max(1, Math.ceil(matched.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        const start = (this.currentPage - 1) * this.pageSize;

        this.rows = matched.slice(start, start + this.pageSize);

        this.cdr.detectChanges();
    }

    onTab(value: string):
        void
    {
        this.selectedTab = value || 'all';
        this.currentPage = 1;
        this.apply();
    }

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
        this.currentPage = 1;
        this.apply();
    }

    onPageChange(page: number):
        void
    {
        this.currentPage = page;
        this.apply();
    }

    onPageSizeChange(size: number):
        void
    {
        this.pageSize = size;
        this.currentPage = 1;
        this.apply();
    }

    onSort(_event: any):
        void
    {
        // Newest first
    }

    add():
        void
    {
        void this.router.navigate(['../add'], { relativeTo:this.route });
    }

    view(row: any):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    goToList():
        void
    {
        void this.router.navigate([this.mode === 'add' ? '../list' : '../../list'], { relativeTo:this.route });
    }

    openHistory():
        void
    {
        this.ws
            .getHistory(WS_BILLING_PAGES.claims)
            .subscribe(
            {
                next:items =>
                {
                    this.historyItems = items;
                    this.historyOpened = true;
                    this.cdr.detectChanges();
                },
                error:() => this.toast.error('Error', 'The history could not be loaded.')
            });
    }

    closeHistory():
        void
    {
        this.historyOpened = false;
        this.cdr.detectChanges();
    }


    //===========================================================
    // Form
    //===========================================================

    private loadForm():
        void
    {
        this.loading = true;
        this.cdr.detectChanges();

        if (this.mode === 'view')
        {
            forkJoin({ doc:this.ws.getClaim(this.entityId), ledgers:this.ws.getLedgers().pipe(catchError(() => of([] as WsLedger[]))) })
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(
                {
                    next:({ doc, ledgers }) =>
                    {
                        this.loading = false;
                        this.ledgers = ledgers ?? [];

                        this.ledgerItems =
                            this.ledgers.map(x => ({ label:`${x.LedgerName}  (${x.LedgerCode})${x.LedgerType ? '  |  ' + x.LedgerType : ''}`, value:x.LedgerCode }));

                        this.settledDate = hrToText(new Date());
                        this.show(doc);
                    },
                    error:error =>
                    {
                        this.loading = false;
                        this.failed(error, 'The claim could not be loaded.');
                    }
                });

            return;
        }

        this.ws
            .getClaimLookups()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:lookups =>
                {
                    this.loading = false;
                    this.lookups = lookups;
                    this.claimDate = (lookups.Today ?? '').substring(0, 10) || hrToText(new Date());

                    this.brandItems =
                        (lookups.Brands ?? []).map(x => ({ label:`${x.BrandName}  |  ${x.ServiceCount} free service(s)  |  ${wsMoney(x.Amount)}`, value:x.BrandManagementId }));

                    if (this.brandItems.length === 1)
                    {
                        this.onBrand(this.brandItems[0].value);
                    }

                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.loading = false;
                    this.failed(error, 'The claim form could not be loaded.');
                }
            });
    }

    private show(doc: FreeServiceClaim):
        void
    {
        this.doc = doc;
        this.claimDate = (doc.ClaimDate ?? '').substring(0, 10);
        this.remarks = doc.Remarks ?? '';
        this.lines = doc.Lines ?? [];
        this.cdr.detectChanges();
    }

    onBrand(value: any):
        void
    {
        this.brandId = value ? Number(value) : null;
        this.lines = [];
        this.ticked = {};
        this.cdr.detectChanges();

        if (!this.brandId)
        {
            return;
        }

        this.ws
            .getClaimOpenLines(this.brandId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:lines =>
                {
                    this.lines = lines ?? [];

                    // everything of the brand, until the user unticks
                    this.ticked = {};

                    for (const line of this.lines)
                    {
                        this.ticked[line.LineId] = true;
                    }

                    this.cdr.detectChanges();
                },
                error:error => this.failed(error, 'The free services could not be loaded.')
            });
    }

    onDate(date: Date | null):
        void
    {
        this.claimDate = date ? hrToText(date) : '';
    }

    onRemarks(value: any):
        void
    {
        this.remarks = String(value ?? '');
    }

    onTick(line: FreeServiceClaimLine, event: Event):
        void
    {
        this.ticked[line.LineId] = (event.target as HTMLInputElement).checked;
        this.cdr.detectChanges();
    }

    onSave():
        void
    {
        if (this.isSaving || this.loading || !this.canEdit || !this.brandId)
        {
            return;
        }

        if (!this.claimDate)
        {
            this.toast.error('Validation', 'Choose the date.');
            return;
        }

        const ids = this.lines.filter(x => this.ticked[x.LineId]).map(x => x.LineId);

        if (ids.length === 0)
        {
            this.toast.error('Validation', 'Tick the free services that go on the claim.');
            return;
        }

        this.isSaving = true;

        this.progress.show('Saving', 'Saving the claim...');

        this.ws
            .createClaim({ BrandManagementId:this.brandId, ClaimDate:this.claimDate, Remarks:this.remarks.trim(), LineIds:ids })
            .subscribe(
            {
                next:saved =>
                    this.progress.finish(() =>
                    {
                        this.isSaving = false;
                        this.toast.success('Success', `${saved.ClaimNo} was saved.`);

                        void this.router.navigate(['../view', saved.PublicId], { relativeTo:this.route });
                    }),
                error:error =>
                {
                    this.progress.fail();
                    this.isSaving = false;
                    this.failed(error, 'The claim could not be saved.');
                }
            });
    }


    //===========================================================
    // An open claim : settle or cancel
    //===========================================================

    onSettledDate(date: Date | null):
        void
    {
        this.settledDate = date ? hrToText(date) : '';
    }

    onSettledLedger(value: any):
        void
    {
        this.settledLedger = value ? String(value) : '';
    }

    onSettledRef(value: any):
        void
    {
        this.settledRef = String(value ?? '');
    }

    settle():
        void
    {
        if (!this.doc || this.isSaving)
        {
            return;
        }

        if (!this.settledDate)
        {
            this.toast.error('Validation', 'Choose the date the brand settled the claim.');
            return;
        }

        if (!this.settledLedger)
        {
            this.toast.error('Validation', 'Choose the account the money of the brand went to.');
            return;
        }

        const doc = this.doc;

        const ledgerName = this.ledgers.find(x => x.LedgerCode === this.settledLedger)?.LedgerName ?? '';

        this.confirmDialog.open(
            'Settle the Claim',
            `Settle ${doc.ClaimNo} : ${wsMoney(doc.TotalAmount)} received from ${doc.BrandName} in ${ledgerName}? It is posted to the accounts at once and cannot be changed.`,
            () =>
            {
                this.isSaving = true;

                this.progress.show('Posting', 'Settling the claim...');

                this.ws
                    .settleClaim(doc.PublicId, { SettledDate:this.settledDate, LedgerCode:this.settledLedger, LedgerName:ledgerName, Reference:this.settledRef.trim() })
                    .subscribe(
                    {
                        next:saved =>
                            this.progress.finish(() =>
                            {
                                this.isSaving = false;
                                this.toast.success('Success', `${saved.ClaimNo} was settled (${saved.SettlementNo}).`);
                                this.show(saved);
                            }),
                        error:error =>
                        {
                            this.progress.fail();
                            this.isSaving = false;
                            this.failed(error, 'The claim could not be settled.');
                        }
                    });
            },
            'Settle',
            'Not yet',
            'primary');
    }

    cancel():
        void
    {
        if (!this.doc || this.isSaving)
        {
            return;
        }

        const doc = this.doc;

        this.confirmDialog.open(
            'Cancel the Claim',
            `Cancel ${doc.ClaimNo}? Its free services become free for another claim.`,
            () =>
            {
                this.isSaving = true;

                this.ws.cancelClaim(doc.PublicId).subscribe(
                {
                    next:saved =>
                    {
                        this.isSaving = false;
                        this.toast.success('Success', `${saved.ClaimNo} was cancelled.`);
                        this.show(saved);
                    },
                    error:error =>
                    {
                        this.isSaving = false;
                        this.failed(error, 'The claim could not be cancelled.');
                    }
                });
            },
            'Cancel the claim',
            'Keep it',
            'danger');
    }
}
