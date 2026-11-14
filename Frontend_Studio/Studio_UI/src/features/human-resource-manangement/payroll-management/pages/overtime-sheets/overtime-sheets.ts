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

import { PageHeaderComponent } from '../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../shared/components/layout/page-canvas/page-canvas';
import { SearchDropdownComponent } from '../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { SearchBoxComponent } from '../../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../../shared/components/utilities/command-center/command-center';
import { ListTableActions, ListTableColumn, ListTableComponent, ListTableRowAction, ListTableRowActionEvent } from '../../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../../shared/components/controls/pagination/pagination';
import { ToastComponent } from '../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../shared/components/utilities/toast/toast.service';

import
{
    OvertimeSheet,
    OvertimeSheetLine,
    OvertimeSheetListItem,
    payDayText,
    payMoney,
    payMonthText,
    payQuantity
}
from '../../models/payroll.model';

import
{
    PayrollService
}
from '../../services/payroll.service';

import
{
    HR_REPORT_PRINT_KEY,
    openHrPrint,
    saveHrReport
}
from '../../../print/hr-print';


type SheetRow =
    OvertimeSheetListItem
    &
    {
        MonthText: string;
        HoursText: string;
        DaysText: string;
        AmountText: string;
        PostedText: string;
    };


//===============================================================
// Overtime Sheets (Human Resource > Payroll Management)
//
// The overtime of every POSTED salary sheet : one sheet a branch
// a month (OTS-0001 for SAL-0001). There is no Add : a sheet is
// there when its salary sheet is posted and goes when that is
// unposted.
//
//   list       the sheets : month and branch filters, view, print
//   view/:id   one sheet : the employees with overtime
//===============================================================

