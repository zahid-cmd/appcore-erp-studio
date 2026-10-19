//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    Input,
    Output,
    EventEmitter,
    ChangeDetectorRef,
    inject
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

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
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

import
{
    ConfirmDialogService
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

//===============================================================
// Models
//===============================================================

import
{
    ServicePolicySchedule,
    SERVICE_TYPES,
    DAYS_PER_YEAR
}
from '../../../models/service-policy.model';

import
{
    renumberSchedule,
    scheduleSummary
}
from '../../../models/service-policy-schedule.util';

//===============================================================
// Component
//
// SERVICE SCHEDULE page of a Service Policy.
//
// Opened from the Service Policy form (command center :
// "Schedule"), it replaces the form on screen and works on a
// copy of the rows : Apply hands them back to the form, Back
// discards. The form saves them with the policy.
//
// Layout : Quick Fill (left) and the schedule table (right),
// side by side in the canvas.
//
// Row 1 is due after the sale date, every other row after the
// previous service. Days control the schedule; km is reference
// only. A Free row whose standard due day is past the warranty
// is marked and blocks Apply.
//===============================================================

@Component(
{
    selector:'service-schedule',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        CommandCenterComponent,
        ControlTabsComponent,
        PageCanvasComponent
    ],

    templateUrl:'./service-schedule.html',

    styleUrls:
    [
        './service-schedule.css'
    ]
})

