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

import { PageHeaderComponent } from '../../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../../shared/components/layout/page-canvas/page-canvas';
import { ControlTabsComponent, ControlTab } from '../../../../../../shared/components/controls/control-tabs/control-tabs';
import { SearchBoxComponent } from '../../../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { ListTableComponent, ListTableColumn, ListTableRowAction, ListTableRowActionEvent } from '../../../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../../../shared/components/controls/pagination/pagination';
import { HistoryDrawerComponent } from '../../../../../../shared/components/utilities/history-drawer/history-drawer';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';

import
{
    BikeDeliveryDefaults,
    BikeDeliveryRow
}
from '../../../models/bike-deliveries.model';

import
{
    BikeDeliveriesService
}
from '../../../services/bike-deliveries.service';


type BikeDeliveryListRow =
    BikeDeliveryRow
    &
    {
        InvoiceText: string;
        CustomerText: string;
        BikeText: string;
        NumberText: string;
        DaysText: string;
        DeliveredText: string;
        IsDue: boolean;
        DueTitle: string;
    };

// dd-MM-yyyy
function shortDate(iso: string): string
{
    const p = String(iso ?? '').slice(0, 10).split('-');
    return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : '';
}


//===============================================================
// Bike Deliveries List (Sales Operations > Motor Bike Sales)
//
// Pending : sold bikes waiting; Deliver opens the PDI sheet +
// handover. Delivered / Undone : saved deliveries (View, PDI
// sheet and Delivery Challan prints).
//===============================================================

