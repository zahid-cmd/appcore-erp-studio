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
    Observable,
    switchMap,
    tap
}
from 'rxjs';

import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../shared/components/layout/page-canvas/page-canvas';
import { ControlTab, ControlTabsComponent } from '../../../../shared/components/controls/control-tabs/control-tabs';
import { SearchDropdownComponent } from '../../../../shared/components/controls/search-dropdown/search-dropdown';
import { TextboxComponent } from '../../../../shared/components/controls/textbox/textbox';
import { DatepickerComponent } from '../../../../shared/components/controls/datepicker/datepicker';
import { SearchBoxComponent } from '../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { ListTableActions, ListTableColumn, ListTableComponent } from '../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../shared/components/controls/pagination/pagination';
import { HistoryDrawerComponent } from '../../../../shared/components/utilities/history-drawer/history-drawer';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogComponent } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ConfirmDialogService } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ProgressDialogComponent } from '../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../human-resource-manangement/services/hr-progress.service';
import { hrToDate, hrToText } from '../../../human-resource-manangement/services/hr-date';

import
{
    FA_REPORT_PRINT_KEY,
    openFaPrint,
    saveFaReport
}
from '../../print/fa-print';

import
{
    FaLookup,
    FaVerification,
    FaVerificationLine,
    faDay,
    faStatusColor
}
from '../../shared/fa.models';

import
{
    FaService
}
from '../../shared/fa.service';


type ListRow =
    FaVerification
    &
    {
        DateText: string;
        LocationText: string;
        StatusColor: string;
    };

interface Choice<T>
{
    label: string;
    value: T;
}

// Pending / Found / Missing
type Result =
    'Pending' | 'Found' | 'Missing';

const HISTORY_PAGE =
    'asset-reports/asset-verification';

const ALL_LOCATIONS =
    'All locations';

// Pending is shown as "Not counted"
function resultText(result: string): string
{
    return result === 'Found' || result === 'Missing' ? result : 'Not counted';
}


//===============================================================
// Asset Verification (Fixed Assets > Asset Reports)
//
// The physical count of a branch (or one location of it) against
// the register.
//
//   list        the counts
//   add         a new count : the date, the branch, the location
//   view/:id    the count sheet. Draft : mark every asset Found or
//               Missing, Save, Close Count. Closed : read only.
//               Print in both.
//
// A count changes nothing on the asset cards.
//===============================================================

