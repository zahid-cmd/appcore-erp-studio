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
    Observable
}
from 'rxjs';

import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import { PageHeaderComponent } from '../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../shared/components/layout/page-canvas/page-canvas';
import { ControlTab, ControlTabsComponent } from '../../../../../shared/components/controls/control-tabs/control-tabs';
import { SearchDropdownComponent } from '../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { TextboxComponent } from '../../../../../shared/components/controls/textbox/textbox';
import { DatepickerComponent } from '../../../../../shared/components/controls/datepicker/datepicker';
import { SearchBoxComponent } from '../../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../../shared/components/utilities/command-center/command-center';
import { ListTableColumn, ListTableComponent } from '../../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../../shared/components/controls/pagination/pagination';
import { ToastComponent } from '../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogComponent } from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ConfirmDialogService } from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ProgressDialogComponent } from '../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../services/hr-progress.service';
import { hrToDate, hrToText } from '../../../services/hr-date';

import
{
    BonusSheet,
    BonusSheetLine,
    BonusSheetListItem,
    BonusStructureChoice,
    PayrollExtrasService,
    payStatusText
}
from '../../services/payroll-extras.service';

import
{
    hrPayDay,
    hrPayMoney
}
from '../../models/hr-payments.model';

import
{
    HR_REPORT_PRINT_KEY,
    openHrPrint,
    saveHrReport
}
from '../../../print/hr-print';


type ListRow =
    BonusSheetListItem
    &
    {
        DateText: string;
        BasisText: string;
        AmountText: string;
        PaidText: string;
        StatusColor: string;
    };

const STATUS_COLORS:
    Record<string, string> =
{
    Draft:'#b45309',
    Posted:'#047857'
};


//===============================================================
// Festival Bonus (Human Resource > Payroll Management)
//
// A bonus sheet of a branch for an occasion : a percent of the
// Basic or the Gross salary for every active employee with the
// months of service asked.
//
//   list        the sheets
//   add         generate : left the master data, right how it works
//   sheet/:id   the employees. Draft : the amounts can be changed,
//               Save, Post. Posted : Unpost, pay it on Payroll
//               Payments. Print in both.
//===============================================================

