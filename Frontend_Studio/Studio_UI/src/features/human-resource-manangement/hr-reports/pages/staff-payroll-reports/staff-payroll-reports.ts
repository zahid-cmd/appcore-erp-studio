//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    ChangeDetectorRef,
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
    Observable,
    map
}
from 'rxjs';

import { PageHeaderComponent } from '../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent } from '../../../../../shared/components/layout/page-canvas/page-canvas';
import { EmptyStateComponent } from '../../../../../shared/components/layout/empty-state/empty-state';
import { ControlTab, ControlTabsComponent } from '../../../../../shared/components/controls/control-tabs/control-tabs';
import { SearchDropdownComponent } from '../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { PaginationComponent } from '../../../../../shared/components/controls/pagination/pagination';
import { SearchBoxComponent } from '../../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../../shared/components/utilities/command-center/command-center';
import { ToastComponent } from '../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../shared/components/utilities/toast/toast.service';

import
{
    HrReportsService,
    LeaveBalanceReport,
    SalaryRegisterReport,
    StaffListRow
}
from '../../services/hr-reports.service';


import
{
    HR_REPORT_PRINT_KEY,
    openHrPrint,
    saveHrReport
}
from '../../../print/hr-print';

import
{
    Router
}
from '@angular/router';


type ReportKey =
    'staff' | 'leave' | 'salary';

type Cell =
    string | number;

interface GridColumn
{
    header: string;
    // text (left), center, days (number, right), money (2 decimals, right)
    kind: 'text' | 'center' | 'days' | 'money';
    title?: string;
    // A total column : shown strong
    strong?: boolean;
}

// A report as a plain grid : the screen, Excel and print all
// work from it
interface Grid
{
    title: string;
    subtitle: string;
    columns: GridColumn[];
    rows: Cell[][];
    // Totals under the rows (null = none)
    footer: Cell[] | null;
}

const MONTHS =
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// yyyy-MM-dd -> 13 Nov 2026
function dayText(value: string): string
{
    const m =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

    return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : '';
}

// Whole years and months between a date and today : "2 y 4 m"
function serviceText(joining: string): string
{
    const m =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(joining ?? '');

    if (!m)
    {
        return '';
    }

    const now = new Date();

    let months =
        (now.getFullYear() - Number(m[1])) * 12 + (now.getMonth() + 1 - Number(m[2]));

    if (now.getDate() < Number(m[3]))
    {
        months--;
    }

    if (months < 0)
    {
        return '';
    }

    return months < 12 ? `${months} m` : `${Math.floor(months / 12)} y ${months % 12} m`;
}


//===============================================================
// Staff & Payroll Reports (Human Resource > HR Reports)
//
// Three read-only reports on one page, each with its filters on
// the toolbar right : Staff List, Leave Balance, Salary Register.
// Excel and Print work from what is on screen (the search too).
// Summary line below the canvas.
//===============================================================

