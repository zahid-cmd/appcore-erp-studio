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
import { PageToolbarComponent } from '../../../../shared/components/layout/page-toolbar/page-toolbar';
import { ControlTab, ControlTabsComponent } from '../../../../shared/components/controls/control-tabs/control-tabs';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../shared/components/layout/page-canvas/page-canvas';
import { TextboxComponent } from '../../../../shared/components/controls/textbox/textbox';
import { SearchDropdownComponent } from '../../../../shared/components/controls/search-dropdown/search-dropdown';
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

import { FaService } from '../../shared/fa.service';

import
{
    FA_EMPTY_GUID,
    FaCategory,
    faRuleText,
    faStatusColor
}
from '../../shared/fa.models';


//===============================================================
// Model
//===============================================================

type ListRow =
    FaCategory
    &
    {
        RuleShown: string;
        RuleColor: string;
        StatusText: string;
        StatusColor: string;
    };

type TextField =
    'name' | 'threshold' | 'remarks';

const AMBER =
    '#b45309';


//===============================================================
// Asset Groups (Fixed Assets > Asset Setup)
//
// An asset group is a kind of asset (Furniture & Fixtures ...).
// The user only names it : saving makes its two General Ledgers,
// "PPE - <name>" under Property, Plant & Equipment and
// "ACD - <name>" under Accumulated Depreciation. How the group is
// depreciated is declared on Depreciation of Fixed Assets. The
// code is made by the server.
//
//   list / add / edit/:id / view/:id   (one component)
//===============================================================

