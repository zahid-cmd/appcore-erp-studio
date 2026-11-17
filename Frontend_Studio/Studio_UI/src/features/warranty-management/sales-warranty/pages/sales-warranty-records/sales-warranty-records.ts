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
    HttpClient
}
from '@angular/common/http';

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
    environment
}
from '../../../../../environments/environment';

import { PageHeaderComponent } from '../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { ControlTab, ControlTabsComponent } from '../../../../../shared/components/controls/control-tabs/control-tabs';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../shared/components/layout/page-canvas/page-canvas';
import { TextboxComponent } from '../../../../../shared/components/controls/textbox/textbox';
import { SearchBoxComponent } from '../../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../../shared/components/utilities/command-center/command-center';
import { ListTableColumn, ListTableComponent } from '../../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../../shared/components/controls/pagination/pagination';
import { ToastComponent } from '../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../shared/components/utilities/toast/toast.service';

import { wsDay } from '../../../../service-operations/shared/ws.models';


//===============================================================
// Model (the API answers in camelCase)
//===============================================================

type Mode =
    'list' | 'view';

interface WarrantyPart
{
    partName: string;
    expiryDate: string;
    kmLimit: number | null;
    notes: string;
    state: string;
}

interface WarrantyRecord
{
    id: number;
    publicId: string;
    code: string;
    branchName: string;
    salesInvoiceNo: string;
    customerName: string;
    customerPhone: string;
    productName: string;
    chassisNo: string;
    engineNo: string;
    policyCode: string;
    policyName: string;
    startDate: string;
    expiryDate: string;
    kmLimit: number | null;
    status: string;
    state: string;
    daysLeft: number | null;
    voidReason: string;
    parts: WarrantyPart[];
}

function stateColor(state: string): string
{
    switch (state)
    {
        case 'In Warranty':
        case 'Covered':
            return '#16a34a';

        case 'Expiring':
            return '#d97706';

        case 'Claimed':
            return '#2563eb';

        case 'Void':
            return '#64748b';

        default:
            return '#dc2626';
    }
}


//===============================================================
// Sales Warranty Records (Warranty Management > Sales Warranty)
//
// One record per delivered bike, made by the delivery : the policy
// of the day, its end date and km limit, and its part coverages.
// Read-only : the page shows which bikes are under warranty.
//===============================================================

@Component(
{
    selector:'sales-warranty-records',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        ControlTabsComponent,
        TextboxComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        ToastComponent
    ],

    templateUrl:'./sales-warranty-records.html',

    styleUrl:'./sales-warranty-records.css'
})

export class SalesWarrantyRecordsPage
implements OnInit
{
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly toast = inject(ToastService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly destroyRef = inject(DestroyRef);

    private readonly api =
        `${environment.apiUrl}/warranty-management/sales-warranty/sales-warranty-records`;

    readonly day = wsDay;
    readonly color = stateColor;

    mode:
        Mode = 'list';

    loading =
        false;

    loadFailed =
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
        { id:'In Warranty', label:'In Warranty' },
        { id:'Expiring', label:'Expiring (30 days)' },
        { id:'Expired', label:'Expired' },
        { id:'Claimed', label:'Claimed' },
        { id:'Void', label:'Void' }
    ];

    selectedTab =
        'all';

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Record', field:'code', width:'110px', align:'center' },
        { header:'Customer', field:'customerName', width:'180px', align:'left' },
        { header:'Mobile', field:'customerPhone', width:'115px', align:'left' },
        { header:'Bike', field:'productName', width:'200px', align:'left' },
        { header:'Chassis No', field:'chassisNo', width:'170px', align:'left' },
        { header:'Invoice', field:'salesInvoiceNo', width:'180px', align:'center' },
        { header:'Policy', field:'policyName', width:'180px', align:'left' },
        { header:'From', field:'startText', width:'100px', align:'center' },
        { header:'Until', field:'expiryText', width:'100px', align:'center' },
        { header:'Km Limit', field:'kmText', width:'90px', align:'right' },
        { header:'Days Left', field:'daysText', width:'90px', align:'right' },
        { header:'State', field:'state', width:'120px', align:'left', dotField:'stateColor' },
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

    doc:
        WarrantyRecord | null = null;

    ngOnInit():
        void
    {
        this.mode =
            this.router.url.toLowerCase().includes('/view/') ? 'view' : 'list';

        if (this.mode === 'list')
        {
            this.loadList();
        }
        else
        {
            this.loadRecord(this.route.snapshot.paramMap.get('id') ?? '');
        }
    }

    private failed(error: any, fallback: string):
        void
    {
        this.toast.error('Error', error?.error?.message ?? fallback);
        this.cdr.detectChanges();
    }

    loadList():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.http
            .get<WarrantyRecord[]>(this.api)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:records =>
                {
                    this.all =
                        (records ?? []).map(x => ({
                            ...x,
                            startText:wsDay(x.startDate),
                            expiryText:x.expiryDate ? wsDay(x.expiryDate) : 'No end',
                            kmText:x.kmLimit ? String(x.kmLimit) : '',
                            daysText:x.daysLeft === null || x.state === 'Void' ? '' : (x.daysLeft < 0 ? 'Over' : String(x.daysLeft)),
                            stateColor:stateColor(x.state)
                        }));

                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.failed(error, 'Warranty records could not be loaded.');
                }
            });
    }

    private loadRecord(publicId: string):
        void
    {
        this.loading = true;
        this.cdr.detectChanges();

        this.http
            .get<WarrantyRecord>(`${this.api}/${publicId}`)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:record =>
                {
                    this.loading = false;
                    this.doc = record;
                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.loading = false;
                    this.failed(error, 'The warranty record could not be loaded.');
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
                (this.selectedTab === 'all' || x.state === this.selectedTab)
                && (!find
                    || [x.code, x.customerName, x.customerPhone, x.productName, x.chassisNo, x.engineNo, x.salesInvoiceNo, x.policyName, x.state]
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

    view(row: any):
        void
    {
        void this.router.navigate(['../view', row.publicId], { relativeTo:this.route });
    }

    goToList():
        void
    {
        void this.router.navigate(['../../list'], { relativeTo:this.route });
    }
}