@Component(
{
    selector:'bike-deliveries-list',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        ControlTabsComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ToastComponent
    ],
    templateUrl:'./bike-deliveries-list.html',
    styleUrl:'./bike-deliveries-list.css'
})
export class BikeDeliveriesList
implements OnInit
{
    private readonly service = inject(BikeDeliveriesService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    defaults:
        BikeDeliveryDefaults =
        { DeliveryWithoutPdi:false, DeliveryOnSale:false, CanDeliver:false, CanUndo:false, Today:'' };

    tabs:
        ControlTab[] = this.buildTabs(0, 0, 0);

    selectedTab =
        'Pending';

    searchText =
        '';

    loading =
        false;

    loadFailed =
        false;

    private all:
        BikeDeliveryListRow[] = [];

    rows:
        BikeDeliveryListRow[] = [];

    totalRecords =
        0;

    currentPage =
        1;

    pageSize =
        10;

    private searchTimer?:
        number;

    historyOpened =
        false;

    historyTitle =
        'Bike Delivery History';

    historyItems:
        any[] = [];

    readonly canvasConfig:
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

    columns:
        ListTableColumn[] = this.buildColumns('Engine / Motor No');

    readonly listActions =
        { view:false, edit:false, delete:false };

    readonly rowActions:
        ListTableRowAction[] =
    [
        {
            key:'deliver',
            icon:'fas fa-truck-ramp-box',
            title:'Deliver : PDI sheet + handover',
            tone:'success',
            visible:(row: BikeDeliveryListRow) => row.Status === 'Pending' && this.defaults.CanDeliver
        },
        {
            key:'view',
            icon:'fas fa-eye',
            title:'View the delivery',
            tone:'default',
            visible:(row: BikeDeliveryListRow) => row.Status !== 'Pending'
        },
        {
            key:'pdi',
            icon:'fas fa-clipboard-check',
            title:'Print the PDI sheet',
            tone:'primary',
            visible:(row: BikeDeliveryListRow) => row.Status !== 'Pending' && row.HasPdi
        },
        {
            key:'challan',
            icon:'fas fa-print',
            title:'Print the Delivery Challan / Gate Pass',
            tone:'primary',
            visible:(row: BikeDeliveryListRow) => row.Status !== 'Pending'
        }
    ];

    private buildTabs(pending: number, delivered: number, undone: number):
        ControlTab[]
    {
        return [
            { id:'Pending', label:`Pending (${pending})` },
            { id:'Delivered', label:`Delivered (${delivered})` },
            { id:'Undone', label:`Undone (${undone})` },
            { id:'All', label:'All' }
        ];
    }

    private buildColumns(numberHeader: string):
        ListTableColumn[]
    {
        return [
            { header:'#', field:'serial', type:'serial', width:'46px', align:'center' },
            { header:'Invoice', field:'InvoiceText', width:'190px', align:'left' },
            { header:'Customer', field:'CustomerText', width:'230px', align:'left' },
            { header:'Bike', field:'BikeText', width:'230px', align:'left' },
            { header:'Chassis No', field:'ChassisNo', width:'170px', align:'center' },
            { header:numberHeader, field:'NumberText', width:'190px', align:'center' },
            { header:'Waited', field:'DaysText', width:'80px', align:'center' },
            { header:'Delivered', field:'DeliveredText', width:'180px', align:'center', flagField:'IsDue', flagText:'Due', flagTitleField:'DueTitle', priority:2 },
            { header:'Status', field:'Status', type:'status', width:'110px', align:'center' },
            { header:'Actions', field:'actions', type:'actions', width:'140px', align:'center' }
        ];
    }

    ngOnInit():
        void
    {
        this.service
            .getDefaults()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:d =>
                {
                    this.defaults = d;
                    this.apply();
                },
                error:() => {}
            });

        this.load();
    }

    private load():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.service
            .getList('All', this.searchText.trim())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:data =>
                {
                    this.tabs = this.buildTabs(data.Pending, data.Delivered, data.Undone);

                    this.all =
                        data.Rows.map(x => ({
                            ...x,
                            InvoiceText:`${x.SalesInvoiceNo} · ${shortDate(x.InvoiceDate)}`,
                            CustomerText:x.CustomerPhone ? `${x.CustomerName} - ${x.CustomerPhone}` : x.CustomerName,
                            BikeText:[x.ModelName || x.ProductName, x.ColorName].filter(v => !!v).join(' · '),
                            NumberText:x.EngineNo,
                            DaysText:`${x.DaysWaiting} day${x.DaysWaiting === 1 ? '' : 's'}`,
                            DeliveredText:x.DeliveryNo ? `${x.DeliveryNo} · ${shortDate(x.DeliveryDate)}` : '-',
                            IsDue:x.DueAmount > 0,
                            DueTitle:x.DueAmount > 0 ? `Invoice balance Tk ${x.DueAmount.toFixed(2)} (${x.PaymentTerm || 'Credit'})` : ''
                        }));

                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.toast.error('Error', error?.error?.message ?? 'Bike deliveries could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    private apply():
        void
    {
        const matched =
            this.selectedTab === 'All'
                ? this.all
                : this.all.filter(x => x.Status === this.selectedTab);

        // Mixed list : Engine / Motor No; all one kind : its word
        const electric =
            matched.filter(x => x.IsElectric).length;

        this.columns =
            this.buildColumns(
                matched.length > 0 && electric === matched.length
                    ? 'Motor No'
                    : electric === 0 && matched.length > 0
                        ? 'Engine No'
                        : 'Engine / Motor No');

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

    onTabChange(tab: string):
        void
    {
        this.selectedTab = tab;
        this.currentPage = 1;
        this.apply();
    }

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';

        window.clearTimeout(this.searchTimer);

        this.searchTimer =
            window.setTimeout(() =>
            {
                this.currentPage = 1;
                this.load();
            }, 350);
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

    refresh():
        void
    {
        this.load();
    }

    onRowAction(event: ListTableRowActionEvent):
        void
    {
        const row =
            event.row as BikeDeliveryListRow;

        switch (event.key)
        {
            case 'deliver':
                void this.router.navigate(['../deliver', row.SalesInvoiceLineId], { relativeTo:this.route });
                break;

            case 'view':
                void this.router.navigate(['../view', row.DeliveryPublicId], { relativeTo:this.route });
                break;

            case 'pdi':
                this.openPrint(row.DeliveryPublicId, 'pdi-sheet');
                break;

            case 'challan':
                this.openPrint(row.DeliveryPublicId, 'delivery-challan');
                break;
        }
    }

    private openPrint(id: string, doc: string):
        void
    {
        if (!id)
        {
            return;
        }

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(['/print-viewer', 'bike-deliveries', id], { queryParams:{ doc } }));

        // Not "noopener" : the new tab keeps this session's login
        if (!window.open(url, '_blank'))
        {
            this.toast.warning('Print', 'The print tab was blocked by the browser. Allow pop-ups for this site and try again.');
        }
    }

    openHistory():
        void
    {
        this.service
            .getHistory()
            .subscribe(
            {
                next:items =>
                {
                    this.historyItems =
                        (Array.isArray(items) ? items : []).map(h => ({
                            title:h.ActivityTitle ?? h.activityTitle,
                            description:h.ActivityDescription ?? h.activityDescription,
                            user:h.PerformedByName ?? h.performedByName ?? 'System',
                            dateTime:new Date(h.PerformedDate ?? h.performedDate).toLocaleString(),
                            badge:h.ActivityType ?? h.activityType
                        }));
                    this.historyOpened = true;
                    this.cdr.detectChanges();
                },
                error:() =>
                    this.toast.error('Error', 'The history could not be loaded.')
            });
    }

    closeHistory():
        void
    {
        this.historyOpened = false;
        this.cdr.detectChanges();
    }
}