@Component(
{
    selector:'asset-groups',
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
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./asset-groups.html',
    styleUrl:'./asset-groups.css'
})
export class AssetGroupsPage
implements OnInit
{
    private readonly fa = inject(FaService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progressDialog = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    mode:
        'list' | 'add' | 'edit' | 'view' = 'list';

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

    // The tabs of the list
    readonly tabs:
        ControlTab[] =
    [
        { id:'all', label:'All Asset Groups' },
        { id:'undeclared', label:'Depreciation Not Declared' }
    ];

    selectedTab =
        'all';

    onTab(value: string):
        void
    {
        this.selectedTab = value || 'all';
        this.currentPage = 1;
        this.apply();
    }

    readonly statusItems =
    [
        { label:'All Status', value:'' },
        { label:'Active', value:'active' },
        { label:'Inactive', value:'inactive' }
    ];

    historyOpened =
        false;

    historyItems:
        any[] = [];

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Code', field:'Code', width:'100px', align:'center' },
        { header:'Asset Group', field:'Name', width:'200px', align:'left' },
        { header:'Asset Ledger', field:'CostLedgerName', width:'220px', align:'left' },
        { header:'Accumulated Depreciation Ledger', field:'AccumLedgerName', width:'240px', align:'left' },
        { header:'Depreciation', field:'RuleShown', width:'210px', align:'left', dotField:'RuleColor' },
        { header:'Assets', field:'AssetCount', width:'80px', align:'center' },
        { header:'Status', field:'StatusText', width:'105px', align:'left', dotField:'StatusColor' },
        { header:'Actions', field:'actions', type:'actions', width:'120px', align:'center' }
    ];

    //===========================================================
    // Form
    //===========================================================

    entityId =
        '';

    code =
        '';

    name =
        '';

    threshold =
        '0';

    allowGroupCard =
        false;

    isActive =
        true;

    remarks =
        '';

    // The ledgers of the group (edit / view)
    costLedgerCode =
        '';

    costLedgerName =
        '';

    accumLedgerCode =
        '';

    accumLedgerName =
        '';

    isDeclared =
        false;

    ruleText =
        '';

    // The account sub groups the ledgers are made under,
    // "<code>  <name>" ('' : not found)
    ppeSubGroup =
        '';

    acdSubGroup =
        '';

    lookupsLoaded =
        false;

    get isViewMode(): boolean
    {
        return this.mode === 'view';
    }

    get isAdd(): boolean
    {
        return this.mode === 'add';
    }

    get pageTitle(): string
    {
        return this.mode === 'add' ? 'Add Asset Group'
            : this.mode === 'edit' ? 'Update Asset Group'
            : 'View Asset Group';
    }

    get saveText(): string
    {
        return this.mode === 'edit' ? 'Update' : 'Save';
    }

    // The code a new asset group gets
    nextCode =
        '';

    get codeText(): string
    {
        return this.mode === 'add' ? this.nextCode : this.code;
    }

    // Add : what will be made. Edit : the ledger with the name as
    // typed (saving renames it). View : what was made.
    private ledgerText(prefix: string, code: string, savedName: string): string
    {
        const typed = this.name.trim();

        if (this.isAdd)
        {
            return `${prefix}${typed || '(asset group name)'}`;
        }

        // a ledger the group made still carries the prefix : it
        // follows the name
        const name =
            this.mode === 'edit' && typed && savedName.toLowerCase().startsWith(prefix.toLowerCase())
                ? `${prefix}${typed}`
                : savedName;

        return [code, name].filter(x => x).join('  ') || '(not made)';
    }

    get costLedgerText(): string
    {
        return this.ledgerText('PPE - ', this.costLedgerCode, this.costLedgerName);
    }

    get accumLedgerText(): string
    {
        return this.ledgerText('ACD - ', this.accumLedgerCode, this.accumLedgerName);
    }

    get ppeUnderText(): string
    {
        return this.ppeSubGroup || (this.lookupsLoaded ? 'Property, Plant & Equipment (not found)' : '...');
    }

    get acdUnderText(): string
    {
        return this.acdSubGroup || (this.lookupsLoaded ? 'Accumulated Depreciation (not found)' : '...');
    }

    // The sub groups that were not found (after the lookups came)
    get missingSubGroups(): string[]
    {
        if (!this.lookupsLoaded)
        {
            return [];
        }

        const missing: string[] = [];

        if (!this.ppeSubGroup)
        {
            missing.push('Property, Plant & Equipment');
        }

        if (!this.acdSubGroup)
        {
            missing.push('Accumulated Depreciation');
        }

        return missing;
    }

    private num(text: string): number
    {
        const value = Number(String(text ?? '').replace(/,/g, '').trim());

        return Number.isFinite(value) ? value : NaN;
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
            url.includes('/view/') ? 'view' : url.includes('/edit/') ? 'edit' : url.includes('/add') ? 'add' : 'list';

        this.entityId =
            this.route.snapshot.paramMap.get('id') ?? '';

        if (this.mode === 'list')
        {
            this.loadList();
            return;
        }

        this.fa
            .getLookups()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:lookups =>
                {
                    this.nextCode = lookups?.NextGroupCode ?? '';
                    this.ppeSubGroup = lookups?.PpeSubGroup ?? '';
                    this.acdSubGroup = lookups?.AcdSubGroup ?? '';
                    this.lookupsLoaded = true;
                    this.cdr.detectChanges();
                },
                error:error => this.failed(error, 'The account sub groups could not be loaded.')
            });

        if (this.mode === 'add')
        {
            return;
        }

        this.loading = true;

        this.fa
            .getCategory(this.entityId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:c =>
                {
                    this.code = c.Code ?? '';
                    this.name = c.Name ?? '';
                    this.threshold = String(Number(c.CapitalThreshold) || 0);
                    this.allowGroupCard = !!c.AllowGroupCard;
                    this.isActive = c.IsActive !== false;
                    this.remarks = c.Remarks ?? '';
                    this.costLedgerCode = c.CostLedgerCode ?? '';
                    this.costLedgerName = c.CostLedgerName ?? '';
                    this.accumLedgerCode = c.AccumLedgerCode ?? '';
                    this.accumLedgerName = c.AccumLedgerName ?? '';
                    this.isDeclared = !!c.IsDeclared;
                    this.ruleText = c.RuleText || faRuleText(c.Method, c.RatePercent, c.LifeYears);
                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error:error => this.failed(error, 'The asset group could not be loaded.')
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

    //===========================================================
    // List
    //===========================================================

    loadList():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.fa
            .getCategories()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all =
                        (Array.isArray(rows) ? rows : []).map(x => ({
                            ...x,
                            RuleShown:x.IsDeclared ? (x.RuleText || faRuleText(x.Method, x.RatePercent, x.LifeYears)) : 'Not declared',
                            RuleColor:x.IsDeclared ? '' : AMBER,
                            StatusText:x.IsActive ? 'Active' : 'Inactive',
                            StatusColor:faStatusColor(x.IsActive ? 'Active' : 'Inactive')
                        }));

                    this.loading = false;
                    this.apply();
                },
                error:error => this.failed(error, 'Asset groups could not be loaded.')
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const matched =
            this.all.filter(x =>
                (this.selectedTab === 'all' || !x.IsDeclared)
                &&
                (!this.statusFilter || (this.statusFilter === 'active') === x.IsActive)
                &&
                (!find || [x.Code, x.Name, x.CostLedgerName, x.AccumLedgerName]
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

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
        this.currentPage = 1;
        this.apply();
    }

    onStatusFilter(value: any):
        void
    {
        this.statusFilter = String(value ?? '');
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
        // By code
    }

    add():
        void
    {
        void this.router.navigate(['../add'], { relativeTo:this.route });
    }

    view(row: ListRow):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    edit(row: ListRow):
        void
    {
        void this.router.navigate(['../edit', row.PublicId], { relativeTo:this.route });
    }

    goToList():
        void
    {
        void this.router.navigate([this.mode === 'add' ? '../list' : '../../list'], { relativeTo:this.route });
    }

    // Depreciation of Fixed Assets : the edit page of this group
    declareDepreciation():
        void
    {
        if (!this.entityId)
        {
            return;
        }

        void this.router.navigate(['/fixed-assets-management/asset-setup/depreciation-of-fixed-assets/edit', this.entityId]);
    }

    delete(row: ListRow):
        void
    {
        this.confirmDialog.open(
            'Delete Asset Group',
            `Delete ${row.Code} ${row.Name}? Its two ledgers become inactive.`,
            () =>
                this.fa.deleteCategory(row.PublicId).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.Code} was deleted.`);
                        this.loadList();
                    },
                    error:error =>
                        this.toast.error('Error', error?.error?.message ?? 'The asset group could not be deleted.')
                }),
            'Delete',
            'Keep',
            'danger');
    }

    restore():
        void
    {
        this.confirmDialog.open(
            'Restore Asset Group',
            'Bring back the most recently deleted asset group?',
            () =>
                this.fa.restoreCategory().subscribe(
                {
                    next:x =>
                    {
                        this.toast.success('Restored', x?.Message || 'The asset group was restored.');
                        this.loadList();
                    },
                    error:error =>
                        this.toast.error('Restore', error?.error?.message ?? 'Nothing was restored.')
                }),
            'Restore',
            'Cancel',
            'primary');
    }

    openHistory():
        void
    {
        this.fa
            .getHistory('asset-setup/asset-groups')
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

    onText(field: TextField, value: any):
        void
    {
        this[field] = String(value ?? '');
        this.cdr.detectChanges();
    }

    onSwitch(field: 'allowGroupCard' | 'isActive', event: Event):
        void
    {
        this[field] = (event.target as HTMLInputElement).checked;
        this.cdr.detectChanges();
    }

    private validate(): string
    {
        if (!this.name.trim())
        {
            return 'Give the asset group a name.';
        }

        if (this.isAdd)
        {
            if (!this.lookupsLoaded)
            {
                return 'The account sub groups are still loading. Try again in a moment.';
            }

            const missing = this.missingSubGroups;

            if (missing.length > 0)
            {
                return `The account sub group "${missing.join('" and "')}" was not found. Create it on Settings > Account Settings > Account Sub Groups under Non Current Assets, then come back.`;
            }
        }

        return '';
    }

    onSave():
        void
    {
        if (this.isSaving || this.isViewMode)
        {
            return;
        }

        const problem =
            this.validate();

        if (problem)
        {
            this.toast.error('Validation', problem);
            return;
        }

        const body: Partial<FaCategory> =
        {
            PublicId:this.entityId || FA_EMPTY_GUID,
            Code:this.code,
            Name:this.name.trim(),
            CapitalThreshold:0,
            AllowGroupCard:this.allowGroupCard,
            IsActive:this.isActive,
            Remarks:this.remarks.trim()
        };

        this.isSaving = true;

        this.progressDialog.show('Saving', 'Saving the asset group...', false);

        this.fa.saveCategory(this.mode === 'edit' ? this.entityId : '', body).subscribe(
        {
            next:() =>
                this.progressDialog.finish(() =>
                {
                    this.isSaving = false;

                    this.toast.success(
                        'Success',
                        this.mode === 'edit'
                            ? `${body.Name} was updated.`
                            : `${body.Name} saved : its two ledgers were made`);

                    this.goToList();
                }),
            error:error =>
            {
                this.progressDialog.fail();
                this.isSaving = false;
                this.toast.error('Error', error?.error?.message ?? 'The asset group could not be saved.');
                this.cdr.detectChanges();
            }
        });
    }
}