@Component(
{
    selector:'asset-verification',
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
    templateUrl:'./asset-verification.html',
    styleUrl:'./asset-verification.css'
})
export class AssetVerificationPage
implements OnInit
{
    private readonly service = inject(FaService);

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

    day(value: string): string
    {
        return faDay(value);
    }

    resultText(result: string): string
    {
        return resultText(result);
    }

    // A table with the pager under it (the list, the count sheet)
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

    statusFilter =
        '';

    readonly statusItems:
        Choice<string>[] =
    [
        { label:'All Statuses', value:'' },
        { label:'Draft', value:'Draft' },
        { label:'Closed', value:'Closed' }
    ];

    branchFilter =
        0;

    branchFilterItems:
        Choice<number>[] = [{ label:'All Branches', value:0 }];

    // A count is opened, never edited as a form
    readonly listActions:
        ListTableActions =
    {
        view:true,
        edit:false,
        delete:true
    };

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Code', field:'Code', width:'110px', align:'center' },
        { header:'Date', field:'DateText', width:'110px', align:'center' },
        { header:'Branch', field:'BranchName', width:'190px', align:'left' },
        { header:'Location', field:'LocationText', width:'180px', align:'left' },
        { header:'Assets', field:'AssetCount', width:'85px', align:'center' },
        { header:'Found', field:'FoundCount', width:'85px', align:'center' },
        { header:'Missing', field:'MissingCount', width:'85px', align:'center' },
        { header:'Not Counted', field:'PendingCount', width:'110px', align:'center' },
        { header:'Status', field:'Status', width:'105px', align:'left', dotField:'StatusColor' },
        { header:'Actions', field:'actions', type:'actions', width:'100px', align:'center' }
    ];

    historyOpened =
        false;

    historyItems:
        any[] = [];

    //===========================================================
    // A new count
    //===========================================================

    countDate =
        hrToText(new Date());

    branchId =
        0;

    locationId =
        0;

    remarks =
        '';

    branchItems:
        Choice<number>[] = [];

    locationItems:
        Choice<number>[] = [{ label:ALL_LOCATIONS, value:0 }];

    private today =
        hrToText(new Date());

    private locations:
        FaLookup[] = [];

    //===========================================================
    // The count sheet
    //===========================================================

    sheet:
        FaVerification | null = null;

    readonly sheetTabs:
        ControlTab[] =
    [
        { id:'all', label:'All' },
        { id:'Pending', label:'Not Counted' },
        { id:'Found', label:'Found' },
        { id:'Missing', label:'Missing' }
    ];

    sheetTab =
        'all';

    // Every line the tab and the search leave
    private matchedLines:
        FaVerificationLine[] = [];

    // The lines of the page shown
    lines:
        FaVerificationLine[] = [];

    extraItems =
        '';

    sheetRemarks =
        '';

    hasChanges =
        false;

    get isDraft(): boolean
    {
        return this.sheet?.Status === 'Draft';
    }

    get assetCount(): number
    {
        return this.sheet?.Lines.length ?? 0;
    }

    get foundCount(): number
    {
        return this.count('Found');
    }

    get missingCount(): number
    {
        return this.count('Missing');
    }

    get pendingCount(): number
    {
        return this.assetCount - this.foundCount - this.missingCount;
    }

    private count(result: Result): number
    {
        return (this.sheet?.Lines ?? []).filter(x => x.Result === result).length;
    }

    get matchedCount(): number
    {
        return this.matchedLines.length;
    }

    get serialStart(): number
    {
        return (this.currentPage - 1) * this.pageSize;
    }

    get locationText(): string
    {
        return this.sheet?.LocationName || ALL_LOCATIONS;
    }

    get pageTitle(): string
    {
        return this.mode === 'sheet' ? 'Asset Count Sheet' : 'Asset Verification';
    }

    get pageSubtitle(): string
    {
        return this.mode === 'sheet' && this.sheet
            ? `${this.sheet.BranchName} · ${this.locationText} · ${faDay(this.sheet.VerificationDate)}`
            : 'The physical count of a branch against the register';
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
            url.includes('/view/') || url.includes('/edit/') ? 'sheet' : url.includes('/add') ? 'add' : 'list';

        if (this.mode === 'list')
        {
            this.loadList();
        }
        else if (this.mode === 'sheet')
        {
            // a count sheet is long : more lines on a page
            this.pageSize = 50;

            this.loadSheet();
        }
        else
        {
            this.service
                .getLookups()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(
                {
                    next:lookups =>
                    {
                        this.today = lookups.Today || this.today;
                        this.countDate = this.today;
                        this.branchItems = (lookups.Branches ?? []).map(x => ({ label:x.Name, value:x.Id }));
                        this.locations = lookups.Locations ?? [];

                        // one branch : it is the branch
                        if (this.branchItems.length === 1)
                        {
                            this.branchId = this.branchItems[0].value;
                        }

                        this.buildLocations();
                        this.cdr.detectChanges();
                    },
                    error:error => this.failed(error, 'The branches and locations could not be loaded.')
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
            .getVerifications()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all =
                        (Array.isArray(rows) ? rows : []).map(x => ({
                            ...x,
                            DateText:faDay(x.VerificationDate),
                            LocationText:x.LocationName || ALL_LOCATIONS,
                            StatusColor:faStatusColor(x.Status)
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
                error:error => this.failed(error, 'The counts could not be loaded.')
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const matched =
            this.all.filter(x =>
                (!this.statusFilter || x.Status === this.statusFilter)
                &&
                (!this.branchFilter || x.BranchId === this.branchFilter)
                &&
                (!find || [x.Code, x.DateText, x.BranchName, x.LocationText, x.Status, x.Remarks]
                    .some(v => (v ?? '').toLowerCase().includes(find))));

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

    // The list or the count sheet, as the mode is
    private refresh():
        void
    {
        if (this.mode === 'sheet')
        {
            this.applySheet();
        }
        else
        {
            this.apply();
        }
    }

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
        this.currentPage = 1;
        this.refresh();
    }

    onStatusFilter(value: any):
        void
    {
        this.statusFilter = String(value ?? '');
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
        this.refresh();
    }

    onPageSizeChange(size: number):
        void
    {
        this.pageSize = size;
        this.currentPage = 1;
        this.refresh();
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

    open(row: FaVerification):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    private toList():
        void
    {
        void this.router.navigate([this.mode === 'sheet' ? '../../list' : '../list'], { relativeTo:this.route });
    }

    // Back : asks first while the count sheet has unsaved marks
    goToList():
        void
    {
        if (this.mode !== 'sheet' || !this.hasChanges)
        {
            this.toList();
            return;
        }

        this.confirmDialog.open(
            'Leave the Count Sheet',
            'What you marked since the last Save is not saved. Leave without saving?',
            () => this.toList(),
            'Leave',
            'Stay',
            'danger');
    }

    delete(row: FaVerification):
        void
    {
        this.confirmDialog.open(
            'Delete Count',
            `Delete ${row.Code} : ${row.BranchName}, ${row.LocationName || ALL_LOCATIONS}? Only a Draft count can be deleted.`,
            () =>
                this.service.deleteVerification(row.PublicId).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.Code} was deleted.`);
                        this.loadList();
                    },
                    error:error =>
                        this.toast.error('Error', error?.error?.message ?? 'The count could not be deleted.')
                }),
            'Delete',
            'Keep',
            'danger');
    }

    openHistory():
        void
    {
        this.service
            .getHistory(HISTORY_PAGE)
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
    // A new count
    //===========================================================

    // "All locations", then the locations of the branch
    private buildLocations():
        void
    {
        this.locationItems =
        [
            { label:ALL_LOCATIONS, value:0 },
            ...this.locations
                .filter(x => this.branchId > 0 && x.BranchId === this.branchId)
                .map(x => ({ label:x.Name, value:x.Id }))
        ];

        if (!this.locationItems.some(x => x.value === this.locationId))
        {
            this.locationId = 0;
        }
    }

    onCountDate(date: Date | null):
        void
    {
        this.countDate = hrToText(date);
        this.cdr.detectChanges();
    }

    onBranch(value: any):
        void
    {
        this.branchId = Number(value) || 0;
        this.buildLocations();
        this.cdr.detectChanges();
    }

    onLocation(value: any):
        void
    {
        this.locationId = Number(value) || 0;
        this.cdr.detectChanges();
    }

    onRemarks(value: any):
        void
    {
        this.remarks = String(value ?? '');
    }

    onStart():
        void
    {
        if (this.isSaving)
        {
            return;
        }

        const problem =
            !this.countDate ? 'Date is required.'
            : !this.branchId ? 'Pick the branch.'
            : '';

        if (problem)
        {
            this.toast.error('Validation', problem);
            return;
        }

        this.busy(
            'Starting',
            'Making the count sheet...',
            this.service.createVerification(
            {
                VerificationDate:this.countDate,
                BranchId:this.branchId,
                FaLocationId:this.locationId,
                Remarks:this.remarks.trim()
            }),
            sheet =>
            {
                this.toast.success('Success', `${sheet.Code} : the count sheet is ready. Mark every asset Found or Missing.`);

                void this.router.navigate(['../view', sheet.PublicId], { relativeTo:this.route });
            },
            'The count could not be started.');
    }

    //===========================================================
    // The count sheet
    //===========================================================

    private loadSheet():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.service
            .getVerification(this.route.snapshot.paramMap.get('id') ?? '')
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:sheet =>
                {
                    this.sheet =
                    {
                        ...sheet,
                        Lines:(sheet.Lines ?? []).map(x => ({ ...x, Note:x.Note ?? '' }))
                    };

                    this.extraItems = sheet.ExtraItems ?? '';
                    this.sheetRemarks = sheet.Remarks ?? '';
                    this.hasChanges = false;
                    this.loading = false;
                    this.applySheet();
                },
                error:error => this.failed(error, 'The count sheet could not be loaded.')
            });
    }

    private applySheet():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        this.matchedLines =
            (this.sheet?.Lines ?? []).filter(x =>
                (this.sheetTab === 'all' || x.Result === this.sheetTab)
                &&
                (!find || [x.AssetNo, x.Name, x.CategoryName, x.LocationName, x.CustodianName, x.Note]
                    .some(v => (v ?? '').toLowerCase().includes(find))));

        this.totalRecords = this.matchedLines.length;

        const pages = Math.max(1, Math.ceil(this.matchedLines.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        this.lines = this.matchedLines.slice(this.serialStart, this.serialStart + this.pageSize);

        this.cdr.detectChanges();
    }

    onSheetTab(value: string):
        void
    {
        this.sheetTab = value || 'all';
        this.currentPage = 1;
        this.applySheet();
    }

    // Found / Missing / Pending for an asset. The line stays where
    // it is until the tab, the search or the page changes.
    setResult(line: FaVerificationLine, result: Result):
        void
    {
        if (!this.isDraft || line.Result === result)
        {
            return;
        }

        line.Result = result;
        this.hasChanges = true;
        this.cdr.detectChanges();
    }

    onNote(line: FaVerificationLine, event: Event):
        void
    {
        if (!this.isDraft)
        {
            return;
        }

        line.Note = (event.target as HTMLInputElement).value ?? '';
        this.hasChanges = true;
        this.cdr.detectChanges();
    }

    // Every line the tab and the search show, on all its pages
    markShown(result: Result):
        void
    {
        if (!this.isDraft)
        {
            return;
        }

        const lines = this.matchedLines.filter(x => x.Result !== result);

        if (lines.length === 0)
        {
            this.toast.info('Asset Verification', result === 'Found' ? 'Every asset shown is Found already.' : 'No asset shown is marked.');
            return;
        }

        for (const line of lines)
        {
            line.Result = result;
        }

        this.hasChanges = true;
        this.applySheet();
    }

    onExtraItems(event: Event):
        void
    {
        this.extraItems = (event.target as HTMLTextAreaElement).value ?? '';
        this.hasChanges = true;
        this.cdr.detectChanges();
    }

    onSheetRemarks(value: any):
        void
    {
        this.sheetRemarks = String(value ?? '');
        this.hasChanges = true;
        this.cdr.detectChanges();
    }

    // The progress dialog around a call
    private busy<T>(title: string, message: string, call: Observable<T>, done: (result: T) => void, failure: string):
        void
    {
        this.isSaving = true;

        this.progressDialog.show(title, message, false);

        call.subscribe(
        {
            next:result =>
                this.progressDialog.finish(() =>
                {
                    this.isSaving = false;
                    done(result);
                    this.cdr.detectChanges();
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

    // What was marked, as the server takes it
    private saveCall(sheet: FaVerification): Observable<void>
    {
        return this.service
            .saveVerification(
                sheet.PublicId,
                {
                    Lines:sheet.Lines.map(x => ({ FaAssetId:x.FaAssetId, Result:x.Result, Note:(x.Note ?? '').trim() })) as FaVerificationLine[],
                    ExtraItems:this.extraItems.trim(),
                    Remarks:this.sheetRemarks.trim()
                })
            .pipe(tap(() => this.hasChanges = false));
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
            this.toast.info('Asset Verification', 'Nothing was changed.');
            return;
        }

        const sheet = this.sheet;

        this.busy(
            'Saving',
            'Saving the count...',
            this.saveCall(sheet),
            () =>
            {
                this.toast.success('Success', `${sheet.Code} was saved.`);
                this.loadSheet();
            },
            'The count could not be saved.');
    }

    // Saves what is not saved, then locks the count
    onCloseCount():
        void
    {
        if (!this.sheet || !this.isDraft || this.isSaving)
        {
            return;
        }

        const sheet = this.sheet;

        this.confirmDialog.open(
            'Close Count',
            `Close ${sheet.Code}? The count is locked : nothing on it can be changed afterwards. It changes nothing on the asset cards.`,
            () =>
                this.busy(
                    'Closing',
                    'Closing the count...',
                    this.hasChanges
                        ? this.saveCall(sheet).pipe(switchMap(() => this.service.closeVerification(sheet.PublicId)))
                        : this.service.closeVerification(sheet.PublicId),
                    () =>
                    {
                        this.toast.success('Success', `${sheet.Code} was closed.`);
                        this.loadSheet();
                    },
                    'The count could not be closed.'),
            'Close Count',
            'Cancel',
            'primary');
    }

    onDeleteSheet():
        void
    {
        if (!this.sheet || !this.isDraft || this.isSaving)
        {
            return;
        }

        const sheet = this.sheet;

        this.confirmDialog.open(
            'Delete Count',
            `Delete ${sheet.Code} : ${sheet.BranchName}, ${this.locationText}? Everything marked on it is lost.`,
            () =>
                this.busy(
                    'Deleting',
                    'Deleting the count...',
                    this.service.deleteVerification(sheet.PublicId),
                    () =>
                    {
                        this.hasChanges = false;
                        this.toast.success('Deleted', `${sheet.Code} was deleted.`);
                        this.toList();
                    },
                    'The count could not be deleted.'),
            'Delete',
            'Keep',
            'danger');
    }

    // The count sheet (Print Engine)
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
            this.toast.error('Print', 'Save what you marked first : the print shows the saved count.');
            return;
        }

        const token =
            saveFaReport(
            {
                title:'Asset Verification',
                subtitle:`${sheet.BranchName} · ${this.locationText}`,
                meta:
                [
                    { label:'Count', value:sheet.Code },
                    { label:'Date', value:faDay(sheet.VerificationDate) },
                    { label:'Branch', value:sheet.BranchName },
                    { label:'Location', value:this.locationText },
                    { label:'Status', value:sheet.Status },
                    { label:'Remarks', value:sheet.Remarks }
                ].filter(x => !!x.value),
                band:
                [
                    { label:'Assets', value:String(this.assetCount) },
                    { label:'Found', value:String(this.foundCount) },
                    { label:'Missing', value:String(this.missingCount) },
                    { label:'Not counted', value:String(this.pendingCount) }
                ],
                columns:
                [
                    { header:'Asset No', kind:'text' },
                    { header:'Asset', kind:'text' },
                    { header:'Asset Group', kind:'text' },
                    { header:'Location', kind:'text' },
                    { header:'Custodian', kind:'text' },
                    { header:'Result', kind:'text', strong:true },
                    { header:'Note', kind:'text' }
                ],
                rows:sheet.Lines.map(x =>
                [
                    x.AssetNo,
                    x.Name,
                    x.CategoryName,
                    x.LocationName,
                    x.CustodianName,
                    resultText(x.Result),
                    x.Note ?? ''
                ]),
                footer:null,
                note:sheet.ExtraItems ? `Things found that are not in the register : ${sheet.ExtraItems}` : '',
                landscape:true
            });

        const problem =
            openFaPrint(this.router, FA_REPORT_PRINT_KEY, token, 'Asset Verification', true);

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }
}