@Component(
{
    selector:'staff-payroll-reports',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        EmptyStateComponent,
        ControlTabsComponent,
        SearchDropdownComponent,
        PaginationComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ToastComponent
    ],
    templateUrl:'./staff-payroll-reports.html',
    styleUrl:'./staff-payroll-reports.css'
})
export class StaffPayrollReports
implements OnInit
{
    private readonly service = inject(HrReportsService);

    private readonly toast = inject(ToastService);

    private readonly router = inject(Router);

    private readonly cdr = inject(ChangeDetectorRef);

    readonly tabs:
        ControlTab[] =
    [
        { id:'staff', label:'Staff List' },
        { id:'leave', label:'Leave Balance' },
        { id:'salary', label:'Salary Register' }
    ];

    readonly statusItems =
    [
        { label:'Active', value:'active' },
        { label:'Inactive', value:'inactive' },
        { label:'All Employees', value:'all' }
    ];

    readonly sheetItems =
    [
        { label:'All Sheets', value:'all' },
        { label:'Posted Only', value:'posted' }
    ];

    report:
        ReportKey =
        'staff';

    branchItems:
        { label: string; value: number }[] =
    [
        { label:'All Branches', value:0 }
    ];

    departmentItems:
        { label: string; value: number }[] =
    [
        { label:'All Departments', value:0 }
    ];

    yearItems:
        { label: string; value: number }[] =
    [
        { label:String(new Date().getFullYear()), value:new Date().getFullYear() }
    ];

    branchId =
        0;

    departmentId =
        0;

    status =
        'active';

    year =
        new Date().getFullYear();

    sheets =
        'all';

    searchText =
        '';

    loading =
        false;

    loadFailed =
        false;

    grid:
        Grid | null = null;

    summaryItems:
        { label: string; value: string }[] = [];

    // Guards against an older answer arriving after a newer one
    private loadNo =
        0;

    get branchName(): string
    {
        return this.branchItems.find(x => x.value === this.branchId)?.label ?? 'All Branches';
    }

    // The rows the search leaves
    get visibleRows(): Cell[][]
    {
        const find =
            this.searchText.trim().toLowerCase();

        const rows =
            this.grid?.rows ?? [];

        return !find
            ? rows
            : rows.filter(r => r.some(c => typeof c === 'string' && c.toLowerCase().includes(find)));
    }

    //===========================================================
    // Paging : the screen shows a page of the rows the search
    // leaves (Excel and print keep every row)
    //===========================================================

    page =
        1;

    pageSize =
        10;

    get totalRecords(): number
    {
        return this.visibleRows.length;
    }

    // The first row of the page (0 based) : the # column goes on
    // from it
    get pageStart(): number
    {
        const pages =
            Math.max(1, Math.ceil(this.totalRecords / this.pageSize));

        return (Math.min(this.page, pages) - 1) * this.pageSize;
    }

    get pageRows(): Cell[][]
    {
        return this.visibleRows.slice(this.pageStart, this.pageStart + this.pageSize);
    }

    onPage(page: number):
        void
    {
        this.page = page;
        this.cdr.detectChanges();
    }

    onPageSize(size: number):
        void
    {
        this.pageSize = size;
        this.page = 1;
        this.cdr.detectChanges();
    }

    // The centred state shown instead of the report : loading,
    // failed, nothing for the filters, or nothing found by the
    // search
    get emptyState(): { icon: string; title: string; subtitle: string } | null
    {
        if (this.loading)
        {
            return this.grid
                ? null
                : { icon:'fas fa-spinner fa-spin', title:'Loading', subtitle:'Loading the report...' };
        }

        if (this.visibleRows.length > 0)
        {
            return null;
        }

        if (this.loadFailed)
        {
            return { icon:'fas fa-triangle-exclamation', title:'Unable to Load Data', subtitle:'An error occurred while loading the report. Press Refresh to try again.' };
        }

        if ((this.grid?.rows.length ?? 0) > 0)
        {
            return { icon:'fas fa-magnifying-glass', title:'Nothing Found', subtitle:'Nothing on the report matches the search.' };
        }

        return {
            icon:'fas fa-file-circle-question',
            title:'No Records Found',
            subtitle:
                this.report === 'staff' ? 'No employee matches these filters.'
                : this.report === 'leave' ? 'There are no active employees for this branch.'
                : `There are no salary sheets for ${this.year} with these filters.`
        };
    }

    // A cell as shown
    show(cell: Cell, column: GridColumn): string
    {
        if (typeof cell !== 'number')
        {
            return cell;
        }

        if (column.kind === 'money')
        {
            return cell ? cell.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }) : '';
        }

        return cell.toLocaleString('en-US', { maximumFractionDigits:2 });
    }

    ngOnInit():
        void
    {
        this.service
            .getLookups()
            .subscribe(
            {
                next:d =>
                {
                    this.branchItems =
                    [
                        { label:'All Branches', value:0 },
                        ...d.Branches.map(b => ({ label:b.Name, value:b.Id }))
                    ];

                    this.departmentItems =
                    [
                        { label:'All Departments', value:0 },
                        ...d.Departments.map(x => ({ label:x.Name, value:x.Id }))
                    ];

                    if (d.Years.length > 0)
                    {
                        this.yearItems = d.Years.map(y => ({ label:String(y), value:y }));
                    }

                    this.cdr.detectChanges();
                },
                error:() =>
                {
                    // the reports still work for every branch
                }
            });

        this.load();
    }

    //===========================================================
    // Filters
    //===========================================================

    onTabChange(value: string):
        void
    {
        this.report = (value as ReportKey) || 'staff';
        this.searchText = '';
        this.load();
    }

    onBranch(value: any):
        void
    {
        this.branchId = Number(value) || 0;
        this.load();
    }

    onDepartment(value: any):
        void
    {
        this.departmentId = Number(value) || 0;
        this.load();
    }

    onStatus(value: any):
        void
    {
        this.status = String(value ?? '') || 'active';
        this.load();
    }

    onYear(value: any):
        void
    {
        this.year = Number(value) || new Date().getFullYear();
        this.load();
    }

    onSheets(value: any):
        void
    {
        this.sheets = String(value ?? '') || 'all';
        this.load();
    }

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
        this.page = 1;
        this.cdr.detectChanges();
    }

    refresh():
        void
    {
        this.load();
    }

    //===========================================================
    // Load
    //===========================================================

    private load():
        void
    {
        const no =
            ++this.loadNo;

        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        const call:
            Observable<Grid> =
            this.report === 'staff'
                ? this.service.getStaffList(this.branchId, this.departmentId, this.status).pipe(map(rows => this.staffGrid(rows)))
                : this.report === 'leave'
                    ? this.service.getLeaveBalance(this.year, this.branchId).pipe(map(r => this.leaveGrid(r)))
                    : this.service.getSalaryRegister(this.year, this.branchId, this.sheets === 'posted').pipe(map(r => this.salaryGrid(r)));

        call.subscribe(
        {
            next:grid =>
            {
                if (no !== this.loadNo)
                {
                    return;
                }

                this.grid = grid;
                this.page = 1;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error:error =>
            {
                if (no !== this.loadNo)
                {
                    return;
                }

                this.grid = null;
                this.summaryItems = [];
                this.loading = false;
                this.loadFailed = true;
                this.toast.error('Error', error?.error?.message ?? 'The report could not be loaded.');
                this.cdr.detectChanges();
            }
        });
    }

    private money(value: number): string
    {
        return value.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
    }

    //===========================================================
    // The three reports as grids
    //===========================================================

    private staffGrid(rows: StaffListRow[]): Grid
    {
        const department =
            this.departmentItems.find(x => x.value === this.departmentId)?.label ?? 'All Departments';

        const statusName =
            this.statusItems.find(x => x.value === this.status)?.label ?? '';

        const active =
            rows.filter(x => x.IsActive);

        const gross =
            rows.reduce((sum, x) => sum + x.GrossSalary, 0);

        this.summaryItems =
        [
            { label:'Employees', value:rows.length.toLocaleString('en-US') },
            { label:'Active', value:active.length.toLocaleString('en-US') },
            { label:'Inactive', value:(rows.length - active.length).toLocaleString('en-US') },
            { label:'Monthly Gross', value:`Tk ${this.money(gross)}` }
        ];

        return {
            title:'Staff List',
            subtitle:`${this.branchName} · ${department} · ${statusName}`,
            columns:
            [
                { header:'Code', kind:'center' },
                { header:'Employee Name', kind:'text' },
                { header:'Designation', kind:'text' },
                { header:'Department', kind:'text' },
                { header:'Branch', kind:'text' },
                { header:'Shift', kind:'text' },
                { header:'Type', kind:'center' },
                { header:'Joined', kind:'center' },
                { header:'Service', kind:'center', title:'Time since joining' },
                { header:'Confirmed', kind:'center' },
                { header:'Gender', kind:'center' },
                { header:'Date of Birth', kind:'center' },
                { header:'Blood', kind:'center' },
                { header:'Mobile', kind:'center' },
                { header:'National ID', kind:'center' },
                { header:'Gross Salary', kind:'money', strong:true },
                { header:'Status', kind:'center' }
            ],
            rows:rows.map(x =>
            [
                x.Code,
                x.FullName,
                x.DesignationName,
                x.DepartmentName,
                x.BranchName,
                x.ShiftName,
                x.EmploymentType,
                dayText(x.JoiningDate),
                x.IsActive ? serviceText(x.JoiningDate) : '',
                dayText(x.ConfirmationDate),
                x.Gender,
                dayText(x.DateOfBirth),
                x.BloodGroup,
                x.MobileNo,
                x.NationalId,
                x.GrossSalary,
                x.IsActive ? 'Active' : 'Inactive'
            ]),
            footer:
                rows.length === 0
                    ? null
                    : ['', `Total (${rows.length})`, '', '', '', '', '', '', '', '', '', '', '', '', '', gross, '']
        };
    }

    private leaveGrid(r: LeaveBalanceReport): Grid
    {
        const used =
            r.Rows.reduce((sum, x) => sum + x.TotalUsed, 0);

        this.summaryItems =
        [
            { label:'Employees', value:r.Rows.length.toLocaleString('en-US') },
            { label:'Leave Types', value:r.LeaveTypes.length.toLocaleString('en-US') },
            { label:'Leave Days Taken', value:used.toLocaleString('en-US', { maximumFractionDigits:2 }) },
            { label:'On Leave This Year', value:r.Rows.filter(x => x.TotalUsed > 0).length.toLocaleString('en-US') }
        ];

        // each leave type : taken, and left (types with a limit)
        const typeColumns:
            GridColumn[] = [];

        for (const t of r.LeaveTypes)
        {
            typeColumns.push({ header:`${t.ShortName} Taken`, kind:'days', title:`${t.Name} : days taken in ${r.YearName || r.Year}` });

            if (t.DaysPerYear > 0)
            {
                typeColumns.push({ header:`${t.ShortName} Left`, kind:'days', title:`${t.Name} : ${t.DaysPerYear} days a year less the days taken` });
            }
        }

        return {
            title:`Leave Balance ${r.YearName || r.Year}`,
            subtitle:`${this.branchName} · active employees`,
            columns:
            [
                { header:'Code', kind:'center' },
                { header:'Employee Name', kind:'text' },
                { header:'Designation', kind:'text' },
                ...typeColumns,
                { header:'Total Taken', kind:'days', strong:true }
            ],
            rows:r.Rows.map(x =>
            {
                const cells:
                    Cell[] = [];

                r.LeaveTypes.forEach((t, i) =>
                {
                    const c =
                        x.Cells[i];

                    // a type that is not for the employee : a dash
                    cells.push(!c || !c.Applies ? '-' : c.Used);

                    if (t.DaysPerYear > 0)
                    {
                        cells.push(!c || !c.Applies ? '-' : c.Remaining);
                    }
                });

                return [x.Code, x.FullName, x.DesignationName, ...cells, x.TotalUsed];
            }),
            footer:null
        };
    }

    private salaryGrid(r: SalaryRegisterReport): Grid
    {
        const total =
            (pick: (x: SalaryRegisterReport['Rows'][number]) => number): number =>
                r.Rows.reduce((sum, x) => sum + pick(x), 0);

        const months =
            r.MonthStatus.filter(s => !!s).length;

        this.summaryItems =
        [
            { label:'Employees', value:r.Rows.length.toLocaleString('en-US') },
            { label:'Months with a Sheet', value:String(months) },
            { label:'Earned', value:`Tk ${this.money(total(x => x.TotalEarned))}` },
            { label:'Deductions', value:`Tk ${this.money(total(x => x.TotalDeductions))}` },
            { label:'Net Pay', value:`Tk ${this.money(total(x => x.TotalNet))}` }
        ];

        return {
            title:`Salary Register ${r.Year}`,
            subtitle:`${this.branchName} · net pay by month · ${this.sheets === 'posted' ? 'posted sheets only' : 'every sheet (Draft, Approved and Posted)'}`,
            columns:
            [
                { header:'Code', kind:'center' },
                { header:'Employee Name', kind:'text' },
                { header:'Designation', kind:'text' },
                ...MONTHS.map((m, i) => ({
                    header:m,
                    kind:'money' as const,
                    title:r.MonthStatus[i] ? `${m} ${r.Year} : ${r.MonthStatus[i]}` : `${m} ${r.Year} : no salary sheet`
                })),
                { header:'Gross', kind:'money', title:'Gross salary of the months on the register' },
                { header:'Earned', kind:'money' },
                { header:'Deductions', kind:'money' },
                { header:'Net Pay', kind:'money', strong:true }
            ],
            rows:r.Rows.map(x =>
            [
                x.Code,
                x.FullName,
                x.DesignationName,
                ...MONTHS.map((_, i) => x.Net[i] ?? 0),
                x.TotalGross,
                x.TotalEarned,
                x.TotalDeductions,
                x.TotalNet
            ]),
            footer:
                r.Rows.length === 0
                    ? null
                    :
                    [
                        '',
                        `Total (${r.Rows.length})`,
                        '',
                        ...MONTHS.map((_, i) => total(x => x.Net[i] ?? 0)),
                        total(x => x.TotalGross),
                        total(x => x.TotalEarned),
                        total(x => x.TotalDeductions),
                        total(x => x.TotalNet)
                    ]
        };
    }

    //===========================================================
    // Excel and print (what is on screen)
    //===========================================================

    private fileName(): string
    {
        return (this.grid?.title ?? 'HR Report').replace(/[^A-Za-z0-9]+/g, '_');
    }

    async exportExcel():
        Promise<void>
    {
        const grid =
            this.grid;

        const rows =
            this.visibleRows;

        if (!grid || rows.length === 0)
        {
            this.toast.error('Excel', 'There is nothing to export.');
            return;
        }

        try
        {
            const XLSX =
                await import('xlsx');

            const sheet =
                XLSX.utils.aoa_to_sheet(
                [
                    [grid.title],
                    [grid.subtitle],
                    [],
                    grid.columns.map(c => c.header),
                    ...rows,
                    // the totals are of every row : they go with a full list only
                    ...(grid.footer && rows.length === grid.rows.length ? [grid.footer] : [])
                ]);

            sheet['!cols'] =
                grid.columns.map(c => ({ wch:c.kind === 'text' ? 24 : c.kind === 'money' ? 14 : 12 }));

            const book =
                XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(book, sheet, grid.title.slice(0, 31));

            XLSX.writeFile(book, `${this.fileName()}.xlsx`);
        }
        catch
        {
            this.toast.error('Excel', 'The Excel file could not be made.');
        }
    }

    // Print : the report on the canvas goes to the Print Engine
    // viewer (company header, PDF, Excel)
    print():
        void
    {
        const grid =
            this.grid;

        const rows =
            this.visibleRows;

        if (!grid || rows.length === 0)
        {
            this.toast.error('Print', 'There is nothing to print.');
            return;
        }

        const whole =
            rows.length === grid.rows.length;

        const token =
            saveHrReport(
            {
                title:grid.title,
                subtitle:grid.subtitle,
                meta:this.searchText.trim() ? [{ label:'Search', value:this.searchText.trim() }] : [],
                band:whole ? this.summaryItems.map(x => ({ label:x.label, value:String(x.value) })) : [],
                columns:grid.columns.map(c => ({
                    header:c.header,
                    kind:c.kind === 'days' ? 'num' : c.kind,
                    strong:c.strong
                })),
                rows:rows.map(r => r.map((cell, i) => this.show(cell, grid.columns[i]))),
                footer:grid.footer && whole ? grid.footer.map((cell, i) => this.show(cell, grid.columns[i])) : null,
                landscape:true
            });

        const problem =
            openHrPrint(this.router, HR_REPORT_PRINT_KEY, token, 'report', true);

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }
}
