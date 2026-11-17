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
    Observable,
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
import { ListTableColumn, ListTableComponent, ListTableRowAction, ListTableRowActionEvent } from '../../../../shared/components/layout/list-table/list-table';
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
import { openPartsDocumentPrint } from '../../print/parts-document.print';

import
{
    PartsDocument,
    PartsKind,
    PartsLine,
    PartsLookups,
    WS_PARTS_PAGES,
    WsPartOption,
    wsDay,
    wsMoney,
    wsStatusColor
}
from '../../shared/ws.models';


//===============================================================
// Model
//===============================================================

type Mode =
    'list' | 'add' | 'edit' | 'view';

// A part line of the form
interface Line
{
    key: number;
    SourceLineId: number | null;
    ItemKind: string;
    ItemId: number;
    ItemCode: string;
    ItemName: string;
    Quantity: string;
    Note: string;

    // The most the line can carry (a requisition's waiting quantity,
    // an issue's quantity that can still come back); null : no limit
    Max: number | null;

    // A saved line : what the server keeps
    Issued: number;
    Returned: number;
    Cost: number;
}

interface Option
{
    label: string;
    value: any;
}

// What differs between the three pages
const WORDS:
    Record<PartsKind, { title: string; one: string; subtitle: string; icon: string; noLabel: string; search: string }> =
{
    requisition:
    {
        title:'Parts Requisitions',
        one:'Parts Requisition',
        subtitle:'The workshop asks the store for the parts of a job card',
        icon:'fas fa-clipboard-list',
        noLabel:'Requisition No',
        search:'Search requisition, job card, customer...'
    },
    issue:
    {
        title:'Parts Issues',
        one:'Parts Issue',
        subtitle:'Parts go out of the store to a job card : stock out, cost to Workshop WIP',
        icon:'fas fa-dolly',
        noLabel:'Issue No',
        search:'Search issue, job card, customer, requisition...'
    },
    return:
    {
        title:'Parts Returns',
        one:'Parts Return',
        subtitle:'Unused parts of a job card go back to the store',
        icon:'fas fa-rotate-left',
        noLabel:'Return No',
        search:'Search return, job card, customer, issue...'
    }
};


//===============================================================
// Parts Requisitions, Parts Issues, Parts Returns (Service
// Operations > Workshop Management)
//
// One component for the three pages (the address says which) : the
// list, and the form of one document.
//
// Requisition : Open > Partly Issued > Issued; it can be changed
// while it is Open. Issue and return : posted at once (stock and
// journal), so they have no edit : a wrong issue is returned.
//===============================================================

@Component(
{
    selector:'parts-documents',

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

    templateUrl:'./parts-documents.html',

    styleUrl:'./parts-documents.css'
})

