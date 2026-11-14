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
import { PageCanvasComponent, PageCanvasConfig } from '../../../../shared/components/layout/page-canvas/page-canvas';
import { ControlTab, ControlTabsComponent } from '../../../../shared/components/controls/control-tabs/control-tabs';
import { DropdownComponent } from '../../../../shared/components/controls/dropdown/dropdown';
import { SearchDropdownComponent } from '../../../../shared/components/controls/search-dropdown/search-dropdown';
import { TextboxComponent } from '../../../../shared/components/controls/textbox/textbox';
import { SearchBoxComponent } from '../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { ListTableActions, ListTableColumn, ListTableComponent } from '../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../shared/components/controls/pagination/pagination';
import { HistoryDrawerComponent } from '../../../../shared/components/utilities/history-drawer/history-drawer';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';
import { ProgressDialogComponent } from '../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../human-resource-manangement/services/hr-progress.service';

import { FaService } from '../../shared/fa.service';

import
{
    FA_METHODS_ALL,
    FaCategory,
    faMoney,
    faNumber,
    faRuleText
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
        ResidualText: string;
        StatusText: string;
        StatusColor: string;
    };

interface LedgerItem
{
    label: string;
    value: string;
}

type LedgerField =
    'expenseLedger' | 'gainLedger' | 'lossLedger';

type TextField =
    'rate' | 'life' | 'residual';

const GREEN =
    '#047857';

const AMBER =
    '#b45309';

// The cost the "What this means" box works its example on
const EXAMPLE_COST =
    100000;


//===============================================================
// Depreciation of Fixed Assets (Fixed Assets > Asset Setup)
//
// For every asset group : how its assets are depreciated (method,
// rate or useful life, residual value) and the Depreciation
// Expense ledger. A group cannot be used on an acquisition or an
// opening asset until this is declared. The rows are the asset
// groups : nothing is added or deleted here.
//
//   list / edit/:id / view/:id   (one component; add -> list)
//===============================================================

