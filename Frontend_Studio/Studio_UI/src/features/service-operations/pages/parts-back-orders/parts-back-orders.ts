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

import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../shared/components/layout/page-canvas/page-canvas';
import { SearchBoxComponent } from '../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { ListTableColumn, ListTableComponent } from '../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../shared/components/controls/pagination/pagination';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';

import { WsService } from '../../shared/ws.service';

import
{
    wsDay
}
from '../../shared/ws.models';


//===============================================================
// Parts Back-Orders (Service Operations > Workshop Management)
//
// A list only, worked out when it is opened : the requisition lines
// still waiting that the service center has not enough stock for,
// oldest requisition first. Short : what must be bought or moved
// in. View opens the requisition.
//===============================================================

@Component(
{
    selector:'parts-back-orders',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageCanvasComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        ToastComponent
    ],

    templateUrl:'./parts-back-orders.html',

    styleUrl:'../parts-documents/parts-documents.css'
})

export class PartsBackOrdersPage
implements OnInit
{
    private readonly ws = inject(WsService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly toast = inject(ToastService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly destroyRef = inject(DestroyRef);

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

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Requisition', field:'RequisitionNo', width:'115px', align:'center' },
        { header:'Date', field:'DateText', width:'105px', align:'center' },
        { header:'Job Card', field:'JobCardNo', width:'105px', align:'center' },
        { header:'Customer', field:'CustomerName', width:'170px', align:'left' },
        { header:'Service Center', field:'BranchName', width:'150px', align:'left' },
        { header:'Part No', field:'ItemCode', width:'130px', align:'left' },
        { header:'Part', field:'ItemName', width:'200px', align:'left' },
        { header:'Waiting', field:'Waiting', width:'80px', align:'right' },
        { header:'In Stock', field:'Available', width:'80px', align:'right' },
        { header:'Short', field:'Short', width:'80px', align:'right' },
        { header:'Other Branches', field:'ElsewhereOnHand', width:'120px', align:'right' },
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

    ngOnInit():
        void
    {
        this.loadList();
    }

    loadList():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.ws
            .getPartsBackOrders()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all = (rows ?? []).map(x => ({ ...x, DateText:wsDay(x.RequisitionDate) }));
                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.toast.error('Error', error?.error?.message ?? 'The back-orders could not be loaded.');
                    this.cdr.detectChanges();
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
                !find
                || [x.RequisitionNo, x.JobCardNo, x.CustomerName, x.BranchName, x.ItemCode, x.ItemName]
                    .some(v => String(v ?? '').toLowerCase().includes(find)));

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

    // The requisition of the line opens
    view(row: any):
        void
    {
        void this.router.navigate(['../../parts-requisitions/view', row.RequisitionPublicId], { relativeTo:this.route });
    }
}