@Component(
{
    selector:'festival-bonus',
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
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./festival-bonus.html',
    styleUrl:'./festival-bonus.css'
})
export class FestivalBonusPage
implements OnInit
{
    private readonly service = inject(PayrollExtrasService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progressDialog = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    mode:
        'list' | 'add' | 'sheet' = 'list';

    loading =
        false;

    loadFailed =
        false;

    isSaving =
        false;

    readonly asDate = hrToDate;

    money(value: number): string
    {
        return hrPayMoney(value);
    }

    day(value: string): string
    {
        return hrPayDay(value);
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

    private all:
        ListRow[] = [];

    rows:
        ListRow[] = [];

    searchText =
        '';

    currentPage =
        1;

    pageSize =
        10;

    totalRecords =
        0;

    readonly tabs:
        ControlTab[] =
    [
        { id:'all', label:'All Bonus Sheets' },
        { id:'Draft', label:'Draft' },
        { id:'Posted', label:'Posted' }
    ];

    selectedTab =
        'all';

    branchFilter =
        0;

    branchFilterItems:
        { label: string; value: number }[] =
    [
        { label:'All Branches', value:0 }
    ];

    summaryItems:
        { label: string; value: string }[] = [];

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Code', field:'Code', width:'100px', align:'center' },
        { header:'Bonus', field:'Title', width:'220px', align:'left' },
        { header:'Date', field:'DateText', width:'110px', align:'center' },
        { header:'Branch', field:'BranchName', width:'170px', align:'left' },
        { header:'Structure', field:'BasisText', width:'170px', align:'left' },
        { header:'Employees', field:'EmployeeCount', width:'95px', align:'center' },
        { header:'Amount', field:'AmountText', width:'130px', align:'right' },
        { header:'Paid', field:'PaidText', width:'120px', align:'left' },
        { header:'Status', field:'Status', width:'105px', align:'left', dotField:'StatusColor' },
        { header:'Journal', field:'JournalVoucherNo', width:'190px', align:'center' },
        { header:'Actions', field:'actions', type:'actions', width:'120px', align:'center' }
    ];

    //===========================================================
    // Generate
    //===========================================================

    nextCode =
        '';

    branchItems:
        { label: string; value: number }[] = [];

    title =
        '';

    branchId =
        0;

    bonusDate =
        hrToText(new Date());

    // The bonus structures (Human Resource Setup) : the Default first
    structures:
        BonusStructureChoice[] = [];

    structureId =
        0;

    remarks =
        '';

    get structureItems(): { label: string; value: number }[]
    {
        return this.structures.map(x => ({ label:x.IsDefault ? `${x.Name}  (Default)` : x.Name, value:x.Id }));
    }

    // The Default : it applies to every employee whose profile
    // names no other structure
    get structure(): BonusStructureChoice | undefined
    {
        return this.structures.find(x => x.IsDefault);
    }

    // What the Default structure says, in words
    get structureLines(): string[]
    {
        const s = this.structure;

        if (!s)
        {
            return [];
        }

        const lines =
        [
            `The bonus is a percent of the ${s.RateBase.toLowerCase()} salary, in whole taka.`,
            `Service is counted from ${s.ServiceFrom === 'Confirmation' ? 'the confirmation date' : 'the joining date'} to the bonus date.`,
            ...s.Slabs
        ];

        if (s.Slabs.length > 0)
        {
            lines.push('An employee with less service than the first slab gets no bonus.');
        }

        if (s.ConfirmedOnly)
        {
            lines.push('Only employees confirmed on or before the bonus date get it.');
        }

        return lines;
    }

    //===========================================================
    // The sheet
    //===========================================================

    sheet:
        BonusSheet | null = null;

    // What was typed for a line (Draft)
    private typed:
        Record<number, number> = {};

    hasChanges =
        false;

    unposting =
        false;

    unpostReason =
        '';

    get isDraft(): boolean
    {
        return this.sheet?.Status === 'Draft';
    }

    get isPosted(): boolean
    {
        return this.sheet?.Status === 'Posted';
    }

    get lines(): BonusSheetLine[]
    {
        const find =
            this.searchText.trim().toLowerCase();

        return (this.sheet?.Lines ?? []).filter(x =>
            !find || [x.EmployeeCode, x.EmployeeName, x.DesignationName].some(v => (v ?? '').toLowerCase().includes(find)));
    }

    get sheetTotal(): number
    {
        return (this.sheet?.Lines ?? []).reduce((sum, x) => sum + (Number(x.Amount) || 0), 0);
    }

    get paidTotal(): number
    {
        return (this.sheet?.Lines ?? []).reduce((sum, x) => sum + (Number(x.PaidAmount) || 0), 0);
    }

    paidText(line: BonusSheetLine): string
    {
        return line.PaidAmount <= 0 ? 'Unpaid' : line.PaidAmount >= line.Amount ? 'Paid' : `Part ${hrPayMoney(line.PaidAmount)}`;
    }

    get pageTitle(): string
    {
        return this.mode === 'list' ? 'Festival Bonus'
            : this.mode === 'add' ? 'Generate Festival Bonus'
            : 'Festival Bonus Sheet';
    }

    get pageSubtitle(): string
    {
        return this.mode === 'sheet' && this.sheet
            ? `${this.sheet.Title} · ${this.sheet.BranchName} · ${this.sheet.StructureName || this.sheet.BonusPercent + ' % of ' + this.sheet.RateBase}`
            : 'The festival bonus of a branch : a percent of the salary, posted to the accounts';
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        const url =
            this.router.url.toLowerCase();

        this.mode =
            url.includes('/sheet/') ? 'sheet' : url.includes('/add') ? 'add' : 'list';

        if (this.mode === 'list')
        {
            this.loadList();
        }
        else if (this.mode === 'sheet')
        {
            this.loadSheet();
        }
        else
        {
            this.service
                .getBonusDefaults()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(
                {
                    next:defaults =>
                    {
                        this.nextCode = defaults.NextCode;
                        this.branchItems = (defaults.Branches ?? []).map(x => ({ label:x.Name, value:x.Id }));
                        this.structures = defaults.Structures ?? [];
                        this.structureId = (this.structures.find(x => x.IsDefault) ?? this.structures[0])?.Id ?? 0;
                        this.cdr.detectChanges();
                    },
                    error:error => this.failed(error, 'The bonus sheet lists could not be loaded.')
                });
        }
    }

    private failed(error: any, fallback: string):
        void
    {
        this.loading = false;
        this.loadFailed = true;
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

        this.service
            .getBonusSheets()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all =
                        rows.map(x => ({
                            ...x,
                            DateText:hrPayDay(x.BonusDate),
                            BasisText:x.StructureName || `${x.BonusPercent} % of ${x.RateBase}`,
                            AmountText:hrPayMoney(x.TotalAmount),
                            PaidText:x.Status === 'Posted' ? payStatusText(x.TotalAmount, x.PaidAmount) : '',
                            StatusColor:STATUS_COLORS[x.Status] ?? '#64748b'
                        }));

                    this.branchFilterItems =
                    [
                        { label:'All Branches', value:0 },
                        ...[...new Map(this.all.map(x => [x.BranchId, x.BranchName])).entries()]
                            .map(([value, label]) => ({ label:label || `#${value}`, value }))
                            .sort((a, b) => a.label.localeCompare(b.label))
                    ];

                    this.loading = false;
                    this.apply();
                },
                error:error => this.failed(error, 'Bonus sheets could not be loaded.')
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
                &&
                (!this.branchFilter || x.BranchId === this.branchFilter)
                &&
                (!find || [x.Code, x.Title, x.DateText, x.BranchName, x.Status, x.JournalVoucherNo]
                    .some(v => (v ?? '').toLowerCase().includes(find))));

        this.totalRecords = matched.length;

        const pages = Math.max(1, Math.ceil(matched.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        const start = (this.currentPage - 1) * this.pageSize;

        this.rows = matched.slice(start, start + this.pageSize);

        const posted = matched.filter(x => x.Status === 'Posted');

        this.summaryItems =
        [
            { label:'Sheets', value:matched.length.toLocaleString('en-US') },
            { label:'Posted', value:posted.length.toLocaleString('en-US') },
            { label:'Bonus Posted', value:`Tk ${hrPayMoney(posted.reduce((sum, x) => sum + x.TotalAmount, 0))}` },
            { label:'Paid', value:`Tk ${hrPayMoney(posted.reduce((sum, x) => sum + x.PaidAmount, 0))}` }
        ];

        this.cdr.detectChanges();
    }

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
        this.currentPage = 1;

        if (this.mode === 'list')
        {
            this.apply();
        }
        else
        {
            this.cdr.detectChanges();
        }
    }

    onTab(value: string):
        void
    {
        this.selectedTab = value || 'all';
        this.currentPage = 1;
        this.apply();
    }

    onBranchFilter(value: any):
        void
    {
        this.branchFilter = Number(value) || 0;
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

    open(row: ListRow):
        void
    {
        void this.router.navigate(['../sheet', row.PublicId], { relativeTo:this.route });
    }

    goToList():
        void
    {
        void this.router.navigate([this.mode === 'sheet' ? '../../list' : '../list'], { relativeTo:this.route });
    }

    delete(row: BonusSheetListItem):
        void
    {
        if (row.Status !== 'Draft')
        {
            this.toast.error('Festival Bonus', `${row.Code} is ${row.Status} : only a Draft sheet can be deleted. Open it and unpost it first.`);
            return;
        }

        this.confirmDialog.open(
            'Delete Bonus Sheet',
            `Delete ${row.Code} : ${row.Title}, ${row.BranchName}?`,
            () =>
                this.service.deleteBonus(row.PublicId).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.Code} was deleted.`);
                        this.loadList();
                    },
                    error:error =>
                        this.toast.error('Error', error?.error?.message ?? 'The bonus sheet could not be deleted.')
                }),
            'Delete',
            'Keep',
            'danger');
    }

    //===========================================================
    // Generate
    //===========================================================

    onText(field: 'title' | 'remarks', value: any):
        void
    {
        this[field] = String(value ?? '');
        this.cdr.detectChanges();
    }

    onBranch(value: any):
        void
    {
        this.branchId = Number(value) || 0;
        this.cdr.detectChanges();
    }

    onBonusDate(date: Date | null):
        void
    {
        this.bonusDate = hrToText(date);
        this.cdr.detectChanges();
    }

    onStructure(value: any):
        void
    {
        this.structureId = Number(value) || 0;
        this.cdr.detectChanges();
    }

    onGenerate():
        void
    {
        if (this.isSaving)
        {
            return;
        }

        const problem =
            !this.title.trim() ? 'Name the bonus (e.g. Eid-ul-Fitr 2027).'
            : !this.branchId ? 'Pick the branch.'
            : !this.bonusDate ? 'Bonus Date is required.'
            : '';

        if (problem)
        {
            this.toast.error('Validation', problem);
            return;
        }

        this.run(
            'Generating the bonus sheet...',
            this.service.generateBonus(
            {
                Title:this.title.trim(),
                BranchId:this.branchId,
                BonusDate:this.bonusDate,
                Remarks:this.remarks.trim()
            }),
            (sheet: BonusSheet) => `${sheet.Code} : ${sheet.EmployeeCount} employee(s), Tk ${hrPayMoney(sheet.TotalAmount)}. Open it to check the amounts and post it.`,
            'The bonus sheet could not be generated.');
    }

    onClear():
        void
    {
        this.title = '';
        this.branchId = 0;
        this.bonusDate = hrToText(new Date());
        this.structureId = (this.structures.find(x => x.IsDefault) ?? this.structures[0])?.Id ?? 0;
        this.remarks = '';
        this.cdr.detectChanges();
    }

    //===========================================================
    // The sheet
    //===========================================================

    private loadSheet():
        void
    {
        this.loading = true;
        this.cdr.detectChanges();

        this.service
            .getBonusSheet(this.route.snapshot.paramMap.get('id') ?? '')
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:sheet =>
                {
                    this.sheet = sheet;
                    this.typed = {};
                    this.hasChanges = false;
                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error:error => this.failed(error, 'The bonus sheet could not be loaded.')
            });
    }

    // An amount typed for an employee (Draft) : whole taka
    onAmount(line: BonusSheetLine, event: Event):
        void
    {
        const input = event.target as HTMLInputElement;

        let amount = Math.round(Number((input.value ?? '').replace(/,/g, '')));

        if (!(amount > 0))
        {
            amount = 0;
        }

        line.Amount = amount;
        this.typed[line.BonusSheetLineId] = amount;
        this.hasChanges = true;
        input.value = String(amount);
        this.cdr.detectChanges();
    }

    // Saves, then goes back to the list
    private run<T>(busy: string, call: Observable<T>, done: (result: T) => string, failure: string):
        void
    {
        this.isSaving = true;

        this.progressDialog.show('Saving', busy, false);

        call.subscribe(
        {
            next:result =>
                this.progressDialog.finish(() =>
                {
                    this.isSaving = false;
                    this.hasChanges = false;
                    this.toast.success('Success', done(result));
                    this.goToList();
                }),
            error:error =>
            {
                this.progressDialog.fail();
                this.isSaving = false;
                this.toast.error('Error', error?.error?.message ?? failure);
                this.cdr.detectChanges();
            }
        });
    }

    private typedLines(): { BonusSheetLineId: number; Amount: number }[]
    {
        return Object.keys(this.typed).map(id => ({ BonusSheetLineId:Number(id), Amount:this.typed[Number(id)] }));
    }

    onSave():
        void
    {
        if (!this.sheet || !this.isDraft || this.isSaving)
        {
            return;
        }

        if (!this.hasChanges)
        {
            this.toast.info('Festival Bonus', 'Nothing was changed.');
            return;
        }

        const sheet = this.sheet;

        this.run(
            'Saving the amounts...',
            this.service.saveBonus(sheet.PublicId, this.typedLines()),
            () => `${sheet.Code} was saved.`,
            'The bonus sheet could not be saved.');
    }

    onPost():
        void
    {
        if (!this.sheet || !this.isDraft || this.isSaving)
        {
            return;
        }

        if (this.hasChanges)
        {
            this.toast.error('Festival Bonus', 'Save the amounts you typed first, then open the sheet and post it.');
            return;
        }

        const sheet = this.sheet;

        this.confirmDialog.open(
            'Post Bonus Sheet',
            `Post ${sheet.Code} : Tk ${hrPayMoney(this.sheetTotal)} for ${sheet.EmployeeCount} employee(s)? A Journal Voucher is written (Bonus Expense against Bonus Payable).`,
            () =>
                this.run(
                    'Posting the bonus sheet...',
                    this.service.postBonus(sheet.PublicId),
                    () => `${sheet.Code} was posted. Pay it on Payroll Payments.`,
                    'The bonus sheet could not be posted.'),
            'Post',
            'Cancel',
            'primary');
    }

    askUnpost():
        void
    {
        this.unposting = true;
        this.unpostReason = '';
        this.cdr.detectChanges();
    }

    onUnpostReason(value: any):
        void
    {
        this.unpostReason = String(value ?? '');
    }

    keepPosted():
        void
    {
        this.unposting = false;
        this.cdr.detectChanges();
    }

    confirmUnpost():
        void
    {
        if (!this.sheet || this.isSaving)
        {
            return;
        }

        const reason = this.unpostReason.trim();

        if (!reason)
        {
            this.toast.error('Festival Bonus', 'Write why the bonus sheet is unposted.');
            return;
        }

        const sheet = this.sheet;

        this.run(
            'Unposting the bonus sheet...',
            this.service.unpostBonus(sheet.PublicId, reason),
            () => `${sheet.Code} unposted : its Journal Voucher is cancelled.`,
            'The bonus sheet could not be unposted.');
    }

    goToPayments():
        void
    {
        void this.router.navigate(['../../../payroll-payments/add'], { relativeTo:this.route });
    }

    // The bonus sheet with a signature column (Print Engine)
    print():
        void
    {
        const sheet = this.sheet;

        if (!sheet || sheet.Lines.length === 0)
        {
            return;
        }

        if (this.hasChanges)
        {
            this.toast.error('Print', 'Save the amounts you typed first : the print shows the saved sheet.');
            return;
        }

        const lines = sheet.Lines.filter(x => x.Amount > 0);

        const total = lines.reduce((sum, x) => sum + x.Amount, 0);

        const token =
            saveHrReport(
            {
                title:'Festival Bonus',
                subtitle:`${sheet.Title} · ${sheet.BranchName}`,
                meta:
                [
                    { label:'Sheet', value:sheet.Code },
                    { label:'Date', value:hrPayDay(sheet.BonusDate) },
                    { label:'Structure', value:sheet.StructureName || `${sheet.BonusPercent} % of ${sheet.RateBase}` },
                    { label:'Bonus on', value:sheet.RateBase },
                    { label:'Status', value:sheet.Status },
                    { label:'Journal Voucher', value:sheet.JournalVoucherNo }
                ].filter(x => !!x.value),
                band:
                [
                    { label:'Employees', value:String(lines.length) },
                    { label:'Bonus', value:`Tk ${hrPayMoney(total)}` }
                ],
                columns:
                [
                    { header:'Code', kind:'text' },
                    { header:'Employee', kind:'text' },
                    { header:'Designation', kind:'text' },
                    { header:'Structure', kind:'text' },
                    { header:'Service (months)', kind:'num' },
                    { header:'Basic', kind:'money' },
                    { header:'Gross', kind:'money' },
                    { header:'%', kind:'num' },
                    { header:'Bonus', kind:'money', strong:true },
                    { header:'Signature', kind:'text' }
                ],
                rows:lines.map(x =>
                [
                    x.EmployeeCode,
                    x.EmployeeName,
                    x.DesignationName,
                    x.StructureName ?? '',
                    String(x.ServiceMonths),
                    hrPayMoney(x.BasicSalary),
                    hrPayMoney(x.GrossSalary),
                    x.BonusPercent ? String(x.BonusPercent) : '',
                    hrPayMoney(x.Amount),
                    ''
                ]),
                footer:['', `Total (${lines.length})`, '', '', '', '', '', '', hrPayMoney(total), ''],
                note:sheet.Remarks,
                landscape:true
            });

        const problem =
            openHrPrint(this.router, HR_REPORT_PRINT_KEY, token, `${sheet.Code} ${sheet.Title}`, true);

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }
}