export class ServiceScheduleComponent
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly toast =
        inject(ToastService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    //===========================================================
    // Inputs / Outputs
    //===========================================================

    // The policy's current rows (a copy is edited here)
    @Input()
    schedules:
        ServicePolicySchedule[] =
        [];

    @Input()
    warrantyYears:
        number =
        0;

    @Input()
    warrantyKm:
        number =
        0;

    @Input()
    brandName:
        string =
        '';

    @Input()
    policyCode:
        string =
        '';

    @Input()
    readonly:
        boolean =
        false;

    // Apply : the edited rows
    @Output()
    applied =
        new EventEmitter<ServicePolicySchedule[]>();

    // Back (nothing applied)
    @Output()
    closed =
        new EventEmitter<void>();

    //===========================================================
    // State
    //===========================================================

    rows:
        ServicePolicySchedule[] =
        [];

    // Standard due day after sale for each row
    dueDays:
        number[] =
        [];

    private original:
        string =
        '';

    readonly serviceTypes:
        readonly string[] =
        SERVICE_TYPES;

    selectedTab:
        string =
        'schedule';

    get tabs():
        ControlTab[]
    {
        return [
            {
                id:'schedule',
                label:`Service Schedule (${this.rows.length})`
            }
        ];
    }

    get subtitle():
        string
    {
        return [
            this.policyCode,
            this.brandName
        ]
        .filter(value => !!value)
        .join(' · ')
        ||
        'Free and paid services of the policy';
    }

    get warrantyDays():
        number
    {
        return (this.warrantyYears || 0) * DAYS_PER_YEAR;
    }

    get summary():
        string
    {
        return scheduleSummary(
            this.rows
        );
    }

    get freeCount():
        number
    {
        return this.rows.filter(row => row.ServiceType === 'Free').length;
    }

    get paidCount():
        number
    {
        return this.rows.length - this.freeCount;
    }

    get lastFreeDay():
        number
    {
        let last =
            0;

        this.rows.forEach(
            (row, index) =>
            {
                if
                (
                    row.ServiceType === 'Free'
                )
                {
                    last =
                        this.dueDays[index] ?? 0;
                }
            }
        );

        return last;
    }

    get hasChanges():
        boolean
    {
        return JSON.stringify(this.rows) !== this.original;
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.rows =
            (this.schedules ?? []).map(
                row =>
                ({
                    ...row
                })
            );

        this.refresh();

        this.original =
            JSON.stringify(
                this.rows
            );

        // Quick Fill starts from the current rows when there are some
        if
        (
            this.rows.length
        )
        {
            this.quickFill.TotalServices =
                this.rows.length;

            this.quickFill.FreePositions =
                this.compactPositions(
                    this.rows
                        .map((row, index) => row.ServiceType === 'Free' ? index + 1 : 0)
                        .filter(position => position > 0)
                );

            this.quickFill.FirstDays =
                this.rows[0].IntervalDays;

            this.quickFill.FirstKm =
                this.rows[0].IntervalKm;

            if
            (
                this.rows.length > 1
            )
            {
                this.quickFill.OtherDays =
                    this.rows[1].IntervalDays;

                this.quickFill.OtherKm =
                    this.rows[1].IntervalKm;
            }

            this.quickFill.GraceDays =
                this.rows[0].GraceDays;
        }
    }

    //===========================================================
    // Helpers
    //===========================================================

    private refresh():
        void
    {
        this.dueDays =
            renumberSchedule(
                this.rows
            );

        this.cdr.detectChanges();
    }

    numberText
    (
        value:
            number
    ):
        string
    {
        return value
            ? String(value)
            : '';
    }

    private toNumber
    (
        value:
            any,

        maxDigits:
            number
    ):
        number
    {
        const digits =
            String(value ?? '')
                .replace(/[^0-9]/g, '')
                .substring(0, maxDigits);

        return digits
            ? Number(digits)
            : 0;
    }

    dueAfterText
    (
        index:
            number
    ):
        string
    {
        return index === 0
            ? 'Sale Date'
            : this.rows[index - 1]?.ServiceName ?? '';
    }

    isBeyondWarranty
    (
        index:
            number
    ):
        boolean
    {
        const row =
            this.rows[index];

        return !!row
            &&
            row.ServiceType === 'Free'
            &&
            this.warrantyDays > 0
            &&
            (this.dueDays[index] ?? 0) > this.warrantyDays;
    }

    //===========================================================
    // Row Editing
    //===========================================================

    private newRow
    (
        type:
            string,

        days:
            number,

        km:
            number,

        grace:
            number
    ):
        ServicePolicySchedule
    {
        return {
            ServicePolicyScheduleId:0,
            SequenceNo:0,
            ServiceType:type,
            ServiceTypeNo:0,
            ServiceName:'',
            IntervalDays:days,
            IntervalKm:km,
            GraceDays:grace
        };
    }

    addRow():
        void
    {
        const last =
            this.rows[this.rows.length - 1];

        this.rows.push(
            this.newRow(
                'Paid',
                last?.IntervalDays ?? this.quickFill.OtherDays,
                last?.IntervalKm ?? this.quickFill.OtherKm,
                last?.GraceDays ?? this.quickFill.GraceDays
            )
        );

        this.refresh();
    }

    removeRow
    (
        index:
            number
    ):
        void
    {
        this.rows.splice(
            index,
            1
        );

        this.refresh();
    }

    moveRow
    (
        index:
            number,

        step:
            number
    ):
        void
    {
        const target =
            index + step;

        if
        (
            target < 0
            ||
            target >= this.rows.length
        )
        {
            return;
        }

        [this.rows[index], this.rows[target]] =
            [this.rows[target], this.rows[index]];

        this.refresh();
    }

    onTypeChange
    (
        row:
            ServicePolicySchedule,

        value:
            string
    ):
        void
    {
        row.ServiceType =
            value === 'Paid'
                ? 'Paid'
                : 'Free';

        this.refresh();
    }

    onRowNumber
    (
        row:
            ServicePolicySchedule,

        field:
            'IntervalDays' | 'IntervalKm' | 'GraceDays',

        value:
            any
    ):
        void
    {
        row[field] =
            this.toNumber(
                value,
                field === 'IntervalKm' ? 6 : 4
            );

        this.refresh();
    }

    //===========================================================
    // QUICK FILL
    //
    // Total services, which positions are Free (the rest are
    // Paid), the gap for the 1st service and for the others, and
    // the grace days. Generate replaces all rows.
    //===========================================================

    quickFill =
    {
        TotalServices:0,
        FreePositions:'',
        FirstDays:30,
        FirstKm:1000,
        OtherDays:60,
        OtherKm:2500,
        GraceDays:0
    };

    onQuickFillNumber
    (
        field:
            'TotalServices' | 'FirstDays' | 'FirstKm' | 'OtherDays' | 'OtherKm' | 'GraceDays',

        value:
            any
    ):
        void
    {
        this.quickFill[field] =
            this.toNumber(
                value,
                field.endsWith('Km') ? 6 : field === 'TotalServices' ? 2 : 4
            );

        this.cdr.detectChanges();
    }

    onQuickFillPositions
    (
        value:
            any
    ):
        void
    {
        // digits, commas, spaces and ranges like 1-3
        this.quickFill.FreePositions =
            String(value ?? '')
                .replace(/[^0-9,\-\s]/g, '');

        this.cdr.detectChanges();
    }

    // "1-3, 5, 7, 13" -> [1, 2, 3, 5, 7, 13]
    private parsePositions
    (
        text:
            string
    ):
        number[]
    {
        const result =
            new Set<number>();

        for
        (
            const part
            of text.split(',')
        )
        {
            const range =
                part
                    .trim()
                    .split('-')
                    .map(value => Number(value.trim()))
                    .filter(value => value > 0);

            if
            (
                range.length === 1
            )
            {
                result.add(range[0]);
            }
            else if
            (
                range.length === 2
                &&
                range[0] <= range[1]
            )
            {
                for
                (
                    let n = range[0];
                    n <= range[1];
                    n++
                )
                {
                    result.add(n);
                }
            }
        }

        return [...result].sort((a, b) => a - b);
    }

    // [1, 2, 3, 5, 7, 13] -> "1-3, 5, 7, 13"
    private compactPositions
    (
        positions:
            number[]
    ):
        string
    {
        const parts:
            string[] =
            [];

        let start =
            0;

        positions.forEach(
            (position, index) =>
            {
                const next =
                    positions[index + 1];

                if
                (
                    !start
                )
                {
                    start =
                        position;
                }

                if
                (
                    next !== position + 1
                )
                {
                    parts.push(
                        start === position
                            ? `${position}`
                            : `${start}-${position}`
                    );

                    start =
                        0;
                }
            }
        );

        return parts.join(', ');
    }

    get freePositionCount():
        number
    {
        return this.parsePositions(
            this.quickFill.FreePositions
        )
        .filter(
            position =>
                position <= this.quickFill.TotalServices
        )
        .length;
    }

    generate():
        void
    {
        if
        (
            this.readonly
        )
        {
            return;
        }

        const total =
            this.quickFill.TotalServices;

        if
        (
            total < 1
            ||
            total > 60
        )
        {
            this.toast.error(
                'Quick Fill',
                'Total Services must be between 1 and 60.'
            );

            return;
        }

        if
        (
            !(this.quickFill.FirstDays > 0)
            ||
            !(this.quickFill.OtherDays > 0)
        )
        {
            this.toast.error(
                'Quick Fill',
                'Enter the due days for the 1st service and for the others.'
            );

            return;
        }

        const freePositions =
            this.parsePositions(
                this.quickFill.FreePositions
            );

        if
        (
            freePositions.some(position => position > total)
        )
        {
            this.toast.error(
                'Quick Fill',
                `Free positions must be between 1 and ${total}.`
            );

            return;
        }

        const build =
            (): void =>
            {
                this.rows =
                    Array.from(
                        { length:total },
                        (_, index) =>
                            this.newRow(
                                freePositions.includes(index + 1)
                                    ? 'Free'
                                    : 'Paid',
                                index === 0
                                    ? this.quickFill.FirstDays
                                    : this.quickFill.OtherDays,
                                index === 0
                                    ? this.quickFill.FirstKm
                                    : this.quickFill.OtherKm,
                                this.quickFill.GraceDays
                            )
                    );

                this.refresh();

                this.toast.success(
                    'Quick Fill',
                    `${total} services generated. Adjust any row if needed.`
                );
            };

        if
        (
            !this.rows.length
        )
        {
            build();

            return;
        }

        this.confirmDialog.open(
            'Replace Schedule',
            `Replace the current ${this.rows.length} services with ${total} new ones?`,
            () =>
                setTimeout(
                    () =>
                        build()
                ),
            'Replace',
            'Cancel',
            'primary'
        );
    }

    //===========================================================
    // Clear (all rows)
    //===========================================================

    clearRows():
        void
    {
        if
        (
            this.readonly
            ||
            !this.rows.length
        )
        {
            return;
        }

        this.confirmDialog.open(
            'Clear Schedule',
            'Remove all services from the schedule?',
            () =>
                setTimeout(
                    () =>
                    {
                        this.rows =
                            [];

                        this.refresh();
                    }
                ),
            'Clear',
            'Cancel',
            'primary'
        );
    }

    //===========================================================
    // Apply / Back
    //===========================================================

    apply():
        void
    {
        if
        (
            this.readonly
        )
        {
            this.closed.emit();

            return;
        }

        if
        (
            !this.rows.length
        )
        {
            this.toast.error(
                'Validation',
                'The schedule is required. Add at least one service.'
            );

            return;
        }

        const badRow =
            this.rows.findIndex(
                row =>
                    !(row.IntervalDays > 0)
            );

        if
        (
            badRow >= 0
        )
        {
            this.toast.error(
                'Validation',
                `Service #${badRow + 1} : enter Due After (Days).`
            );

            return;
        }

        const late =
            this.rows.findIndex(
                (_, index) =>
                    this.isBeyondWarranty(index)
            );

        if
        (
            late >= 0
        )
        {
            this.toast.error(
                'Validation',
                `${this.rows[late].ServiceName} falls beyond the ${this.warrantyYears}-year warranty.`
            );

            return;
        }

        this.applied.emit(
            this.rows.map(
                row =>
                ({
                    ...row
                })
            )
        );
    }

    back():
        void
    {
        if
        (
            this.readonly
            ||
            !this.hasChanges
        )
        {
            this.closed.emit();

            return;
        }

        this.confirmDialog.open(
            'Discard Changes',
            'The schedule changes have not been applied. Go back without them?',
            () =>
                this.closed.emit(),
            'Discard',
            'Stay',
            'primary'
        );
    }
}