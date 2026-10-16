//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    OnDestroy,
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
    ActivatedRoute,
    Router
}
from '@angular/router';

import
{
    FormsModule
}
from '@angular/forms';

import
{
    HttpErrorResponse
}
from '@angular/common/http';

import
{
    Observable,
    defer,
    timer,
    throwError,
    delayWhen,
    catchError,
    switchMap
}
from 'rxjs';

//===============================================================
// Shared Components
//===============================================================

import
{
    PageHeaderComponent
}
from '../../../../../../shared/components/layout/page-header/page-header';

import
{
    PageToolbarComponent
}
from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';

import
{
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

import
{
    ControlTabsComponent,
    ControlTab
}
from '../../../../../../shared/components/controls/control-tabs/control-tabs';

import
{
    PageCanvasComponent
}
from '../../../../../../shared/components/layout/page-canvas/page-canvas';

import
{
    FormGridComponent
}
from '../../../../../../shared/components/layout/form-grid/form-grid';

import
{
    FormSectionComponent
}
from '../../../../../../shared/components/layout/form-section/form-section';

//===============================================================
// Form Controls
//===============================================================

import
{
    TextboxComponent
}
from '../../../../../../shared/components/controls/textbox/textbox';

import
{
    TextareaComponent
}
from '../../../../../../shared/components/controls/textarea/textarea';

import
{
    DropdownComponent
}
from '../../../../../../shared/components/controls/dropdown/dropdown';

import
{
    DatepickerComponent
}
from '../../../../../../shared/components/controls/datepicker/datepicker';

//===============================================================
// Utilities
//===============================================================

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';

import
{
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

import
{
    ConfirmDialogService
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

import
{
    ConfirmDialogComponent
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';

import
{
    ProgressDialogComponent
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    ProgressDialogService
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';

//===============================================================
// Models & Services
//===============================================================

import
{
    FinancialYear,
    CreateFinancialYear,
    UpdateFinancialYear
}
from '../../../models/financial-years.model';

import
{
    FinancialYearsService
}
from '../../../services/financial-years.service';

//===============================================================
// Constants
//===============================================================

// Default financial year : July – June (Bangladesh).
// Month number (1 – 12) a new year starts on when there is no
// previous year to follow.
const DEFAULT_START_MONTH:
    number =
    7;

// Normal length of a financial year.
const DEFAULT_YEAR_MONTHS:
    number =
    12;

// Longest allowed year (a longer first / transition year).
const MAX_YEAR_MONTHS:
    number =
    18;

// Fixed prefix of the generated Financial Year Name.
const FY_NAME_PREFIX:
    string =
    'FY';

//===============================================================
// Date Helpers (plain dates "YYYY-MM-DD", no time zone)
//===============================================================

const DATE_PATTERN:
    RegExp =
    /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDate
(
    value:
        string | null | undefined
):
    { y: number; m: number; d: number } | null
{
    const match =
        DATE_PATTERN.exec((value ?? '').trim());

    if
    (
        !match
    )
    {
        return null;
    }

    const y =
        Number(match[1]);

    const m =
        Number(match[2]);

    const d =
        Number(match[3]);

    // Reject impossible dates such as 2026-02-30
    const check =
        new Date(Date.UTC(y, m - 1, d));

    if
    (
        check.getUTCFullYear() !== y
        ||
        check.getUTCMonth() !== m - 1
        ||
        check.getUTCDate() !== d
    )
    {
        return null;
    }

    return { y, m, d };
}

function toIsoDate
(
    utc:
        number
):
    string
{
    const date =
        new Date(utc);

    const y =
        date.getUTCFullYear();

    const m =
        String(date.getUTCMonth() + 1).padStart(2, '0');

    const d =
        String(date.getUTCDate()).padStart(2, '0');

    return `${y}-${m}-${d}`;
}

// "2026-06-30" + 1 day → "2026-07-01"
function addDays
(
    value:
        string,
    days:
        number
):
    string
{
    const p =
        parseDate(value);

    return p
        ? toIsoDate(Date.UTC(p.y, p.m - 1, p.d + days))
        : '';
}

// Start "2026-07-01" → End "2027-06-30" (start + N months − 1 day)
function defaultEndDate
(
    start:
        string,
    months:
        number
):
    string
{
    const p =
        parseDate(start);

    return p
        ? toIsoDate(Date.UTC(p.y, p.m - 1 + months, p.d - 1))
        : '';
}

// Whole months covered, start and end inclusive (Jul 1 – Jun 30 = 12)
function monthsBetween
(
    start:
        string,
    end:
        string
):
    number
{
    const a =
        parseDate(start);

    const b =
        parseDate(end);

    if
    (
        !a
        ||
        !b
    )
    {
        return 0;
    }

    const next =
        new Date(Date.UTC(b.y, b.m - 1, b.d + 1));

    return (
        (next.getUTCFullYear() - a.y) * 12
        +
        (next.getUTCMonth() - (a.m - 1))
    );
}

// Total days, start and end inclusive
function daysBetween
(
    start:
        string,
    end:
        string
):
    number
{
    const a =
        parseDate(start);

    const b =
        parseDate(end);

    if
    (
        !a
        ||
        !b
    )
    {
        return 0;
    }

    return Math.round(
        (
            Date.UTC(b.y, b.m - 1, b.d)
            -
            Date.UTC(a.y, a.m - 1, a.d)
        )
        / 86400000
    ) + 1;
}

// Today's date in local time as "YYYY-MM-DD"
function todayIso():
    string
{
    const now =
        new Date();

    return toIsoDate(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    );
}

// "2026-07-01" → local Date (midnight), as app-datepicker uses
function isoToDate
(
    value:
        string
):
    Date | null
{
    const p =
        parseDate(value);

    return p
        ? new Date(p.y, p.m - 1, p.d)
        : null;
}

// local Date from app-datepicker → "2026-07-01"
function dateToIso
(
    value:
        Date | null | undefined
):
    string
{
    if
    (
        !(value instanceof Date)
        ||
        isNaN(value.getTime())
    )
    {
        return '';
    }

    return toIsoDate(
        Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
    );
}

//===============================================================
// Case-Insensitive Field Reader
//===============================================================

function readField
(
    item:
        any,
    name:
        string
):
    any
{
    if
    (
        item == null
        ||
        typeof item !== 'object'
    )
    {
        return undefined;
    }

    if
    (
        name in item
    )
    {
        return item[name];
    }

    const target =
        name.toLowerCase();

    const key =
        Object.keys(item).find
        (
            k =>
                k.toLowerCase() ===
                target
        );

    return key !== undefined
        ? item[key]
        : undefined;
}

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'financial-years-form',

    standalone:true,

    imports:
    [
        CommonModule,
        FormsModule,

        //=======================================================
        // Layout
        //=======================================================

        PageHeaderComponent,
        PageToolbarComponent,
        CommandCenterComponent,
        ControlTabsComponent,
        PageCanvasComponent,
        FormGridComponent,
        FormSectionComponent,

        //=======================================================
        // Form Controls
        //=======================================================

        TextboxComponent,
        TextareaComponent,
        DropdownComponent,
        DatepickerComponent,

        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./financial-years-form.html',

    styleUrls:
    [
        './financial-years-form.css'
    ]
})

//===============================================================
// Financial Years Form
//===============================================================

export class FinancialYearsForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly financialYearsService =
        inject(FinancialYearsService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly progressDialog =
        inject(ProgressDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    //===========================================================
    // Progress Configuration
    //===========================================================

    private readonly MIN_PROGRESS_MS:
        number =
        5000;

    private readonly PROGRESS_TICK_MS:
        number =
        100;

    private readonly PROGRESS_CEILING:
        number =
        90;

    private readonly PROGRESS_COMPLETE_HOLD_MS:
        number =
        600;

    private progressTimer?:
        number;

    private progressValue:
        number =
        0;

    // Prevents double submit while Save / Update is running
    isSaving:
        boolean =
        false;

    //===========================================================
    // Mode
    //===========================================================

    mode:
        'add' | 'edit' | 'view' =
        'add';

    entityId:
        number =
        0;

    //===========================================================
    // Page Header
    //===========================================================

    pageTitle:
        string =
        'Financial Year';

    entityName:
        string =
        'Financial Year';

    //===========================================================
    // Selected Tab
    //===========================================================

    selectedTab:
        string =
        'general';

    //===========================================================
    // Tabs
    //===========================================================

    get tabs():
        ControlTab[]
    {
        return [
            {
                id:'general',
                label:this.tabTitle
            }
        ];
    }

    //===========================================================
    // Tab Title
    //===========================================================

    get tabTitle():
        string
    {
        switch
        (
            this.mode
        )
        {
            case 'add':
                return `Add ${this.entityName}`;

            case 'edit':
                return `Update ${this.entityName}`;

            case 'view':
                return `View ${this.entityName}`;

            default:
                return this.entityName;
        }
    }

    //===========================================================
    // Dropdown Items
    //===========================================================

    statusItems:
        any[] =
    [
        { label:'Active', value:true },
        { label:'Inactive', value:false }
    ];

    yesNoItems:
        any[] =
    [
        { label:'Yes', value:true },
        { label:'No', value:false }
    ];

    yearStatusItems:
        any[] =
    [
        { label:'Open', value:'Open' },
        { label:'Closed', value:'Closed' },
        { label:'Locked', value:'Locked' }
    ];

    //===========================================================
    // Existing Years (overlap check & add-mode defaults)
    //===========================================================

    private existingYears:
        FinancialYear[] =
        [];

    private yearsLoaded:
        boolean =
        false;

    //===========================================================
    // End Date Edited By User
    //
    // While false, End Date follows Start Date automatically
    // (Start + 12 months − 1 day).
    //===========================================================

    private endDateTouched:
        boolean =
        false;

    //===========================================================
    // Datepicker Values
    //
    // app-datepicker works with Date objects; the entity keeps
    // "YYYY-MM-DD". Kept as fields (not getters) so the same
    // Date instance is bound on every change detection.
    //===========================================================

    startDateValue:
        Date | null =
        null;

    endDateValue:
        Date | null =
        null;

    private syncDateValues():
        void
    {
        if
        (
            dateToIso(this.startDateValue) !== this.entity.StartDate
        )
        {
            this.startDateValue =
                isoToDate(
                    this.entity.StartDate
                );
        }

        if
        (
            dateToIso(this.endDateValue) !== this.entity.EndDate
        )
        {
            this.endDateValue =
                isoToDate(
                    this.entity.EndDate
                );
        }
    }

    //===========================================================
    // Entity
    //===========================================================

    entity:
        FinancialYear =
        this.createEmptyEntity();

    //===========================================================
    // Form State
    //===========================================================

    private originalEntity:
        string =
        '';

    hasChanges:
        boolean =
        false;

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.initializeMode();

        this.loadExistingYears();
    }

    //===========================================================
    // Destroy
    //===========================================================

    ngOnDestroy():
        void
    {
        this.clearProgressTimer();

        if
        (
            this.isSaving
        )
        {
            this.progressDialog.close();
        }
    }

    //===========================================================
    // Field Helpers
    //===========================================================

    private text
    (
        item:
            any,
        name:
            string
    ):
        string
    {
        return String(
            readField(item, name)
            ??
            ''
        ).trim();
    }

    //===========================================================
    // Empty Entity
    //===========================================================

    private createEmptyEntity():
        FinancialYear
    {
        return {
            FinancialYearId:0,
            FinancialYearCode:'',
            FinancialYearName:'',
            StartDate:'',
            EndDate:'',
            IsCurrent:false,
            YearStatus:'Open',
            Remarks:'',
            Status:true
        };
    }

    //===========================================================
    // Duration Text (shown under the dates)
    //===========================================================

    get durationText():
        string
    {
        const months =
            monthsBetween(
                this.entity.StartDate,
                this.entity.EndDate
            );

        const days =
            daysBetween(
                this.entity.StartDate,
                this.entity.EndDate
            );

        if
        (
            days <= 0
        )
        {
            return '';
        }

        return `${months} month${months === 1 ? '' : 's'} · ${days} days`;
    }

    get durationIsValid():
        boolean
    {
        const months =
            monthsBetween(
                this.entity.StartDate,
                this.entity.EndDate
            );

        return months >= 1
            &&
            months <= MAX_YEAR_MONTHS;
    }

    //===========================================================
    // Build Financial Year Name
    //
    // FY 2026-2027  (crosses a calendar year)
    // FY 2026       (starts and ends in the same year)
    // Returns '' until both dates are valid.
    //===========================================================

    private buildFinancialYearName():
        string
    {
        const start =
            parseDate(
                this.entity.StartDate
            );

        const end =
            parseDate(
                this.entity.EndDate
            );

        if
        (
            !start
            ||
            !end
        )
        {
            return '';
        }

        return start.y === end.y
            ? `${FY_NAME_PREFIX} ${start.y}`
            : `${FY_NAME_PREFIX} ${start.y}-${end.y}`;
    }

    //===========================================================
    // Refresh Generated Name
    //===========================================================

    private refreshGeneratedName():
        void
    {
        this.entity.FinancialYearName =
            this.buildFinancialYearName();
    }

    //===========================================================
    // Start Date Changed
    //===========================================================

    onStartDateChange
    (
        value:
            Date
    ):
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }

        this.entity.StartDate =
            dateToIso(value);

        if
        (
            !this.endDateTouched
            &&
            parseDate(this.entity.StartDate)
        )
        {
            this.entity.EndDate =
                defaultEndDate(
                    this.entity.StartDate,
                    DEFAULT_YEAR_MONTHS
                );
        }

        this.refreshGeneratedName();

        this.syncDateValues();

        this.onValueChange();
    }

    //===========================================================
    // End Date Changed
    //===========================================================

    onEndDateChange
    (
        value:
            Date
    ):
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }

        this.entity.EndDate =
            dateToIso(value);

        this.endDateTouched =
            true;

        this.refreshGeneratedName();

        this.syncDateValues();

        this.onValueChange();
    }

    //===========================================================
    // Reset End Date To 12 Months
    //===========================================================

    resetEndDate():
        void
    {
        if
        (
            this.isViewMode
            ||
            this.isSaving
            ||
            !parseDate(this.entity.StartDate)
        )
        {
            return;
        }

        this.endDateTouched =
            false;

        this.entity.EndDate =
            defaultEndDate(
                this.entity.StartDate,
                DEFAULT_YEAR_MONTHS
            );

        this.refreshGeneratedName();

        this.syncDateValues();

        this.onValueChange();
    }

    //===========================================================
    // Year Status Changed
    //
    // A Closed / Locked year cannot be the current year.
    //===========================================================

    onYearStatusChange():
        void
    {
        if
        (
            this.entity.YearStatus !== 'Open'
            &&
            this.entity.IsCurrent
        )
        {
            this.entity.IsCurrent =
                false;

            this.toast.info(
                'Current Year',
                `A ${this.entity.YearStatus.toLowerCase()} year cannot be the current year. Current Year was set to No.`
            );
        }

        this.onValueChange();
    }

    //===========================================================
    // Load Existing Years
    //===========================================================

    private loadExistingYears():
        void
    {
        this.financialYearsService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        FinancialYear[]
                ):
                    void =>
                {
                    this.existingYears =
                        response ?? [];

                    this.yearsLoaded =
                        true;

                    this.applyAddDefaults();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Financial Years Error:',
                        error
                    );

                    this.existingYears =
                        [];

                    this.yearsLoaded =
                        false;

                    this.toast.error(
                        'Error',
                        'Failed to load existing financial years. Overlap will be checked on save.'
                    );

                    this.applyAddDefaults();
                }
            });
    }

    //===========================================================
    // Apply Add-Mode Defaults
    //
    // Start : day after the latest year's End Date, otherwise
    //         1 July of the running financial year.
    // End   : Start + 12 months − 1 day.
    // Current : Yes when no year is current yet.
    //===========================================================

    private applyAddDefaults():
        void
    {
        if
        (
            !this.isAddMode
            ||
            this.hasChanges
        )
        {
            return;
        }

        const latest =
            [...this.existingYears]
                .filter
                (
                    item =>
                        !!parseDate(item.EndDate)
                )
                .sort
                (
                    (a, b) =>
                        b.EndDate.localeCompare(a.EndDate)
                )[0];

        let start:
            string;

        if
        (
            latest
        )
        {
            start =
                addDays(
                    latest.EndDate,
                    1
                );
        }
        else
        {
            const today =
                parseDate(todayIso())!;

            const year =
                today.m >= DEFAULT_START_MONTH
                    ? today.y
                    : today.y - 1;

            start =
                `${year}-${String(DEFAULT_START_MONTH).padStart(2, '0')}-01`;
        }

        this.entity.StartDate =
            start;

        this.entity.EndDate =
            defaultEndDate(
                start,
                DEFAULT_YEAR_MONTHS
            );

        this.endDateTouched =
            false;

        this.entity.IsCurrent =
            !this.existingYears.some
            (
                item =>
                    item.IsCurrent
            );

        this.refreshGeneratedName();

        this.syncDateValues();

        this.setInitialFormState();
    }

    //===========================================================
    // Find Overlapping Year
    //===========================================================

    private findOverlap():
        FinancialYear | undefined
    {
        const start =
            this.entity.StartDate;

        const end =
            this.entity.EndDate;

        const selfId =
            this.entity.FinancialYearId
            ||
            this.entityId;

        return this.existingYears.find
        (
            item =>
                item.FinancialYearId !== selfId
                &&
                !!parseDate(item.StartDate)
                &&
                !!parseDate(item.EndDate)
                &&
                item.StartDate <= end
                &&
                item.EndDate >= start
        );
    }

    //===========================================================
    // Initialize Mode
    //===========================================================

    private initializeMode():
        void
    {
        const url =
            this.router.url.toLowerCase();

        if
        (
            url.includes('/view/')
        )
        {
            this.mode =
                'view';
        }
        else if
        (
            url.includes('/edit/')
        )
        {
            this.mode =
                'edit';
        }
        else
        {
            this.mode =
                'add';
        }

        const id =
            this.resolveEntityId();

        if
        (
            id > 0
        )
        {
            this.entityId =
                id;

            this.loadEntity();

            return;
        }

        this.initializeEntity();
    }

    //===========================================================
    // Resolve Entity Id (from route)
    //===========================================================

    private resolveEntityId():
        number
    {
        let currentRoute:
            ActivatedRoute | null =
            this.route;

        while
        (
            currentRoute
        )
        {
            const id =
                Number(
                    currentRoute.snapshot.paramMap.get('id')
                );

            if
            (
                id > 0
            )
            {
                return id;
            }

            currentRoute =
                currentRoute.parent;
        }

        return 0;
    }

    //===========================================================
    // Initialize Entity
    //===========================================================

    private initializeEntity():
        void
    {
        this.entity =
            this.createEmptyEntity();

        this.endDateTouched =
            false;

        this.syncDateValues();

        this.setInitialFormState();

        this.generateFinancialYearCode();

        if
        (
            this.yearsLoaded
        )
        {
            this.applyAddDefaults();
        }
    }

    //===========================================================
    // Generate Financial Year Code
    //===========================================================

    private generateFinancialYearCode():
        void
    {
        if
        (
            this.entityId > 0
        )
        {
            return;
        }

        this.financialYearsService
            .getNextCode()
            .subscribe
            ({
                next:
                (
                    code:
                        any
                ):
                    void =>
                {
                    this.entity.FinancialYearCode =
                        typeof code === 'string'
                            ? code.trim().replace(/^"+|"+$/g, '')
                            : this.text(code, 'FinancialYearCode');

                    // Auto-generated code is part of the initial state
                    if
                    (
                        !this.hasChanges
                    )
                    {
                        this.setInitialFormState();

                        return;
                    }

                    this.checkForChanges();

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Generate Financial Year Code Error',
                        error
                    );

                    this.entity.FinancialYearCode =
                        '';

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to generate Financial Year Code.'
                        )
                    );

                    this.checkForChanges();

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Set Initial Form State
    //===========================================================

    private setInitialFormState():
        void
    {
        this.originalEntity =
            JSON.stringify(
                this.entity
            );

        this.hasChanges =
            false;

        this.cdr.detectChanges();
    }

    //===========================================================
    // Load Entity
    //===========================================================

    private loadEntity():
        void
    {
        this.financialYearsService
            .getById(
                this.entityId
            )
            .subscribe
            ({
                next:
                (
                    response:
                        FinancialYear
                ):
                    void =>
                {
                    this.entity =
                    {
                        ...response,

                        FinancialYearId:
                            response.FinancialYearId
                            ||
                            this.entityId
                    };

                    // A saved End Date is kept as the user set it
                    this.endDateTouched =
                        true;

                    this.syncDateValues();

                    this.setInitialFormState();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Financial Year Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to load Financial Year.'
                        )
                    );

                    this.hasChanges =
                        false;

                    this.onBackToList();
                }
            });
    }

    //===========================================================
    // Track Changes
    //===========================================================

    checkForChanges():
        void
    {
        this.hasChanges =
            JSON.stringify(
                this.entity
            )
            !==
            this.originalEntity;
    }

    //===========================================================
    // Tab Change
    //===========================================================

    onTabChange
    (
        tabId:
            string
    ):
        void
    {
        this.selectedTab =
            tabId;
    }

    //===========================================================
    // Validation Message
    //===========================================================

    private fail
    (
        message:
            string
    ):
        false
    {
        this.toast.error(
            'Validation',
            message
        );

        return false;
    }

    //===========================================================
    // Validate
    //===========================================================

    private validate():
        boolean
    {
        if
        (
            !this.entity.FinancialYearCode?.trim()
        )
        {
            return this.fail('Financial Year Code is required.');
        }

        if
        (
            !parseDate(this.entity.StartDate)
        )
        {
            return this.fail('Start Date is required and must be a valid date.');
        }

        if
        (
            !parseDate(this.entity.EndDate)
        )
        {
            return this.fail('End Date is required and must be a valid date.');
        }

        if
        (
            this.entity.EndDate <= this.entity.StartDate
        )
        {
            return this.fail('End Date must be after Start Date.');
        }

        if
        (
            !this.durationIsValid
        )
        {
            return this.fail(
                `A financial year must be between 1 and ${MAX_YEAR_MONTHS} months long.`
            );
        }

        const overlap =
            this.findOverlap();

        if
        (
            overlap
        )
        {
            return this.fail(
                `These dates overlap ${overlap.FinancialYearName || overlap.FinancialYearCode}. Financial years cannot overlap.`
            );
        }

        if
        (
            this.entity.IsCurrent
            &&
            this.entity.YearStatus !== 'Open'
        )
        {
            return this.fail(
                'Only an Open year can be the current year.'
            );
        }

        return true;
    }

    //===========================================================
    // Extract Error Message
    //===========================================================

    private extractErrorMessage
    (
        error:
            unknown,
        fallback:
            string
    ):
        string
    {
        if
        (
            error instanceof HttpErrorResponse
        )
        {
            if
            (
                typeof error.error === 'string'
                &&
                error.error.trim()
            )
            {
                return error.error;
            }

            if
            (
                error.error?.message
            )
            {
                return error.error.message;
            }

            if
            (
                error.error?.title
            )
            {
                return error.error.title;
            }
        }

        return fallback;
    }

    //===========================================================
    // Progress Dialog (Animated)
    //===========================================================

    private startProgress
    (
        title:
            string,
        message:
            string
    ):
        void
    {
        this.isSaving =
            true;

        this.progressValue =
            0;

        this.progressDialog.show(
            title,
            message,
            false
        );

        this.clearProgressTimer();

        this.progressTimer =
            window.setInterval(
                () =>
                {
                    const step =
                        Math.max(
                            0.4,
                            (this.PROGRESS_CEILING - this.progressValue) * 0.05
                        );

                    this.progressValue =
                        Math.min(
                            this.PROGRESS_CEILING,
                            this.progressValue + step
                        );

                    this.progressDialog.update(
                        Math.round(
                            this.progressValue
                        )
                    );
                },
                this.PROGRESS_TICK_MS
            );

        this.cdr.detectChanges();
    }

    private completeProgress
    (
        message:
            string,
        done:
            () => void
    ):
        void
    {
        this.clearProgressTimer();

        this.progressDialog.update(
            100,
            message
        );

        window.setTimeout(
            () =>
            {
                this.progressDialog.close();

                this.isSaving =
                    false;

                this.cdr.detectChanges();

                done();
            },
            this.PROGRESS_COMPLETE_HOLD_MS
        );
    }

    private failProgress
    (
        done:
            () => void
    ):
        void
    {
        this.clearProgressTimer();

        this.progressDialog.close();

        this.isSaving =
            false;

        this.cdr.detectChanges();

        done();
    }

    private clearProgressTimer():
        void
    {
        if
        (
            this.progressTimer
        )
        {
            clearInterval(
                this.progressTimer
            );

            this.progressTimer =
                undefined;
        }
    }

    //===========================================================
    // Minimum Progress Duration
    //===========================================================

    private withMinimumDuration<T>
    (
        source$:
            Observable<T>
    ):
        Observable<T>
    {
        return defer(
            () =>
            {
                const startedAt:
                    number =
                    Date.now();

                const remaining =
                    (): number =>
                        Math.max(
                            0,
                            this.MIN_PROGRESS_MS - (Date.now() - startedAt)
                        );

                return source$.pipe(
                    delayWhen(
                        () =>
                            timer(remaining())
                    ),

                    catchError(
                        error =>
                            timer(remaining()).pipe(
                                switchMap(
                                    () =>
                                        throwError(() => error)
                                )
                            )
                    )
                );
            }
        );
    }

    //===========================================================
    // Save
    //===========================================================

    onSave():
        void
    {
        if
        (
            this.isViewMode
            ||
            this.isSaving
        )
        {
            return;
        }

        this.entity.StartDate =
            (this.entity.StartDate ?? '').trim();

        this.entity.EndDate =
            (this.entity.EndDate ?? '').trim();

        // Name is always rebuilt before saving
        this.refreshGeneratedName();

        if
        (
            !this.validate()
        )
        {
            return;
        }

        //=======================================================
        // Becoming current replaces the existing current year
        //=======================================================

        const otherCurrent =
            this.entity.IsCurrent
                ? this.existingYears.find
                (
                    item =>
                        item.IsCurrent
                        &&
                        item.FinancialYearId !==
                        (this.entity.FinancialYearId || this.entityId)
                )
                : undefined;

        if
        (
            otherCurrent
        )
        {
            this.confirmDialog.open(
                'Change Current Year',
                `${otherCurrent.FinancialYearName || otherCurrent.FinancialYearCode} is the current year now. Make ${this.entity.FinancialYearName} the current year instead?`,
                () =>
                {
                    window.setTimeout(
                        () =>
                            this.submit(),
                        150
                    );
                },
                'Yes, Change',
                'Cancel',
                'primary'
            );

            return;
        }

        this.submit();
    }

    //===========================================================
    // Submit
    //===========================================================

    private submit():
        void
    {
        if
        (
            this.isAddMode
        )
        {
            this.saveCreate();

            return;
        }

        this.saveUpdate();
    }

    //===========================================================
    // Build Payload
    //===========================================================

    private buildPayload():
        CreateFinancialYear
    {
        return {
            FinancialYearCode:
                this.entity.FinancialYearCode?.trim() ?? '',

            FinancialYearName:
                this.buildFinancialYearName(),

            StartDate:
                this.entity.StartDate,

            EndDate:
                this.entity.EndDate,

            IsCurrent:
                this.entity.IsCurrent,

            YearStatus:
                this.entity.YearStatus,

            Remarks:
                this.entity.Remarks?.trim() ?? '',

            Status:
                this.entity.Status
        };
    }

    //===========================================================
    // Create
    //===========================================================

    private saveCreate():
        void
    {
        const model:
            CreateFinancialYear =
            this.buildPayload();

        this.startProgress(
            'Saving Financial Year',
            'Please wait while the financial year is being saved...'
        );

        this.withMinimumDuration(
            this.financialYearsService.create(
                model
            )
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Financial year saved.',
                    () =>
                    {
                        this.setInitialFormState();

                        this.toast.success(
                            'Success',
                            'Financial Year created successfully.'
                        );

                        this.onBackToList();
                    }
                );
            },

            error:
            (
                error:
                    unknown
            ):
                void =>
            {
                console.error(
                    'Create Financial Year Error',
                    error
                );

                this.failProgress(
                    () =>
                    {
                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to create Financial Year.'
                            )
                        );
                    }
                );
            }
        });
    }

    //===========================================================
    // Update
    //===========================================================

    private saveUpdate():
        void
    {
        const id:
            number =
            this.entity.FinancialYearId
            ||
            this.entityId;

        if
        (
            !id
            ||
            id <= 0
        )
        {
            this.toast.error(
                'Validation',
                'Invalid Financial Year. Please reload the page and try again.'
            );

            return;
        }

        const model:
            UpdateFinancialYear =
        {
            FinancialYearId:
                id,

            ...this.buildPayload()
        };

        this.startProgress(
            'Updating Financial Year',
            'Please wait while the financial year is being updated...'
        );

        this.withMinimumDuration(
            this.financialYearsService.update(
                model
            )
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Financial year updated.',
                    () =>
                    {
                        this.setInitialFormState();

                        this.toast.success(
                            'Success',
                            'Financial Year updated successfully.'
                        );

                        this.onBackToList();
                    }
                );
            },

            error:
            (
                error:
                    unknown
            ):
                void =>
            {
                console.error(
                    'Update Financial Year Error',
                    error
                );

                this.failProgress(
                    () =>
                    {
                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to update Financial Year.'
                            )
                        );
                    }
                );
            }
        });
    }

    //===========================================================
    // Clear
    //===========================================================

    onClear():
        void
    {
        if
        (
            this.isSaving
        )
        {
            return;
        }

        if
        (
            this.isEditMode
        )
        {
            this.loadEntity();

            return;
        }

        this.initializeEntity();
    }

    //===========================================================
    // Back To List
    //===========================================================

    onBackToList():
        void
    {
        if
        (
            this.isSaving
        )
        {
            return;
        }

        const listRoute =
        [
            '/settings',
            'general-settings',
            'financial-years',
            'list'
        ];

        if
        (
            !this.hasChanges
        )
        {
            void this.router.navigate(
                listRoute
            );

            return;
        }

        this.confirmDialog.open(
            'Cancel Changes',
            'Any unsaved changes will be lost. Do you want to leave this page?',
            () =>
            {
                void this.router.navigate(
                    listRoute
                );
            },
            'Leave',
            'Stay',
            'primary'
        );
    }

    //===========================================================
    // Save Button Text
    //===========================================================

    get saveButtonText():
        string
    {
        return this.isEditMode
            ? 'Update'
            : 'Save';
    }

    //===========================================================
    // Mode Helpers
    //===========================================================

    get isViewMode():
        boolean
    {
        return this.mode === 'view';
    }

    get isEditMode():
        boolean
    {
        return this.mode === 'edit';
    }

    get isAddMode():
        boolean
    {
        return this.mode === 'add';
    }

    //===========================================================
    // Value Changed
    //===========================================================

    onValueChange():
        void
    {
        this.checkForChanges();

        this.cdr.detectChanges();
    }
}