@Component(
{
    selector:'depreciation-of-fixed-assets',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        ControlTabsComponent,
        DropdownComponent,
        SearchDropdownComponent,
        TextboxComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ToastComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./depreciation-of-fixed-assets.html',
    styleUrl:'./depreciation-of-fixed-assets.css'
})
export class DepreciationOfFixedAssetsPage
implements OnInit
{
    private readonly fa = inject(FaService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly progressDialog = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    mode:
        'list' | 'edit' | 'view' = 'list';

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

    readonly tabs:
        ControlTab[] =
    [
        { id:'all', label:'All' },
        { id:'declared', label:'Declared' },
        { id:'notdeclared', label:'Not Declared' }
    ];

    selectedTab =
        'all';

    // The rows are the asset groups : no delete here
    readonly tableActions:
        ListTableActions =
    {
        view:true,
        edit:true,
        delete:false
    };

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
        { header:'Method', field:'RuleShown', width:'210px', align:'left' },
        { header:'Residual %', field:'ResidualText', width:'100px', align:'center' },
        { header:'Depreciation Expense Ledger', field:'ExpenseLedgerName', width:'230px', align:'left' },
        { header:'Assets', field:'AssetCount', width:'80px', align:'center' },
        { header:'Status', field:'StatusText', width:'130px', align:'left', dotField:'StatusColor' },
        { header:'Actions', field:'actions', type:'actions', width:'100px', align:'center' }
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

    method =
        'StraightLine';

    rate =
        '';

    life =
        '';

    residual =
        '0';

    costLedgerText =
        '';

    accumLedgerText =
        '';

    accumLedgerName =
        '';

    expenseLedger =
        '';

    gainLedger =
        '';

    lossLedger =
        '';

    readonly methodItems =
        FA_METHODS_ALL;

    // The general ledgers : "<code>  <name>"
    ledgerItems:
        LedgerItem[] = [];

    // The same, with "Posting Setup ledger" (no own ledger) on top
    optionalLedgerItems:
        LedgerItem[] = [];

    get isViewMode(): boolean
    {
        return this.mode === 'view';
    }

    get isNone(): boolean
    {
        return this.method === 'None';
    }

    get isStraightLine(): boolean
    {
        return this.method === 'StraightLine';
    }

    get pageTitle(): string
    {
        return this.mode === 'edit' ? 'Declare Depreciation' : 'View Depreciation';
    }

    get groupText(): string
    {
        return [this.code, this.name].filter(x => x).join('  ');
    }

    private num(text: string): number
    {
        const value = Number(String(text ?? '').replace(/,/g, '').trim());

        return Number.isFinite(value) ? value : NaN;
    }

    // The rule in words, on an example cost of Tk 100,000
    get ruleLines(): string[]
    {
        const rate = this.num(this.rate) || 0;

        const life = this.isStraightLine ? (this.num(this.life) || 0) : 0;

        const residual = this.isNone ? 0 : (this.num(this.residual) || 0);

        const cost = EXAMPLE_COST;

        const accum = this.accumLedgerName || `ACD - ${this.name}`;

        const lines: string[] = [];

        if (this.isNone)
        {
            lines.push('No depreciation : the assets of this group are never depreciated (e.g. land).');
            lines.push('A depreciation run leaves them out; their book value stays at their cost.');
            lines.push(`Saving also puts this rule on the group's asset cards that have not been depreciated yet; a card already depreciated keeps its own rule.`);

            return lines;
        }

        const residualValue = cost * residual / 100;

        if (this.isStraightLine)
        {
            if (life > 0)
            {
                const yearly = (cost - residualValue) / life;

                lines.push(`${faRuleText(this.method, rate, life)} : an asset of Tk ${faMoney(cost)} is charged Tk ${faMoney(yearly)} a year, Tk ${faMoney(yearly / 12)} a month ((cost - residual value) / (${life} x 12)).`);
            }
            else if (rate > 0)
            {
                const yearly = cost * rate / 100;

                lines.push(`${faRuleText(this.method, rate, 0)} : an asset of Tk ${faMoney(cost)} is charged Tk ${faMoney(yearly)} a year, Tk ${faMoney(yearly / 12)} a month (cost x ${faNumber(rate)} / 100 / 12).`);
            }
            else
            {
                lines.push('Straight line : give a useful life or a rate to see the charge.');
            }
        }
        else if (rate > 0)
        {
            const first = cost * rate / 100 / 12;

            lines.push(`${faRuleText(this.method, rate, 0)} : an asset of Tk ${faMoney(cost)} is charged Tk ${faMoney(first)} in its first month (book value x ${faNumber(rate)} / 100 / 12), about Tk ${faMoney(cost * rate / 100)} in its first year; the charge gets smaller as the book value falls.`);
        }
        else
        {
            lines.push('Reducing balance : give a rate to see the charge.');
        }

        lines.push(
            residual > 0
                ? `Residual value : ${faNumber(residual)} % of the cost (Tk ${faMoney(residualValue)} of Tk ${faMoney(cost)}) is never depreciated.`
                : 'Residual value : none, the whole cost is depreciated.');

        lines.push(`Each month : Depreciation Expense Dr / ${accum} Cr.`);

        lines.push('An asset is charged for the full month it is put to use, and not in the month it is disposed.');

        lines.push(`Saving also puts this rule on the group's asset cards that have not been depreciated yet; a card already depreciated keeps its own rule.`);

        return lines;
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        const url =
            this.router.url.toLowerCase();

        this.entityId =
            this.route.snapshot.paramMap.get('id') ?? '';

        // Nothing is added here : the rows are the asset groups
        if (!url.includes('/view/') && !url.includes('/edit/') && /\/add(\/|\?|#|$)/.test(url))
        {
            void this.router.navigate(['../list'], { relativeTo:this.route, replaceUrl:true });
            return;
        }

        this.mode =
            url.includes('/view/') ? 'view' : url.includes('/edit/') ? 'edit' : 'list';

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
                    this.ledgerItems =
                        (lookups?.Ledgers ?? [])
                            .filter(x => x.LedgerType === 'General Ledger')
                            .map(x => ({ label:`${x.LedgerCode}  ${x.LedgerName}`, value:x.LedgerCode }));

                    this.optionalLedgerItems =
                        [{ label:'Posting Setup ledger', value:'' }, ...this.ledgerItems];

                    this.cdr.detectChanges();
                },
                error:error => this.failed(error, 'The ledgers could not be loaded.')
            });

        this.loading = true;

        this.fa
            .getDepreciationRule(this.entityId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:c =>
                {
                    this.code = c.Code ?? '';
                    this.name = c.Name ?? '';

                    // Not declared yet : straight line to start with
                    this.method =
                        c.Method === 'None' || c.Method === 'ReducingBalance' ? c.Method : 'StraightLine';

                    this.rate = Number(c.RatePercent) > 0 ? String(c.RatePercent) : '';
                    this.life = Number(c.LifeYears) > 0 ? String(c.LifeYears) : '';
                    this.residual = String(Number(c.ResidualPercent) || 0);
                    this.costLedgerText = [c.CostLedgerCode, c.CostLedgerName].filter(x => x).join('  ');
                    this.accumLedgerText = [c.AccumLedgerCode, c.AccumLedgerName].filter(x => x).join('  ');
                    this.accumLedgerName = c.AccumLedgerName ?? '';
                    this.expenseLedger = c.ExpenseLedgerCode ?? '';
                    this.gainLedger = c.GainLedgerCode ?? '';
                    this.lossLedger = c.LossLedgerCode ?? '';
                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error:error => this.failed(error, 'The depreciation of the asset group could not be loaded.')
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
            .getDepreciationRules()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all =
                        (Array.isArray(rows) ? rows : []).map(x => ({
                            ...x,
                            RuleShown:x.IsDeclared ? (x.RuleText || faRuleText(x.Method, x.RatePercent, x.LifeYears)) : 'Not declared',
                            ResidualText:x.IsDeclared && x.Method !== 'None' ? faNumber(x.ResidualPercent) : '',
                            StatusText:x.IsDeclared ? 'Declared' : 'Not declared',
                            StatusColor:x.IsDeclared ? GREEN : AMBER
                        }));

                    this.loading = false;
                    this.apply();
                },
                error:error => this.failed(error, 'The depreciation of the asset groups could not be loaded.')
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const matched =
            this.all.filter(x =>
                (this.selectedTab === 'all' || (this.selectedTab === 'declared') === !!x.IsDeclared)
                &&
                (!find || [x.Code, x.Name, x.RuleShown, x.ExpenseLedgerName, x.StatusText]
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

    onTab(value: string):
        void
    {
        this.selectedTab = value || 'all';
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
        void this.router.navigate(['../../list'], { relativeTo:this.route });
    }

    openHistory():
        void
    {
        this.fa
            .getHistory('asset-setup/depreciation-of-fixed-assets')
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

    onMethod(value: any):
        void
    {
        this.method = value === 'None' || value === 'ReducingBalance' ? value : 'StraightLine';
        this.cdr.detectChanges();
    }

    onLedger(field: LedgerField, value: any):
        void
    {
        this[field] = String(value ?? '');
        this.cdr.detectChanges();
    }

    // The same rules as the server
    private validate(): string
    {
        if (this.isNone)
        {
            return '';
        }

        const rate = this.rate.trim() === '' ? 0 : this.num(this.rate);

        if (Number.isNaN(rate) || rate < 0 || rate > 100)
        {
            return 'The rate must be a number, 0 to 100 % a year.';
        }

        if (this.isStraightLine)
        {
            const life = this.life.trim() === '' ? 0 : this.num(this.life);

            if (Number.isNaN(life) || !Number.isInteger(life) || life < 0 || life > 100)
            {
                return 'The useful life must be a whole number of years, 0 to 100.';
            }

            if (!(life > 0) && !(rate > 0))
            {
                return 'Straight line needs a useful life or a rate.';
            }
        }
        else if (!(rate > 0))
        {
            return 'Reducing balance needs a rate of more than 0 % a year.';
        }

        const residual = this.residual.trim() === '' ? 0 : this.num(this.residual);

        if (Number.isNaN(residual) || residual < 0 || residual >= 100)
        {
            return 'The residual value must be 0 to under 100 %.';
        }

        if (!this.expenseLedger)
        {
            return 'Choose the Depreciation Expense ledger.';
        }

        return '';
    }

    onSave():
        void
    {
        if (this.isSaving || this.mode !== 'edit' || this.loading || this.loadFailed)
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
            Method:this.method,
            RatePercent:this.isNone ? 0 : (this.num(this.rate) || 0),
            LifeYears:this.isStraightLine ? (this.num(this.life) || 0) : 0,
            ResidualPercent:this.isNone ? 0 : (this.num(this.residual) || 0),
            ExpenseLedgerCode:this.isNone ? '' : this.expenseLedger,
            GainLedgerCode:this.gainLedger,
            LossLedgerCode:this.lossLedger
        };

        this.isSaving = true;

        this.progressDialog.show('Saving', 'Saving the depreciation of the asset group...', false);

        this.fa.saveDepreciationRule(this.entityId, body).subscribe(
        {
            next:() =>
                this.progressDialog.finish(() =>
                {
                    this.isSaving = false;
                    this.toast.success('Success', `The depreciation of ${this.name} was declared.`);
                    this.goToList();
                }),
            error:error =>
            {
                this.progressDialog.fail();
                this.isSaving = false;
                this.toast.error('Error', error?.error?.message ?? 'The depreciation could not be saved.');
                this.cdr.detectChanges();
            }
        });
    }
}
