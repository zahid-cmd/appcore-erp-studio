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
    RouterLink
}
from '@angular/router';

import
{
    FormsModule
}
from '@angular/forms';

import
{
    firstValueFrom
}
from 'rxjs';


//===============================================================
// Shared Components
//===============================================================

import
{
    PageHeaderComponent
}
from '../../../../../shared/components/layout/page-header/page-header';

import
{
    CommandCenterComponent
}
from '../../../../../shared/components/utilities/command-center/command-center';

import
{
    PageCanvasComponent
}
from '../../../../../shared/components/layout/page-canvas/page-canvas';

import
{
    TextboxComponent
}
from '../../../../../shared/components/controls/textbox/textbox';

import
{
    DropdownComponent
}
from '../../../../../shared/components/controls/dropdown/dropdown';

import
{
    SearchDropdownComponent
}
from '../../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    ToastComponent
}
from '../../../../../shared/components/utilities/toast/toast';

import
{
    ToastService
}
from '../../../../../shared/components/utilities/toast/toast.service';

import
{
    ProgressDialogComponent
}
from '../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    ProgressDialogService
}
from '../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';


//===============================================================
// Models & Services
//===============================================================

import
{
    PartsOnboardingCategory,
    PartsOnboardingDefaults,
    PartsOnboardingRequest,
    PartsOnboardingResult,
    PartsOnboardingStatus,
    PartsOnboardingSubCategory,
    PartsOnboardingType
}
from '../../models/parts-onboarding.model';

import
{
    PartsOnboardingService
}
from '../../services/parts-onboarding.service';


//===============================================================
// One grid row (the cells as read; blank = the default)
//===============================================================

type RowStatus =
    PartsOnboardingStatus
    |
    'Pending';

type GridTab =
    'Ready'
    |
    'Links'
    |
    'Fix'
    |
    'Duplicates'
    |
    'All';

interface GridRow
{
    key: number;

    // Row number in the file / paste
    row: number;

    partNumber: string;

    name: string;

    unit: string;

    reorder: string;

    red: string;

    max: string;

    movement: string;

    remarks: string;

    status: RowStatus;

    message: string;

    code: string;

    editing: boolean;
}

// Columns of the template, in this order (also the order read
// when the rows have no heading)
type Column =
    'partNumber' | 'name' | 'unit' | 'reorder' | 'red' | 'max' | 'movement' | 'remarks';

const COLUMN_ORDER:
    Column[] =
    ['partNumber', 'name', 'unit', 'reorder', 'red', 'max', 'movement', 'remarks'];

// Heading names (letters only, lower case) -> column
const HEADINGS:
    Record<string, Column> =
    {
        partnumber:'partNumber', partno:'partNumber', part:'partNumber', partcode:'partNumber',
        partname:'name', accessoryname:'name', name:'name', productname:'name', itemname:'name', description:'name',
        unit:'unit', uom:'unit', units:'unit',
        reorder:'reorder', reorderlevel:'reorder', rol:'reorder',
        red:'red', redlevel:'red',
        max:'max', maxstock:'max', maxlevel:'max', maxstocklevel:'max', maximum:'max',
        movement:'movement', movementclass:'movement', moving:'movement',
        remarks:'remarks', remark:'remarks', notes:'remarks', note:'remarks'
    };

const MOVEMENT_LABELS:
    Record<string, string> =
    {
        SuperFast:'Super Fast Moving',
        Fast:'Fast Moving',
        Regular:'Regular Moving',
        Periodic:'Periodic Moving',
        Slow:'Slow Moving'
    };

const MAX_ROWS =
    1000;


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'parts-onboarding',

    standalone:true,

    imports:
    [
        CommonModule,
        FormsModule,
        RouterLink,
        PageHeaderComponent,
        CommandCenterComponent,
        PageCanvasComponent,
        TextboxComponent,
        DropdownComponent,
        SearchDropdownComponent,
        ToastComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./parts-onboarding.html',

    styleUrls:
    [
        './parts-onboarding.css'
    ]
})


//===============================================================
// Parts & Accessories Onboarding : many Spare Parts or
// Accessories into one Product Sub Category in one save (all or
// nothing), from an Excel / CSV file or cells pasted from Excel.
// A custom action page : no list, no own table.
//===============================================================