export class PartsDocumentsPage
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

    kind:
        PartsKind = 'requisition';

    words =
        WORDS.requisition;

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

    // The fields can be changed
    get canEdit(): boolean
    {
        if (this.kind === 'requisition')
        {
            return this.mode === 'add' ? !!this.jobCardPublicId : (this.mode === 'edit' && !!this.doc?.CanEdit);
        }

        return this.mode === 'add' && (this.kind === 'issue' ? !!this.jobCardPublicId : !!this.issuePublicId);
    }

    get pageTitle(): string
    {
        return `${this.mode === 'add' ? 'Add' : this.mode === 'edit' ? 'Update' : 'View'} ${this.words.one}`;
    }

    get saveText(): string
    {
        return this.kind === 'issue' ? 'Issue' : this.kind === 'return' ? 'Return' : this.mode === 'edit' ? 'Update' : 'Save';
    }

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


    //===========================================================
    // List
    //===========================================================

    readonly tabs:
        ControlTab[] =
    [
        { id:'all', label:'All' },
        { id:'Open', label:'Open' },
        { id:'Partly Issued', label:'Partly Issued' },
        { id:'Issued', label:'Issued' },
        { id:'Closed', label:'Closed' },
        { id:'Cancelled', label:'Cancelled' }
    ];

    selectedTab =
        'all';

    columns:
        ListTableColumn[] = [];

    listActions =
        { view:true, edit:true, delete:false };

    readonly rowActions:
        ListTableRowAction[] =
    [
        { key:'print', icon:'fas fa-print', title:'Print', tone:'primary' }
    ];

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


    //===========================================================
    // Form
    //===========================================================

    lookups:
        PartsLookups | null = null;

    // The saved document (null : a new one)
    doc:
        PartsDocument | null = null;

    // Where the job card facts come from : the saved document, the
    // draft of a job card, the requisition or the issue picked
    head:
        PartsDocument | null = null;

    jobCardItems:
        Option[] = [];

    requisitionItems:
        Option[] = [];

    issueItems:
        Option[] = [];

    warehouseItems:
        Option[] = [];

    personItems:
        Option[] = [];

    partItems:
        Option[] = [];

    private parts:
        WsPartOption[] | null = null;

    // What the warehouse holds : 'SparePart:12' -> quantity
    private stock:
        Record<string, number> | null = null;

    docNo =
        '';

    docDate =
        '';

    jobCardPublicId =
        '';

    requisitionPublicId =
        '';

    issuePublicId =
        '';

    warehouseId:
        number | null = null;

    personId:
        number | null = null;

    remarks =
        '';

    private nextKey =
        1;

    lines:
        Line[] = [];

    partPick:
        any = null;

    get statusColor(): string
    {
        return wsStatusColor(this.doc?.Status ?? 'Open');
    }

    get totalQuantity(): number
    {
        return this.lines.reduce((sum, x) => sum + (Number(x.Quantity) || 0), 0);
    }

    // The headings of the two columns after the quantity
    get colA(): string
    {
        if (this.kind === 'requisition')
        {
            return 'Issued';
        }

        if (this.kind === 'issue')
        {
            return this.mode === 'add' ? 'In Stock' : 'Cost';
        }

        return this.mode === 'add' ? 'Issued' : 'Cost';
    }

    get colB(): string
    {
        if (this.kind === 'requisition')
        {
            return 'Waiting';
        }

        if (this.kind === 'issue')
        {
            return this.mode === 'add' ? (this.requisitionPublicId ? 'Waiting' : '') : 'Returned';
        }

        return this.mode === 'add' ? 'Can Return' : '';
    }

    private number(value: number | null | undefined): string
    {
        return value === null || value === undefined ? '' : String(Math.round(value * 100) / 100);
    }

    stockOf(line: Line): number | null
    {
        return this.stock ? (this.stock[`${line.ItemKind}:${line.ItemId}`] ?? 0) : null;
    }

    textA(line: Line): string
    {
        if (this.kind === 'requisition')
        {
            return this.number(line.Issued);
        }

        if (this.mode !== 'add')
        {
            return wsMoney(line.Cost);
        }

        return this.kind === 'issue' ? this.number(this.stockOf(line)) : this.number(line.Issued);
    }

    textB(line: Line): string
    {
        if (this.kind === 'requisition')
        {
            return this.number(Math.max(0, (Number(line.Quantity) || 0) - line.Issued));
        }

        if (this.kind === 'issue')
        {
            return this.mode === 'add' ? this.number(line.Max) : this.number(line.Returned);
        }

        return this.mode === 'add' ? this.number(line.Max) : '';
    }

    // An issue line asks for more than the warehouse holds
    isShort(line: Line): boolean
    {
        const stock = this.stockOf(line);

        return this.kind === 'issue' && this.mode === 'add' && stock !== null && (Number(line.Quantity) || 0) > stock;
    }

    // The service center of the job card on the form (0 : none yet)
    private get branchId(): number
    {
        if (this.head?.BranchId)
        {
            return this.head.BranchId;
        }

        return (this.lookups?.JobCards ?? []).find(x => x.PublicId === this.jobCardPublicId)?.BranchId ?? 0;
    }


    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        const url =
            this.router.url.toLowerCase();

        this.kind =
            url.includes('/parts-issues') ? 'issue' : url.includes('/parts-returns') ? 'return' : 'requisition';

        this.words =
            WORDS[this.kind];

        this.mode =
            url.includes('/view/') ? 'view' : url.includes('/edit/') ? 'edit' : url.includes('/add') ? 'add' : 'list';

        this.entityId =
            this.route.snapshot.paramMap.get('id') ?? '';

        this.listActions =
            { view:true, edit:this.kind === 'requisition', delete:false };

        this.columns =
            this.kind === 'requisition'
                ? [
                    { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
                    { header:'Requisition', field:'DocumentNo', width:'115px', align:'center' },
                    { header:'Date', field:'DateText', width:'105px', align:'center' },
                    { header:'Job Card', field:'JobCardNo', width:'105px', align:'center' },
                    { header:'Customer', field:'CustomerName', width:'180px', align:'left' },
                    { header:'Model', field:'ModelName', width:'150px', align:'left' },
                    { header:'Bike', field:'BikeNo', width:'150px', align:'left' },
                    { header:'Requested By', field:'PersonName', width:'160px', align:'left' },
                    { header:'Qty', field:'QuantityText', width:'70px', align:'right' },
                    { header:'Status', field:'Status', width:'120px', align:'left', dotField:'StatusColor' },
                    { header:'Actions', field:'actions', type:'actions', width:'130px', align:'center' }
                ]
                : [
                    { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
                    { header:this.words.noLabel, field:'DocumentNo', width:'190px', align:'center' },
                    { header:'Date', field:'DateText', width:'105px', align:'center' },
                    { header:'Job Card', field:'JobCardNo', width:'105px', align:'center' },
                    { header:'Customer', field:'CustomerName', width:'180px', align:'left' },
                    { header:this.kind === 'issue' ? 'Requisition' : 'Issue No', field:'SourceNo', width:this.kind === 'issue' ? '115px' : '190px', align:'center' },
                    { header:'Warehouse', field:'WarehouseName', width:'160px', align:'left' },
                    ...(this.kind === 'issue' ? [{ header:'Technician', field:'PersonName', width:'150px', align:'left' } as ListTableColumn] : []),
                    { header:'Qty', field:'QuantityText', width:'70px', align:'right' },
                    { header:'Cost', field:'CostText', width:'115px', align:'right' },
                    { header:'Actions', field:'actions', type:'actions', width:'110px', align:'center' }
                ];

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
            .getPartsDocuments(this.kind)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:documents =>
                {
                    this.all =
                        (documents ?? []).map(x => ({
                            ...x,
                            DateText:wsDay(x.DocumentDate),
                            QuantityText:this.number(x.TotalQuantity),
                            CostText:wsMoney(x.TotalCost),
                            StatusColor:wsStatusColor(x.Status)
                        }));

                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.failed(error, `${this.words.title} could not be loaded.`);
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
                    || [x.DocumentNo, x.JobCardNo, x.CustomerName, x.Mobile, x.ModelName, x.BikeNo, x.SourceNo, x.WarehouseName, x.PersonName, x.Status]
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

    edit(row: any):
        void
    {
        void this.router.navigate([row.CanEdit ? '../edit' : '../view', row.PublicId], { relativeTo:this.route });
    }

    goToList():
        void
    {
        void this.router.navigate([this.mode === 'add' ? '../list' : '../../list'], { relativeTo:this.route });
    }

    onRowAction(event: ListTableRowActionEvent):
        void
    {
        if (event.key === 'print')
        {
            this.print(event.row?.PublicId);
        }
    }

    print(publicId?: string):
        void
    {
        const id = publicId || this.doc?.PublicId || '';

        if (!id)
        {
            return;
        }

        const problem = openPartsDocumentPrint(this.router, this.kind, id);

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }

    openHistory():
        void
    {
        this.ws
            .getHistory(WS_PARTS_PAGES[this.kind])
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
    // Form : load
    //===========================================================

    private loadForm():
        void
    {
        this.loading = true;
        this.cdr.detectChanges();

        const doc$: Observable<PartsDocument | null> =
            this.mode === 'add' ? of(null) : this.ws.getPartsDocument(this.kind, this.entityId);

        forkJoin({ lookups:this.ws.getPartsLookups(this.kind), doc:doc$ })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:({ lookups, doc }) =>
                {
                    this.lookups = lookups;
                    this.loading = false;

                    this.jobCardItems = (lookups.JobCards ?? []).map(x => ({ label:x.Text, value:x.PublicId }));
                    this.issueItems = (lookups.Issues ?? []).map(x => ({ label:x.Text, value:x.PublicId }));

                    if (doc)
                    {
                        // a requisition that cannot be changed is only shown
                        if (this.mode === 'edit' && !doc.CanEdit && (doc.NextStatuses ?? []).length === 0)
                        {
                            void this.router.navigate(['../../view', doc.PublicId], { relativeTo:this.route });
                            return;
                        }

                        this.fill(doc);
                    }
                    else
                    {
                        this.docNo = this.kind === 'requisition' ? (lookups.NextRequisitionNo ?? '') : 'Given when it is posted';
                        this.docDate = (lookups.Today ?? '').substring(0, 10) || hrToText(new Date());

                        const query = this.route.snapshot.queryParamMap;

                        if (this.kind === 'return' && query.get('issue'))
                        {
                            this.onIssue(query.get('issue'));
                        }
                        else if (this.kind === 'issue' && query.get('requisition'))
                        {
                            this.onRequisition(query.get('requisition'));
                        }
                        else if (this.kind !== 'return' && query.get('jobCard'))
                        {
                            this.onJobCard(query.get('jobCard'));
                        }
                    }

                    this.buildItems();
                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.failed(error, `The ${this.words.one.toLowerCase()} could not be loaded.`);
                }
            });
    }

    private toLine(x: PartsLine, quantity: number, max: number | null): Line
    {
        return {
            key:this.nextKey++,
            SourceLineId:x.SourceLineId ?? null,
            ItemKind:x.ItemKind,
            ItemId:x.ItemId,
            ItemCode:x.ItemCode ?? '',
            ItemName:x.ItemName ?? '',
            Quantity:quantity > 0 ? String(quantity) : '',
            Note:x.Note ?? '',
            Max:max,
            Issued:x.IssuedQuantity ?? 0,
            Returned:x.ReturnedQuantity ?? 0,
            Cost:x.Cost ?? 0
        };
    }

    // A saved document on the form
    private fill(doc: PartsDocument):
        void
    {
        this.doc = doc;
        this.head = doc;
        this.docNo = doc.DocumentNo;
        this.docDate = (doc.DocumentDate ?? '').substring(0, 10);
        this.jobCardPublicId = doc.JobCardPublicId ?? '';
        this.warehouseId = doc.WarehouseId ?? null;
        this.personId = doc.PersonId ?? null;
        this.remarks = doc.Remarks ?? '';
        this.lines = (doc.Lines ?? []).map(x => this.toLine(x, x.Quantity, null));

        this.buildItems();

        if (this.canEdit)
        {
            this.loadParts();
        }
    }

    // The lists that follow the job card (its service center)
    private buildItems():
        void
    {
        const branch = this.branchId;

        this.requisitionItems =
            (this.lookups?.Requisitions ?? [])
                .filter(x => !this.jobCardPublicId || x.JobCardPublicId === this.jobCardPublicId)
                .map(x => ({ label:x.Text, value:x.PublicId }));

        this.warehouseItems =
            (this.lookups?.Warehouses ?? [])
                .filter(x => !branch || x.BranchId === branch)
                .map(x => ({ label:x.Name, value:x.Id }));

        this.personItems =
            this.kind === 'requisition'
                ? (this.lookups?.Employees ?? []).map(x => ({ label:`${x.Code}  ${x.Name}`, value:x.Id }))
                : (this.lookups?.Technicians ?? [])
                    .filter(x => !branch || x.BranchId === branch)
                    .map(x => ({ label:`${x.Code}  ${x.Name}`, value:x.Id }));

        this.buildPartItems();
    }

    private buildPartItems():
        void
    {
        this.partItems =
            (this.parts ?? []).map(x =>
            {
                const stock =
                    this.kind === 'issue' ? (this.stock ? (this.stock[`${x.Kind}:${x.Id}`] ?? 0) : null) : x.OnHand;

                return {
                    label:`${x.PartNumber || x.Code}  ${x.Name}${stock === null ? '' : `  (stock ${stock})`}`,
                    value:`${x.Kind}:${x.Id}`
                };
            });
    }

    // The service center the parts were read for
    private partsBranch =
        0;

    // The parts of the business lines the service center of the job
    // card runs (Business Configuration); read again for another
    // service center
    private loadParts():
        void
    {
        const branch = this.branchId;

        if (this.kind === 'return' || !branch || (this.parts !== null && this.partsBranch === branch))
        {
            return;
        }

        this.parts = [];
        this.partsBranch = branch;

        this.ws.getPartsCatalogue(this.kind, branch).subscribe(
        {
            next:parts =>
            {
                if (branch !== this.partsBranch)
                {
                    return;
                }

                this.parts = parts ?? [];
                this.buildPartItems();
                this.cdr.detectChanges();
            },
            error:error =>
            {
                this.parts = null;
                this.failed(error, 'The parts could not be loaded.');
            }
        });
    }

    private loadStock():
        void
    {
        this.stock = null;

        if (this.kind !== 'issue' || !this.warehouseId)
        {
            this.buildPartItems();
            return;
        }

        this.ws.getPartsStock(this.warehouseId).subscribe(
        {
            next:rows =>
            {
                const stock: Record<string, number> = {};

                for (const x of rows ?? [])
                {
                    stock[`${x.ItemKind}:${x.ItemId}`] = x.OnHand;
                }

                this.stock = stock;
                this.buildPartItems();
                this.cdr.detectChanges();
            },
            error:error => this.failed(error, 'The stock could not be read.')
        });
    }

    // The first warehouse of the service center is taken
    private defaultWarehouse():
        void
    {
        this.buildItems();

        if (this.kind === 'issue' && !this.warehouseItems.some(x => x.value === this.warehouseId))
        {
            this.warehouseId = this.warehouseItems.length > 0 ? this.warehouseItems[0].value : null;
        }

        this.loadStock();
    }


    //===========================================================
    // Form : the head
    //===========================================================

    // A requisition : the parts the job card needs come on the form.
    // An issue : the job card the parts go to
    onJobCard(value: any):
        void
    {
        const publicId = String(value ?? '');

        if (!publicId || this.mode !== 'add' || this.kind === 'return')
        {
            return;
        }

        if (this.kind === 'issue')
        {
            if (publicId !== this.jobCardPublicId)
            {
                this.jobCardPublicId = publicId;
                this.requisitionPublicId = '';
                this.head = null;
                this.lines = [];
            }

            this.defaultWarehouse();
            this.loadParts();
            this.cdr.detectChanges();
            return;
        }

        this.jobCardPublicId = publicId;
        this.loading = true;
        this.cdr.detectChanges();

        this.ws.getRequisitionDraft(publicId).subscribe(
        {
            next:draft =>
            {
                this.loading = false;
                this.head = draft;
                this.docNo = draft.DocumentNo || this.docNo;
                this.lines = (draft.Lines ?? []).map(x => this.toLine(x, x.Quantity, null));
                this.buildItems();
                this.loadParts();
                this.cdr.detectChanges();
            },
            error:error =>
            {
                this.loading = false;
                this.jobCardPublicId = '';
                this.head = null;
                this.failed(error, 'The job card could not be read.');
            }
        });
    }

    // An issue against a requisition : what it still waits for comes
    // on the form
    onRequisition(value: any):
        void
    {
        const publicId = String(value ?? '');

        if (this.mode !== 'add' || this.kind !== 'issue')
        {
            return;
        }

        if (!publicId)
        {
            this.requisitionPublicId = '';
            this.head = null;
            this.lines = [];
            this.cdr.detectChanges();
            return;
        }

        this.loading = true;
        this.cdr.detectChanges();

        this.ws.getIssueRequisition(publicId).subscribe(
        {
            next:requisition =>
            {
                this.loading = false;
                this.requisitionPublicId = publicId;
                this.jobCardPublicId = requisition.JobCardPublicId;
                this.head = requisition;

                this.lines =
                    (requisition.Lines ?? [])
                        .filter(x => x.Quantity > x.IssuedQuantity)
                        .map(x =>
                        {
                            const waiting = Math.round((x.Quantity - x.IssuedQuantity) * 100) / 100;

                            return this.toLine({ ...x, SourceLineId:x.LineId }, waiting, waiting);
                        });

                this.defaultWarehouse();
                this.cdr.detectChanges();
            },
            error:error =>
            {
                this.loading = false;
                this.failed(error, 'The requisition could not be read.');
            }
        });
    }

    // A return : the lines of the issue that can still come back
    onIssue(value: any):
        void
    {
        const publicId = String(value ?? '');

        if (!publicId || this.mode !== 'add' || this.kind !== 'return')
        {
            return;
        }

        this.loading = true;
        this.cdr.detectChanges();

        this.ws.getReturnIssue(publicId).subscribe(
        {
            next:issue =>
            {
                this.loading = false;
                this.issuePublicId = publicId;
                this.jobCardPublicId = issue.JobCardPublicId;
                this.head = issue;
                this.warehouseId = issue.WarehouseId ?? null;

                this.lines =
                    (issue.Lines ?? [])
                        .filter(x => x.Quantity > x.ReturnedQuantity)
                        .map(x => this.toLine(
                            { ...x, SourceLineId:x.LineId, IssuedQuantity:x.Quantity, Note:'' },
                            0,
                            Math.round((x.Quantity - x.ReturnedQuantity) * 100) / 100));

                this.buildItems();
                this.cdr.detectChanges();
            },
            error:error =>
            {
                this.loading = false;
                this.failed(error, 'The parts issue could not be read.');
            }
        });
    }

    onWarehouse(value: any):
        void
    {
        this.warehouseId = value ? Number(value) : null;
        this.loadStock();
        this.cdr.detectChanges();
    }

    onPerson(value: any):
        void
    {
        this.personId = value ? Number(value) : null;
    }

    onRemarks(value: any):
        void
    {
        this.remarks = String(value ?? '');
    }

    onDate(date: Date | null):
        void
    {
        this.docDate = date ? hrToText(date) : '';
        this.cdr.detectChanges();
    }


    //===========================================================
    // Form : the lines
    //===========================================================

    // Parts are picked on a requisition, and on an issue that has no
    // requisition
    get canPick(): boolean
    {
        return this.canEdit && (this.kind === 'requisition' || (this.kind === 'issue' && !this.requisitionPublicId));
    }

    onPartPick(value: any):
        void
    {
        if (!value)
        {
            return;
        }

        this.partPick = value;

        const part =
            (this.parts ?? []).find(x => `${x.Kind}:${x.Id}` === String(value));

        if (part)
        {
            if (this.lines.some(x => x.ItemKind === part.Kind && x.ItemId === part.Id))
            {
                this.toast.error('Parts', `${part.Name} is already on the form : change its quantity.`);
            }
            else
            {
                this.lines =
                [
                    ...this.lines,
                    {
                        key:this.nextKey++,
                        SourceLineId:null,
                        ItemKind:part.Kind,
                        ItemId:part.Id,
                        ItemCode:part.PartNumber || part.Code || '',
                        ItemName:part.Name ?? '',
                        Quantity:'1',
                        Note:'',
                        Max:null,
                        Issued:0,
                        Returned:0,
                        Cost:0
                    }
                ];
            }
        }

        setTimeout(() =>
        {
            this.partPick = null;
            this.cdr.detectChanges();
        });
    }

    removeLine(line: Line):
        void
    {
        this.lines = this.lines.filter(x => x.key !== line.key);
        this.cdr.detectChanges();
    }

    onLine(line: Line, field: 'Quantity' | 'Note', event: Event):
        void
    {
        line[field] = (event.target as HTMLInputElement).value;
        this.cdr.detectChanges();
    }


    //===========================================================
    // Save / post
    //===========================================================

    private sendLines(): PartsLine[] | null
    {
        const result: PartsLine[] = [];

        for (const x of this.lines)
        {
            const quantity = Number(x.Quantity) || 0;

            // a return : only the lines that come back
            if (this.kind === 'return' && quantity === 0)
            {
                continue;
            }

            if (quantity <= 0)
            {
                this.toast.error('Validation', `${x.ItemName} : the quantity must be more than 0.`);
                return null;
            }

            if (x.Max !== null && quantity > x.Max)
            {
                this.toast.error('Validation', `${x.ItemName} : not more than ${x.Max}.`);
                return null;
            }

            if (this.isShort(x))
            {
                this.toast.error('Validation', `${x.ItemName} : only ${this.stockOf(x)} in stock in this warehouse.`);
                return null;
            }

            result.push({
                LineId:0,
                SourceLineId:x.SourceLineId,
                ItemKind:x.ItemKind,
                ItemId:x.ItemId,
                ItemCode:x.ItemCode,
                ItemName:x.ItemName,
                Quantity:quantity,
                IssuedQuantity:0,
                ReturnedQuantity:0,
                Cost:0,
                Note:x.Note.trim()
            });
        }

        if (result.length === 0)
        {
            this.toast.error('Validation', this.kind === 'return' ? 'Give the quantity that comes back on one line at least.' : 'Put one part on the form at least.');
            return null;
        }

        return result;
    }

    onSave():
        void
    {
        if (this.isSaving || this.loading || !this.canEdit)
        {
            return;
        }

        if (!this.docDate)
        {
            this.toast.error('Validation', 'Choose the date.');
            return;
        }

        if (this.kind === 'issue' && !this.warehouseId)
        {
            this.toast.error('Validation', 'Choose the warehouse the parts go out of.');
            return;
        }

        if (this.kind === 'issue' && !this.requisitionPublicId && this.lookups && !this.lookups.IssueWithoutRequisition)
        {
            this.toast.error('Validation', 'Parts are issued against a requisition only : choose the requisition.');
            return;
        }

        const lines = this.sendLines();

        if (!lines)
        {
            return;
        }

        const send$: Observable<PartsDocument> =
            this.kind === 'requisition'
                ? this.ws.saveRequisition(
                    this.mode === 'edit' ? this.entityId : '',
                    { JobCardPublicId:this.jobCardPublicId, RequisitionDate:this.docDate, RequestedByEmployeeId:this.personId, Remarks:this.remarks.trim(), Lines:lines })
                : this.kind === 'issue'
                    ? this.ws.postPartsIssue(
                        { JobCardPublicId:this.jobCardPublicId, RequisitionPublicId:this.requisitionPublicId || null, WarehouseId:this.warehouseId ?? 0, IssueDate:this.docDate, WorkshopTechnicianId:this.personId, Remarks:this.remarks.trim(), Lines:lines })
                    : this.ws.postPartsReturn(
                        { IssuePublicId:this.issuePublicId, ReturnDate:this.docDate, Remarks:this.remarks.trim(), Lines:lines });

        const run =
            (): void =>
            {
                this.isSaving = true;

                this.progress.show(this.kind === 'requisition' ? (this.mode === 'edit' ? 'Updating' : 'Saving') : 'Posting', `Saving the ${this.words.one.toLowerCase()}...`);

                send$.subscribe(
                {
                    next:saved =>
                        // the bar fills, then the page carries on
                        this.progress.finish(() =>
                        {
                            this.isSaving = false;
                            this.toast.success('Success', `${saved.DocumentNo} was saved.`);

                            if (this.mode === 'add')
                            {
                                void this.router.navigate([this.kind === 'requisition' ? '../edit' : '../view', saved.PublicId], { relativeTo:this.route });
                                return;
                            }

                            this.fill(saved);
                            this.cdr.detectChanges();
                        }),
                    error:error =>
                    {
                        this.progress.fail();
                        this.isSaving = false;
                        this.failed(error, `The ${this.words.one.toLowerCase()} could not be saved.`);
                    }
                });
            };

        if (this.kind === 'issue')
        {
            this.confirmDialog.open(
                'Issue Parts',
                'Issue these parts to the job card? The stock goes out of the warehouse and the cost is posted to Workshop WIP at once. An issue cannot be changed : a wrong part is returned with a Parts Return.',
                run,
                'Issue',
                'Not yet',
                'primary');
        }
        else if (this.kind === 'return')
        {
            this.confirmDialog.open(
                'Return Parts',
                'Take these parts back into the store? The stock comes back to the warehouse of the issue and the cost leaves Workshop WIP at once.',
                run,
                'Return',
                'Not yet',
                'primary');
        }
        else
        {
            run();
        }
    }


    //===========================================================
    // A saved document : what can be done next
    //===========================================================

    // A requisition : Cancelled (nothing issued) / Closed (the rest
    // is not needed)
    changeStatus(status: string):
        void
    {
        if (!this.doc || this.isSaving)
        {
            return;
        }

        const no = this.doc.DocumentNo;

        this.confirmDialog.open(
            status === 'Cancelled' ? 'Cancel Requisition' : 'Close Requisition',
            status === 'Cancelled'
                ? `Cancel ${no}? Nothing was issued for it.`
                : `Close ${no}? The parts it still waits for are not needed any more.`,
            () =>
            {
                this.isSaving = true;

                this.ws.changeRequisitionStatus(this.doc!.PublicId, status).subscribe(
                {
                    next:doc =>
                    {
                        this.isSaving = false;
                        this.fill(doc);
                        this.toast.success('Status', `${no} is now ${doc.Status}.`);
                        this.cdr.detectChanges();
                    },
                    error:error =>
                    {
                        this.isSaving = false;
                        this.failed(error, 'The status could not be changed.');
                    }
                });
            },
            status,
            'Keep',
            'danger');
    }

    // A requisition still waiting : the issue form opens with it
    get canIssue(): boolean
    {
        return this.kind === 'requisition' && !!this.doc && (this.doc.Status === 'Open' || this.doc.Status === 'Partly Issued');
    }

    private other(page: string, queryParams: Record<string, string>):
        void
    {
        void this.router.navigate(
            [this.mode === 'add' ? `../../${page}/add` : `../../../${page}/add`],
            { relativeTo:this.route, queryParams });
    }

    issueParts():
        void
    {
        if (this.doc)
        {
            this.other('parts-issues', { requisition:this.doc.PublicId });
        }
    }

    returnParts():
        void
    {
        if (this.doc)
        {
            this.other('parts-returns', { issue:this.doc.PublicId });
        }
    }
}