@Component(
{
    selector:'overtime-sheets',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        SearchDropdownComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        ToastComponent
    ],
    templateUrl:'./overtime-sheets.html',
    styleUrl:'./overtime-sheets.css'
})
export class OvertimeSheetsPage
implements OnInit
{
    private readonly service = inject(PayrollService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    // '' : the list; otherwise the sheet that is open
    sheetId =
        '';

    loading =
        false;

    loadFailed =
        false;

    searchText =
        '';

    currentPage =
        1;

    pageSize =
        10;

    totalRecords =
        0;

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

    //===========================================================
    // The list
    //===========================================================

    private all:
        SheetRow[] = [];

    rows:
        SheetRow[] = [];

    branchItems:
        { label: string; value: number }[] =
    [
        { label:'All Branches', value:0 }
    ];

    selectedBranch =
        0;

    yearItems:
        { label: string; value: number }[] =
    [
        { label:'All Years', value:0 }
    ];

    selectedYear =
        0;

    summaryItems:
        { label: string; value: string }[] = [];

    // View and Print only : nothing is added, edited or deleted here
    readonly actions:
        ListTableActions =
    {
        view:true,
        edit:false,
        delete:false
    };

    readonly rowActions:
        ListTableRowAction[] =
    [
        { key:'print', icon:'fas fa-print', title:'Print the overtime sheet', tone:'primary' }
    ];

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Code', field:'Code', width:'100px', align:'center' },
        { header:'Month', field:'MonthText', width:'150px', align:'left' },
        { header:'Branch', field:'BranchName', width:'190px', align:'left' },
        { header:'Employees', field:'EmployeeCount', width:'95px', align:'center' },
        { header:'OT Hours', field:'HoursText', width:'100px', align:'right' },
        { header:'OT Days', field:'DaysText', width:'90px', align:'right' },
        { header:'Amount', field:'AmountText', width:'135px', align:'right' },
        { header:'Salary Sheet', field:'SalarySheetCode', width:'115px', align:'center' },
        { header:'Posted', field:'PostedText', width:'115px', align:'center' },
        { header:'Journal', field:'JournalVoucherNo', width:'130px', align:'center' },
        { header:'Actions', field:'actions', type:'actions', width:'110px', align:'center' }
    ];

    //===========================================================
    // The sheet that is open
    //===========================================================

    sheet:
        OvertimeSheet | null = null;

    get lines(): OvertimeSheetLine[]
    {
        const find =
            this.searchText.trim().toLowerCase();

        return (this.sheet?.Lines ?? []).filter(x =>
            !find
            || [x.EmployeeCode, x.EmployeeName, x.DesignationName, x.DepartmentName]
                .some(v => (v ?? '').toLowerCase().includes(find)));
    }

    // The first row of the page (0 based) : the # column goes on
    // from it
    get pageStart(): number
    {
        const pages =
            Math.max(1, Math.ceil(this.lines.length / this.pageSize));

        return (Math.min(this.currentPage, pages) - 1) * this.pageSize;
    }

    get pagedLines(): OvertimeSheetLine[]
    {
        return this.lines.slice(this.pageStart, this.pageStart + this.pageSize);
    }

    get title(): string
    {
        return this.sheet ? `Overtime Sheet` : 'Overtime Sheet';
    }

    get subtitle(): string
    {
        return this.sheet
            ? `${payMonthText(this.sheet.Year, this.sheet.Month)} · ${this.sheet.BranchName}`
            : '';
    }

    money(value: number): string
    {
        return payMoney(value);
    }

    quantity(value: number): string
    {
        return payQuantity(value);
    }

    total(field: 'OvertimeHours' | 'OvertimeDays' | 'Amount'): number
    {
        return this.lines.reduce((sum, x) => sum + x[field], 0);
    }

    //===========================================================
    // Load
    //===========================================================

    ngOnInit():
        void
    {
        this.route.paramMap
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(params =>
            {
                this.sheetId = params.get('id') ?? '';
                this.searchText = '';
                this.currentPage = 1;
                this.load();
            });
    }

    load():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        if (this.sheetId)
        {
            this.service
                .getOvertimeSheet(this.sheetId)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(
                {
                    next:sheet =>
                    {
                        this.sheet = sheet;
                        this.loading = false;
                        this.cdr.detectChanges();
                    },
                    error:error => this.failed(error, 'The overtime sheet could not be loaded.')
                });

            return;
        }

        this.sheet = null;

        this.service
            .getOvertimeSheets()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all =
                        rows.map(x => ({
                            ...x,
                            MonthText:payMonthText(x.Year, x.Month),
                            HoursText:payQuantity(x.OvertimeHours),
                            DaysText:payQuantity(x.OvertimeDays),
                            AmountText:payMoney(x.Amount),
                            PostedText:payDayText(x.PostedDate)
                        }));

                    this.branchItems =
                    [
                        { label:'All Branches', value:0 },
                        ...[...new Map(this.all.map(x => [x.BranchId, x.BranchName])).entries()]
                            .map(([value, label]) => ({ label:label || `#${value}`, value }))
                            .sort((a, b) => a.label.localeCompare(b.label))
                    ];

                    this.yearItems =
                    [
                        { label:'All Years', value:0 },
                        ...[...new Set(this.all.map(x => x.Year))]
                            .sort((a, b) => b - a)
                            .map(value => ({ label:String(value), value }))
                    ];

                    if (!this.branchItems.some(x => x.value === this.selectedBranch))
                    {
                        this.selectedBranch = 0;
                    }

                    if (!this.yearItems.some(x => x.value === this.selectedYear))
                    {
                        this.selectedYear = 0;
                    }

                    this.loading = false;
                    this.apply();
                },
                error:error => this.failed(error, 'Overtime sheets could not be loaded.')
            });
    }

    private failed(error: any, fallback: string):
        void
    {
        this.loading = false;
        this.loadFailed = true;
        this.toast.error('Error', error?.error?.message ?? fallback);
        this.cdr.detectChanges();
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const matched =
            this.all.filter(x =>
                (!this.selectedBranch || x.BranchId === this.selectedBranch)
                &&
                (!this.selectedYear || x.Year === this.selectedYear)
                &&
                (!find || [x.Code, x.MonthText, x.BranchName, x.SalarySheetCode, x.JournalVoucherNo]
                    .some(v => (v ?? '').toLowerCase().includes(find))));

        this.totalRecords = matched.length;

        const pages = Math.max(1, Math.ceil(matched.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        const start = (this.currentPage - 1) * this.pageSize;

        this.rows = matched.slice(start, start + this.pageSize);

        this.summaryItems =
        [
            { label:'Sheets', value:matched.length.toLocaleString('en-US') },
            { label:'OT Hours', value:payQuantity(matched.reduce((sum, x) => sum + x.OvertimeHours, 0)) || '0' },
            { label:'OT Days', value:payQuantity(matched.reduce((sum, x) => sum + x.OvertimeDays, 0)) || '0' },
            { label:'Overtime', value:`Tk ${payMoney(matched.reduce((sum, x) => sum + x.Amount, 0))}` }
        ];

        this.cdr.detectChanges();
    }

    //===========================================================
    // Toolbar
    //===========================================================

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
        this.currentPage = 1;

        if (this.sheetId)
        {
            this.cdr.detectChanges();
            return;
        }

        this.apply();
    }

    onBranchChange(value: any):
        void
    {
        this.selectedBranch = Number(value) || 0;
        this.currentPage = 1;
        this.apply();
    }

    onYearChange(value: any):
        void
    {
        this.selectedYear = Number(value) || 0;
        this.currentPage = 1;
        this.apply();
    }

    onPageChange(page: number):
        void
    {
        this.currentPage = page;

        if (this.sheetId)
        {
            this.cdr.detectChanges();
            return;
        }

        this.apply();
    }

    onPageSizeChange(size: number):
        void
    {
        this.pageSize = size;
        this.currentPage = 1;

        if (this.sheetId)
        {
            this.cdr.detectChanges();
            return;
        }

        this.apply();
    }

    onSort(_event: any):
        void
    {
        // Newest month first
    }

    //===========================================================
    // Open / Back / Print
    //===========================================================

    open(row: SheetRow):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    back():
        void
    {
        void this.router.navigate(['../../list'], { relativeTo:this.route });
    }

    onRowAction(event: ListTableRowActionEvent):
        void
    {
        if (event.key === 'print')
        {
            this.service
                .getOvertimeSheet((event.row as SheetRow).PublicId)
                .subscribe(
                {
                    next:sheet => this.print(sheet, sheet.Lines),
                    error:error => this.toast.error('Error', error?.error?.message ?? 'The overtime sheet could not be loaded.')
                });
        }
    }

    printOpen():
        void
    {
        if (this.sheet)
        {
            this.print(this.sheet, this.lines);
        }
    }

    // The Print Engine viewer (company header, PDF, Excel)
    private print(sheet: OvertimeSheet, lines: OvertimeSheetLine[]):
        void
    {
        if (lines.length === 0)
        {
            this.toast.info('Overtime Sheet', 'There is nothing to print.');
            return;
        }

        const sum =
            (field: 'OvertimeHours' | 'OvertimeDays' | 'Amount'): number =>
                lines.reduce((total, x) => total + x[field], 0);

        const token =
            saveHrReport(
            {
                title:'Overtime Sheet',
                subtitle:`${payMonthText(sheet.Year, sheet.Month)} · ${sheet.BranchName}`,
                meta:
                [
                    { label:'Sheet', value:sheet.Code },
                    { label:'Salary Sheet', value:sheet.SalarySheetCode },
                    { label:'Posted', value:payDayText(sheet.PostedDate) },
                    { label:'Journal Voucher', value:sheet.JournalVoucherNo }
                ],
                band:
                [
                    { label:'Employees', value:String(lines.length) },
                    { label:'OT Hours', value:payQuantity(sum('OvertimeHours')) || '0' },
                    { label:'OT Days', value:payQuantity(sum('OvertimeDays')) || '0' },
                    { label:'Overtime', value:`Tk ${payMoney(sum('Amount'))}` }
                ],
                columns:
                [
                    { header:'Code', kind:'text' },
                    { header:'Employee', kind:'text' },
                    { header:'Designation', kind:'text' },
                    { header:'Department', kind:'text' },
                    { header:'Basic', kind:'money' },
                    { header:'Gross', kind:'money' },
                    { header:'OT Hours', kind:'num' },
                    { header:'OT Days', kind:'num' },
                    { header:'Amount', kind:'money', strong:true },
                    { header:'Signature', kind:'text' }
                ],
                rows:lines.map((x, i) =>
                [
                    x.EmployeeCode,
                    x.EmployeeName,
                    x.DesignationName,
                    x.DepartmentName,
                    payMoney(x.BasicSalary),
                    payMoney(x.GrossSalary),
                    payQuantity(x.OvertimeHours),
                    payQuantity(x.OvertimeDays),
                    payMoney(x.Amount),
                    ''
                ]),
                footer:
                [
                    '',
                    `Total (${lines.length})`,
                    '',
                    '',
                    '',
                    '',
                    payQuantity(sum('OvertimeHours')),
                    payQuantity(sum('OvertimeDays')),
                    payMoney(sum('Amount')),
                    ''
                ],
                note:'The overtime is part of the salary sheet of the month : it is paid with the salary.',
                landscape:true
            });

        const problem =
            openHrPrint(this.router, HR_REPORT_PRINT_KEY, token, `${sheet.Code} ${payMonthText(sheet.Year, sheet.Month)}`, true);

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }
}