export class PartsOnboarding
implements OnInit
{
    private readonly onboardingService =
        inject(PartsOnboardingService);

    private readonly toast =
        inject(ToastService);

    private readonly progressDialog =
        inject(ProgressDialogService);

    private readonly cdr =
        inject(ChangeDetectorRef);


    //===========================================================
    // Lookups
    //===========================================================

    private defaults:
        PartsOnboardingDefaults | null =
        null;

    unitItems:
        any[] =
        [];

    movementItems:
        any[] =
        [];

    categoryItems:
        any[] =
        [];

    subCategoryItems:
        any[] =
        [];

    loadFailed =
        false;


    //===========================================================
    // Target and defaults
    //===========================================================

    productType:
        PartsOnboardingType =
        'SpareParts';

    categoryId:
        number | null =
        null;

    subCategoryId:
        number | null =
        null;

    defaultUnit =
        'Pcs';

    defaultMovement =
        'Slow';

    reorderText =
        '2';

    redText =
        '1';

    maxText =
        '3';


    //===========================================================
    // Source and grid
    //===========================================================

    rows:
        GridRow[] =
        [];

    sourceName =
        '';

    dragging =
        false;

    tab:
        GridTab =
        'All';

    analyzed =
        false;

    // A problem with the sub category itself (from Analyze)
    analysisMessage =
        '';

    isBusy =
        false;

    lastResult:
        PartsOnboardingResult | null =
        null;

    private rowKey =
        0;


    //===========================================================
    // Init
    //===========================================================

    ngOnInit():
        void
    {
        this.loadDefaults(true);
    }


    loadDefaults
    (
        firstLoad:
            boolean
    ):
        void
    {
        this.onboardingService
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    defaults
                ): void =>
                {
                    this.defaults =
                        defaults;

                    this.loadFailed =
                        false;

                    this.unitItems =
                        defaults.Units.map(u => ({ label:u, value:u }));

                    this.movementItems =
                        defaults.MovementClasses.map(m => ({ label:this.movementLabel(m), value:m }));

                    this.buildCategoryItems();

                    if
                    (
                        firstLoad
                    )
                    {
                        this.applyTypeDefaults();
                    }

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error('Load Parts Onboarding Defaults Error', error);

                    this.loadFailed =
                        true;

                    this.toast.error(
                        'Error',
                        'Failed to load the categories, units and movement classes.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // Target
    //===========================================================

    get isSpare():
        boolean
    {
        return this.productType === 'SpareParts';
    }

    get typeLabel():
        string
    {
        return this.isSpare ? 'Parts & Lubricants' : 'Accessories';
    }

    get nameLabel():
        string
    {
        return this.isSpare ? 'Part Name' : 'Accessory Name';
    }

    get category():
        PartsOnboardingCategory | null
    {
        return this.defaults?.Categories.find(
            c =>
                c.ProductCategoryId === Number(this.categoryId ?? 0)
        ) ?? null;
    }

    get subCategory():
        PartsOnboardingSubCategory | null
    {
        return this.category?.SubCategories.find(
            s =>
                s.ProductSubCategoryId === Number(this.subCategoryId ?? 0)
        ) ?? null;
    }

    private buildCategoryItems():
        void
    {
        const categories =
            (this.defaults?.Categories ?? [])
                .filter(c => c.ProductType === this.productType);

        this.categoryItems =
            categories.map(
                c =>
                ({
                    label:`${c.CategoryCode} - ${c.CategoryName}`,
                    value:c.ProductCategoryId
                })
            );

        // A category no longer listed : cleared
        if
        (
            this.categoryId
            &&
            !categories.some(c => c.ProductCategoryId === Number(this.categoryId))
        )
        {
            this.categoryId = null;
        }

        if
        (
            !this.categoryId
            &&
            categories.length === 1
        )
        {
            this.categoryId = categories[0].ProductCategoryId;
        }

        this.buildSubCategoryItems();
    }

    private buildSubCategoryItems():
        void
    {
        const subs =
            this.category?.SubCategories ?? [];

        this.subCategoryItems =
            subs.map(
                s =>
                ({
                    label:`${s.SubCategoryCode} - ${s.SubCategoryName}`,
                    value:s.ProductSubCategoryId,
                    badge:`${s.ItemCount} ${s.ItemCount === 1 ? 'item' : 'items'}`
                })
            );

        if
        (
            this.subCategoryId
            &&
            !subs.some(s => s.ProductSubCategoryId === Number(this.subCategoryId))
        )
        {
            this.subCategoryId = null;
        }
    }

    // Unit, movement and levels of the last saved item of the type
    private applyTypeDefaults():
        void
    {
        const d =
            this.isSpare ? this.defaults?.SpareParts : this.defaults?.Accessories;

        // Pcs unless changed on the page
        this.defaultUnit =
            'Pcs';

        this.defaultMovement =
            d?.MovementClass || 'Slow';

        this.reorderText =
            String(d?.ReorderLevel ?? 2);

        this.redText =
            String(d?.RedLevel ?? 1);

        this.maxText =
            String(d?.MaxStockLevel ?? 3);
    }

    setType
    (
        type:
            PartsOnboardingType
    ):
        void
    {
        if
        (
            this.isBusy
            ||
            this.productType === type
        )
        {
            return;
        }

        this.productType = type;

        this.categoryId = null;

        this.subCategoryId = null;

        this.lastResult = null;

        this.buildCategoryItems();

        this.applyTypeDefaults();

        this.invalidate();
    }

    onCategoryChange
    (
        value:
            any
    ):
        void
    {
        this.categoryId =
            value ? Number(value) : null;

        this.subCategoryId = null;

        this.buildSubCategoryItems();

        this.invalidate();
    }

    onSubCategoryChange
    (
        value:
            any
    ):
        void
    {
        this.subCategoryId =
            value ? Number(value) : null;

        this.invalidate();
    }

    onDefaultChange
    (
        which:
            'unit' | 'movement',

        value:
            any
    ):
        void
    {
        if (which === 'unit') { this.defaultUnit = String(value ?? ''); }

        if (which === 'movement') { this.defaultMovement = String(value ?? ''); }

        this.invalidate();
    }

    onLevelChange
    (
        which:
            'reorder' | 'red' | 'max',

        value:
            string | number
    ):
        void
    {
        const digits =
            String(value ?? '')
                .replace(/\D/g, '')
                .slice(0, 6);

        if (which === 'reorder') { this.reorderText = digits; }

        if (which === 'red') { this.redText = digits; }

        if (which === 'max') { this.maxText = digits; }

        this.invalidate();
    }


    //===========================================================
    // Any change : the rows must be analysed again
    //===========================================================

    private invalidate():
        void
    {
        if
        (
            !this.analyzed
            &&
            this.rows.every(r => r.status === 'Pending')
        )
        {
            return;
        }

        this.analyzed = false;

        this.analysisMessage = '';

        this.rows.forEach(
            r =>
            {
                r.status = 'Pending';
                r.message = 'Not checked';
                r.code = '';
            });
    }


    //===========================================================
    // Source : file, drop or paste
    //===========================================================

    onFile
    (
        event:
            Event
    ):
        void
    {
        const input =
            event.target as HTMLInputElement;

        const file =
            input.files?.[0];

        input.value = '';

        if
        (
            file
        )
        {
            this.readFile(file);
        }
    }

    onDrop
    (
        event:
            DragEvent
    ):
        void
    {
        event.preventDefault();

        this.dragging = false;

        const file =
            event.dataTransfer?.files?.[0];

        if
        (
            file
        )
        {
            this.readFile(file);
        }
    }

    onDragOver
    (
        event:
            DragEvent
    ):
        void
    {
        event.preventDefault();

        this.dragging = true;
    }

    onDragLeave():
        void
    {
        this.dragging = false;
    }

    // Ctrl+V of cells copied from Excel (tab separated) or CSV
    onPaste
    (
        event:
            ClipboardEvent
    ):
        void
    {
        event.preventDefault();

        const text =
            event.clipboardData?.getData('text/plain') ?? '';

        if
        (
            !text.trim()
        )
        {
            return;
        }

        this.readRows(parseRows(text), 'Pasted from Excel');
    }

    private async readFile
    (
        file:
            File
    ):
        Promise<void>
    {
        try
        {
            if
            (
                /\.(xlsx|xlsm|xls|ods)$/i.test(file.name)
            )
            {
                const XLSX =
                    await import('xlsx');

                const book =
                    XLSX.read(await file.arrayBuffer(), { type:'array' });

                const sheet =
                    book.Sheets[book.SheetNames[0]];

                const rows =
                    XLSX.utils.sheet_to_json<string[]>(sheet, { header:1, raw:false, defval:'' })
                        .map(row => row.map(x => String(x ?? '')));

                this.readRows(rows, file.name);
            }
            else
            {
                this.readRows(parseRows(await file.text()), file.name);
            }
        }
        catch
        {
            this.toast.error('Not Read', `${file.name} could not be read. Use an .xlsx, .xls or .csv file, or paste the rows.`);
        }

        this.cdr.detectChanges();
    }

    private readRows
    (
        source:
            string[][],

        name:
            string
    ):
        void
    {
        const lines =
            source.map(
                (cells, index) =>
                ({
                    cells:cells.map(x => String(x ?? '').trim()),
                    row:index + 1
                }))
            .filter(x => x.cells.some(v => !!v));

        if
        (
            lines.length === 0
        )
        {
            this.toast.error('Nothing Read', 'No rows were found.');

            return;
        }

        // A heading row : columns by their names (at least two
        // known names), else the template's order
        const names =
            lines[0].cells.map(x => x.toLowerCase().replace(/[^a-z]/g, ''));

        const known =
            names.filter(x => !!HEADINGS[x]).length;

        const at:
            Partial<Record<Column, number>> = {};

        let body =
            lines;

        if
        (
            known >= 2
        )
        {
            names.forEach(
                (n, i) =>
                {
                    const column =
                        HEADINGS[n];

                    if (column && at[column] === undefined) { at[column] = i; }
                });

            body = lines.slice(1);
        }
        else
        {
            COLUMN_ORDER.forEach((c, i) => at[c] = i);
        }

        if
        (
            body.length > MAX_ROWS
        )
        {
            this.toast.error('Too Many Rows', `At most ${MAX_ROWS} rows can be onboarded at a time. Split the file.`);

            return;
        }

        const cell =
            (cells: string[], column: Column): string =>
            {
                const i =
                    at[column];

                return i === undefined ? '' : (cells[i] ?? '');
            };

        this.rows =
            body.map(
                line =>
                ({
                    key:++this.rowKey,
                    row:line.row,
                    partNumber:cell(line.cells, 'partNumber'),
                    name:cell(line.cells, 'name'),
                    unit:cell(line.cells, 'unit'),
                    reorder:cell(line.cells, 'reorder'),
                    red:cell(line.cells, 'red'),
                    max:cell(line.cells, 'max'),
                    movement:cell(line.cells, 'movement'),
                    remarks:cell(line.cells, 'remarks'),
                    status:'Pending',
                    message:'Not checked',
                    code:'',
                    editing:false
                }));

        this.sourceName =
            `${name} · ${this.rows.length} ${this.rows.length === 1 ? 'row' : 'rows'}`;

        this.analyzed = false;

        this.analysisMessage = '';

        this.lastResult = null;

        this.tab = 'All';

        if
        (
            this.rows.length === 0
        )
        {
            this.toast.error('Nothing Read', 'Only a heading row was found.');
        }
    }

    removeSource():
        void
    {
        if (this.isBusy) { return; }

        this.rows = [];

        this.sourceName = '';

        this.analyzed = false;

        this.analysisMessage = '';
    }


    //===========================================================
    // Grid
    //===========================================================

    resolvedUnit
    (
        r:
            GridRow
    ):
        string
    {
        return r.unit || this.defaultUnit;
    }

    resolvedLevel
    (
        value:
            string,

        fallback:
            string
    ):
        string
    {
        return value !== '' ? value : (fallback || '0');
    }

    resolvedMovement
    (
        r:
            GridRow
    ):
        string
    {
        return r.movement || this.defaultMovement;
    }

    movementLabel
    (
        value:
            string
    ):
        string
    {
        return MOVEMENT_LABELS[value] ?? value;
    }

    // Status chip text
    statusText
    (
        r:
            GridRow
    ):
        string
    {
        switch (r.status)
        {
            case 'Ready': return 'Ready';
            case 'Duplicate': return 'Duplicate in the file';
            case 'Exists': return 'Already exists';
            case 'Link': return 'Will link';
            case 'Invalid': return 'Needs fixing';
            default: return 'Not checked';
        }
    }

    private inTab
    (
        r:
            GridRow,

        tab:
            GridTab
    ):
        boolean
    {
        switch (tab)
        {
            case 'Ready': return r.status === 'Ready';
            // Saved under another model : linked here, not made again
            case 'Links': return r.status === 'Link';
            case 'Fix': return r.status === 'Invalid';
            case 'Duplicates': return r.status === 'Duplicate' || r.status === 'Exists';
            default: return true;
        }
    }

    // Cached : the template sees the same arrays until the rows,
    // their statuses or the tab change
    private viewKey =
        '';

    private tabsCache:
        { id: GridTab; label: string; icon: string; count: number }[] =
        [];

    private visibleCache:
        GridRow[] =
        [];

    private refreshView():
        void
    {
        const key =
            this.tab + '|' + this.rows.map(r => r.key + r.status + (r.editing ? 'e' : '')).join(',');

        if
        (
            key === this.viewKey
        )
        {
            return;
        }

        this.viewKey = key;

        this.tabsCache =
        [
            { id:'Ready', label:'Ready', icon:'fas fa-circle-check', count:this.count('Ready') },
            { id:'Links', label:'Links', icon:'fas fa-link', count:this.count('Links') },
            { id:'Fix', label:'Needs fixing', icon:'fas fa-screwdriver-wrench', count:this.count('Fix') },
            { id:'Duplicates', label:'Duplicates', icon:'fas fa-clone', count:this.count('Duplicates') },
            { id:'All', label:'All', icon:'fas fa-layer-group', count:this.rows.length }
        ];

        this.visibleCache =
            this.rows.filter(r => this.inTab(r, this.tab));
    }

    get tabs():
        { id: GridTab; label: string; icon: string; count: number }[]
    {
        this.refreshView();

        return this.tabsCache;
    }

    count
    (
        tab:
            GridTab
    ):
        number
    {
        return this.rows.filter(r => this.inTab(r, tab)).length;
    }

    get visibleRows():
        GridRow[]
    {
        this.refreshView();

        return this.visibleCache;
    }

    // New items to create
    get readyCount():
        number
    {
        return this.rows.filter(r => r.status === 'Ready').length;
    }

    // Items saved under another model, to link here
    get linkCount():
        number
    {
        return this.rows.filter(r => r.status === 'Link').length;
    }

    removeRow
    (
        r:
            GridRow
    ):
        void
    {
        if (this.isBusy) { return; }

        this.rows =
            this.rows.filter(x => x.key !== r.key);

        // Duplicates / codes depend on the other rows
        this.invalidate();

        if
        (
            this.rows.length === 0
        )
        {
            this.sourceName = '';
        }
    }

    // Double-click : fix the row in place
    editRow
    (
        r:
            GridRow
    ):
        void
    {
        if (this.isBusy) { return; }

        this.rows.forEach(x => x.editing = x.key === r.key);
    }

    // Unit picked on the grid (no double-click needed)
    unitOptions
    (
        r:
            GridRow
    ):
        string[]
    {
        const units =
            this.defaults?.Units ?? [];

        const current =
            this.resolvedUnit(r);

        // A unit read from the file that is not on the list stays
        // visible (it shows as Needs fixing until changed)
        return units.some(u => u.toLowerCase() === current.toLowerCase())
            ? units
            : [current, ...units];
    }

    setUnit
    (
        r:
            GridRow,

        value:
            string
    ):
        void
    {
        r.unit =
            String(value ?? '');

        this.invalidate();
    }

    endEdit
    (
        r:
            GridRow
    ):
        void
    {
        r.editing = false;

        r.partNumber = r.partNumber.trim();

        r.name = r.name.trim();

        r.reorder = r.reorder.replace(/\D/g, '');

        r.red = r.red.replace(/\D/g, '');

        r.max = r.max.replace(/\D/g, '');

        this.invalidate();
    }

    onEditKey
    (
        event:
            KeyboardEvent,

        r:
            GridRow
    ):
        void
    {
        if
        (
            event.key === 'Enter'
            ||
            event.key === 'Escape'
        )
        {
            event.preventDefault();

            this.endEdit(r);
        }
    }

    trackRow
    (
        _index:
            number,

        r:
            GridRow
    ):
        number
    {
        return r.key;
    }


    //===========================================================
    // Request (blank cells take the defaults)
    //===========================================================

    private buildRequest
    (
        rows:
            GridRow[]
    ):
        PartsOnboardingRequest
    {
        return {
            ProductType:this.productType,
            ProductCategoryId:Number(this.categoryId ?? 0),
            ProductSubCategoryId:Number(this.subCategoryId ?? 0),
            Rows:
                rows.map(
                    r =>
                    ({
                        Row:r.row,
                        PartNumber:r.partNumber,
                        Name:r.name,
                        Unit:this.resolvedUnit(r),
                        ReorderLevel:this.resolvedLevel(r.reorder, this.reorderText),
                        RedLevel:this.resolvedLevel(r.red, this.redText),
                        MaxStockLevel:this.resolvedLevel(r.max, this.maxText),
                        MovementClass:this.resolvedMovement(r),
                        Remarks:r.remarks
                    }))
        };
    }

    private checkTarget():
        boolean
    {
        if
        (
            !this.category
        )
        {
            this.toast.error('Validation', 'Product Category is required.');

            return false;
        }

        if
        (
            !this.subCategory
        )
        {
            this.toast.error('Validation', 'Sub Category is required.');

            return false;
        }

        if
        (
            this.rows.length === 0
        )
        {
            this.toast.error('Validation', 'Choose a file or paste the rows first.');

            return false;
        }

        return true;
    }

    private errorText
    (
        error:
            any,

        fallback:
            string
    ):
        string
    {
        return typeof error?.error === 'string' && error.error
            ? error.error
            : fallback;
    }


    //===========================================================
    // Progress for one long request : rises toward 95 % over the
    // expected time, then 100 % when the answer arrives. The stop
    // function ends it (a short pause at 100 % on success).
    //===========================================================

    private startProgress
    (
        expectedMs:
            number
    ):
        (success: boolean) => Promise<void>
    {
        const started =
            Date.now();

        const timer =
            setInterval(
                () =>
                {
                    const t =
                        (Date.now() - started) / Math.max(300, expectedMs);

                    this.progressDialog.update(
                        Math.min(95, Math.round(95 * (1 - Math.exp(-2.2 * t)))));
                },
                150);

        return async (success: boolean): Promise<void> =>
        {
            clearInterval(timer);

            if
            (
                success
            )
            {
                this.progressDialog.update(100, 'Done');

                await new Promise(resolve => setTimeout(resolve, 350));
            }
        };
    }


    //===========================================================
    // Analyze
    //===========================================================

    async onAnalyze():
        Promise<void>
    {
        if
        (
            this.isBusy
            ||
            !this.checkTarget()
        )
        {
            return;
        }

        this.rows.forEach(r => { if (r.editing) { this.endEdit(r); } });

        this.isBusy = true;

        this.progressDialog.show(
            'Analyzing',
            `Checking ${this.rows.length} row(s)...`
        );

        const stopProgress =
            this.startProgress(400 + this.rows.length * 4);

        try
        {
            const analysis =
                await firstValueFrom(
                    this.onboardingService.analyze(
                        this.buildRequest(this.rows)));

            this.rows.forEach(
                (r, i) =>
                {
                    const c =
                        analysis.Rows[i];

                    r.status = c?.Status ?? 'Invalid';

                    r.message = c?.Message ?? 'Not checked';

                    r.code = c?.ProductCode ?? '';
                });

            await stopProgress(true);

            this.analyzed = true;

            this.analysisMessage = analysis.Message;

            this.tab =
                this.count('Fix') > 0 ? 'Fix' : this.count('Duplicates') > 0 ? 'Duplicates' : this.count('Ready') > 0 ? 'Ready' : this.count('Links') > 0 ? 'Links' : 'All';

            if
            (
                analysis.Message
            )
            {
                this.toast.error('Sub Category', analysis.Message);
            }
        }
        catch (error: any)
        {
            await stopProgress(false);

            console.error('Parts Onboarding Analyze Error', error);

            this.toast.error('Not Checked', this.errorText(error, 'The rows could not be checked.'));
        }
        finally
        {
            this.progressDialog.close();

            this.isBusy = false;

            this.cdr.detectChanges();
        }
    }


    //===========================================================
    // Onboard : the Ready rows (the server checks them again)
    //===========================================================

    async onOnboard():
        Promise<void>
    {
        if
        (
            this.isBusy
            ||
            !this.checkTarget()
        )
        {
            return;
        }

        if
        (
            !this.analyzed
        )
        {
            this.toast.error('Validation', 'Analyze the rows first.');

            return;
        }

        // New items and links (the server checks both again)
        const ready =
            this.rows.filter(r => r.status === 'Ready' || r.status === 'Link');

        if
        (
            ready.length === 0
        )
        {
            this.toast.error('Validation', 'No row is Ready or to be linked.');

            return;
        }

        const sub =
            this.subCategory;

        this.isBusy = true;

        this.progressDialog.show(
            'Onboarding',
            `Creating ${this.readyCount} ${this.isSpare ? 'spare part(s)' : 'accessory(ies)'} and linking ${this.linkCount} in ${sub?.SubCategoryName ?? ''}...`
        );

        // One request : the bar follows the expected time (about
        // 0.12 s per item) and completes when the server answers
        const stopProgress =
            this.startProgress(800 + this.readyCount * 120 + this.linkCount * 15);

        try
        {
            const result =
                await firstValueFrom(
                    this.onboardingService.onboard(
                        this.buildRequest(ready)));

            await stopProgress(true);

            const done =
                new Set(ready.map(r => r.key));

            // The created rows leave the grid; the rest stay to be
            // fixed and analysed again (the codes moved on)
            this.rows =
                this.rows.filter(r => !done.has(r.key));

            this.analyzed = false;

            this.invalidate();

            this.rows.forEach(r => { r.status = 'Pending'; r.message = 'Not checked'; r.code = ''; });

            this.sourceName =
                this.rows.length > 0
                    ? `${this.rows.length} ${this.rows.length === 1 ? 'row' : 'rows'} left`
                    : '';

            this.tab = 'All';

            this.lastResult = result;

            this.toast.success(
                'Onboarded',
                `${result.Items.length} item(s) created and ${result.Linked.length} linked in ${result.SubCategoryName}.`
            );

            // Item counts and starting levels have changed
            this.loadDefaults(false);
        }
        catch (error: any)
        {
            await stopProgress(false);

            console.error('Parts Onboarding Error', error);

            this.toast.error('Not Saved', this.errorText(error, 'The items could not be onboarded. Nothing was saved.'));
        }
        finally
        {
            this.progressDialog.close();

            this.isBusy = false;

            this.cdr.detectChanges();
        }
    }


    //===========================================================
    // Template (.xlsx; CSV when the Excel library is missing)
    //   Sheet 1 : the columns to fill
    //   Sheet 2 : the items already in the sub category
    //   Sheet 3 : allowed units and movement classes
    //===========================================================

    async onTemplate():
        Promise<void>
    {
        const heading =
            ['Part Number', this.nameLabel, 'Unit', 'Re-order', 'Red', 'Max', 'Movement Class', 'Remarks'];

        let existing:
            (string | number)[][] = [];

        const sub =
            this.subCategory;

        if
        (
            sub
        )
        {
            try
            {
                const items =
                    await firstValueFrom(
                        this.onboardingService.getExisting(this.productType, sub.ProductSubCategoryId));

                existing =
                    items.map(x => [x.ProductCode, x.PartNumber, x.Name, x.Unit, x.ReorderLevel, x.RedLevel, x.MaxStockLevel, this.movementLabel(x.MovementClass)]);
            }
            catch
            {
                existing = [];
            }
        }

        const name =
            `${this.isSpare ? 'Spare Parts' : 'Accessories'} Onboarding${sub ? ' - ' + sub.SubCategoryCode : ''} - Template`;

        try
        {
            const XLSX =
                await import('xlsx');

            const book =
                XLSX.utils.book_new();

            const items =
                XLSX.utils.aoa_to_sheet([heading]);

            items['!cols'] = [{ wch:20 }, { wch:44 }, { wch:9 }, { wch:10 }, { wch:8 }, { wch:8 }, { wch:18 }, { wch:30 }];

            XLSX.utils.book_append_sheet(book, items, 'Items');

            if
            (
                sub
            )
            {
                const ref =
                    XLSX.utils.aoa_to_sheet([
                        ['Product Code', 'Part Number', this.nameLabel, 'Unit', 'Re-order', 'Red', 'Max', 'Movement Class'],
                        ...existing
                    ]);

                ref['!cols'] = [{ wch:20 }, { wch:20 }, { wch:44 }, { wch:9 }, { wch:10 }, { wch:8 }, { wch:8 }, { wch:18 }];

                XLSX.utils.book_append_sheet(book, ref, 'Already Saved');
            }

            const units =
                this.defaults?.Units ?? [];

            const moves =
                (this.defaults?.MovementClasses ?? []).map(m => this.movementLabel(m));

            const lists =
                XLSX.utils.aoa_to_sheet([
                    ['Unit', 'Movement Class'],
                    ...Array.from({ length:Math.max(units.length, moves.length) }, (_, i) => [units[i] ?? '', moves[i] ?? ''])
                ]);

            lists['!cols'] = [{ wch:12 }, { wch:20 }];

            XLSX.utils.book_append_sheet(book, lists, 'Lists');

            XLSX.writeFile(book, `${name}.xlsx`);
        }
        catch
        {
            // No Excel library : the columns as CSV
            const blob =
                new Blob(['﻿' + heading.map(csvCell).join(',') + '\r\n'], { type:'text/csv;charset=utf-8' });

            const url =
                URL.createObjectURL(blob);

            const link =
                document.createElement('a');

            link.href = url;

            link.download = `${name}.csv`;

            document.body.appendChild(link);

            link.click();

            link.remove();

            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    }


    //===========================================================
    // Clear
    //===========================================================

    onClear():
        void
    {
        if (this.isBusy) { return; }

        this.rows = [];

        this.sourceName = '';

        this.analyzed = false;

        this.analysisMessage = '';

        this.lastResult = null;

        this.tab = 'All';

        this.applyTypeDefaults();
    }


    get listLink():
        string
    {
        return this.lastResult?.ProductType === 'Accessories'
            ? '/settings/product-settings/accessories/list'
            : '/settings/product-settings/spare-parts/list';
    }
}


//===============================================================
// Helpers
//===============================================================

function csvCell
(
    value:
        string
):
    string
{
    return /[",\r\n]/.test(value)
        ? `"${value.replace(/"/g, '""')}"`
        : value;
}

// Pasted Excel rows (tabs) or CSV (commas, quotes)
function parseRows
(
    text:
        string
):
    string[][]
{
    const source =
        String(text ?? '').replace(/^﻿/, '');

    if
    (
        source.includes('\t')
    )
    {
        return source
            .replace(/\r/g, '')
            .split('\n')
            .map(x => x.split('\t'));
    }

    const rows:
        string[][] = [];

    let row:
        string[] = [];

    let cell =
        '';

    let quoted =
        false;

    for (let i = 0; i < source.length; i++)
    {
        const ch =
            source[i];

        if
        (
            quoted
        )
        {
            if (ch === '"' && source[i + 1] === '"') { cell += '"'; i++; }
            else if (ch === '"') { quoted = false; }
            else { cell += ch; }

            continue;
        }

        if (ch === '"') { quoted = true; }
        else if (ch === ',') { row.push(cell); cell = ''; }
        else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
        else if (ch !== '\r') { cell += ch; }
    }

    if
    (
        cell !== ''
        ||
        row.length > 0
    )
    {
        row.push(cell);

        rows.push(row);
    }

    return rows;
}
