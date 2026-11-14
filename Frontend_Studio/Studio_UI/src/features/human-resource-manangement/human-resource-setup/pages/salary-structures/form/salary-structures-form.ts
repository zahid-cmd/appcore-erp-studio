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
    ActivatedRoute,
    Router
}
from '@angular/router';

import
{
    forkJoin,
    of
}
from 'rxjs';

import { PageHeaderComponent } from '../../../../../../shared/components/layout/page-header/page-header';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../../shared/components/layout/page-canvas/page-canvas';
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { TextboxComponent } from '../../../../../../shared/components/controls/textbox/textbox';
import { DropdownComponent } from '../../../../../../shared/components/controls/dropdown/dropdown';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogService } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ConfirmDialogComponent } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../../services/hr-progress.service';

import
{
    SalaryStructure,
    SalaryStructureHead,
    SalaryStructureLine,
    emptySalaryStructure,
    splitGross,
    structureMoney,
    structurePercent
}
from '../../../models/salary-structures.model';

import
{
    SalaryStructuresService
}
from '../../../services/salary-structures.service';


// A line of the structure with what the page shows of its head
interface StructureRow
{
    line: SalaryStructureLine;
    // The head is no longer on the Salary Heads page (inactive or
    // deleted) : the line stays until its percent is cleared
    retired: boolean;
}


//===============================================================
// Salary Structures Form (Human Resource Setup)
//
// Left : the structure (code, status, name, Default, remarks) and,
// under it, how the structure is used.
// The name is not typed : Salary Structure - 1 / 2 / 3.
// Right : the split in its own card : a percent of the gross
// salary for each earning head (they must add up to 100). A
// deduction is a fixed amount, a percent of the gross or a
// percent of the basic salary : one of the three.
// The Tk column is only an example on the gross typed above it :
// the real gross salary is typed on each Employee Profile.
//===============================================================

@Component(
{
    selector:'salary-structures-form',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageCanvasComponent,
        CommandCenterComponent,
        TextboxComponent,
        DropdownComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./salary-structures-form.html',
    styleUrl:'./salary-structures-form.css'
})
export class SalaryStructuresForm
implements OnInit
{
    private readonly service = inject(SalaryStructuresService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progressDialog = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    // The canvas keeps the height every page has (mode 'list' : the
    // stylesheet height; 'form' measures the page and came out
    // short). Only the empty footer strip goes : the two sides use
    // the whole height (no scrolling, no blank band).
    readonly canvasConfig:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:false,
        reserveFooterSpace:false,
        bodyScrollable:true,
        fixedHeight:true
    };

    readonly statusItems =
    [
        { label:'Active', value:true },
        { label:'Inactive', value:false }
    ];

    mode:
        'add' | 'edit' | 'view' =
        'add';

    entityId =
        '';

    entity:
        SalaryStructure =
        emptySalaryStructure();

    private heads:
        SalaryStructureHead[] = [];

    rows:
        StructureRow[] = [];

    // The Default structure now, when it is another one ('' = none)
    otherDefault =
        '';

    // The example gross salary of the Tk column
    exampleGross =
        20000;

    isSaving =
        false;

    hasChanges =
        false;

    loading =
        false;

    private initialJson =
        '';

    get isViewMode(): boolean
    {
        return this.mode === 'view';
    }

    get pageTitle(): string
    {
        return this.mode === 'add'
            ? 'Salary Structure'
            : this.mode === 'edit'
                ? `Update Salary Structure`
                : `View Salary Structure`;
    }

    get saveButtonText(): string
    {
        return this.mode === 'edit' ? 'Update' : 'Save';
    }

    get earningRows(): StructureRow[]
    {
        return this.rows.filter(r => r.line.HeadType !== 'Deduction');
    }

    get deductionRows(): StructureRow[]
    {
        return this.rows.filter(r => r.line.HeadType === 'Deduction');
    }

    private sum(rows: StructureRow[]): number
    {
        return Math.round(rows.reduce((total, r) => total + (Number(r.line.Percent) || 0), 0) * 1000) / 1000;
    }

    get earningPercent(): number
    {
        return this.sum(this.earningRows);
    }

    // The deductions that are a percent of the gross, added up
    get deductionPercent(): number
    {
        return this.sum(this.deductionRows.filter(r => r.line.Basis === 'Gross'));
    }

    // The earnings add up to 100
    get earningsOk(): boolean
    {
        return this.earningPercent === 100;
    }

    // What the earnings still need to reach 100 (below 0 = too much)
    get earningsLeft(): number
    {
        return Math.round((100 - this.earningPercent) * 1000) / 1000;
    }

    get basicRow(): StructureRow | undefined
    {
        return this.rows.find(r => r.line.IsBasic && !r.retired);
    }

    // "Rest to Basic" has something to do
    get canFillBasic(): boolean
    {
        return !this.isViewMode && !!this.basicRow && !this.earningsOk;
    }

    // The example : the Tk of each head on the example gross
    get example(): Map<number, number>
    {
        return splitGross(this.exampleGross, this.rows.map(r => r.line));
    }

    exampleOf(row: StructureRow): string
    {
        const amount =
            this.example.get(row.line.SalaryHeadId) ?? 0;

        return amount ? structureMoney(amount) : '';
    }

    exampleTotal(rows: StructureRow[]): string
    {
        const amounts =
            this.example;

        return structureMoney(rows.reduce((total, r) => total + (amounts.get(r.line.SalaryHeadId) ?? 0), 0));
    }

    get exampleNet(): string
    {
        const amounts =
            this.example;

        const of =
            (rows: StructureRow[]): number =>
                rows.reduce((total, r) => total + (amounts.get(r.line.SalaryHeadId) ?? 0), 0);

        return structureMoney(of(this.earningRows) - of(this.deductionRows));
    }

    percent(value: number): string
    {
        return structurePercent(value);
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
            url.includes('/view/') ? 'view' : url.includes('/edit/') ? 'edit' : 'add';

        this.entityId =
            this.route.snapshot.paramMap.get('id') ?? '';

        this.loading = true;

        forkJoin(
        {
            defaults:this.service.getDefaults(),
            structure:this.entityId ? this.service.getById(this.entityId) : of(null)
        })
        .subscribe(
        {
            next:({ defaults, structure }) =>
            {
                if (structure)
                {
                    this.entity = structure;
                }
                else
                {
                    this.entity.Code = defaults.NextCode;
                    this.entity.Name = defaults.NextName;

                    // the first structure is the Default
                    this.entity.IsDefault = !defaults.DefaultCode;
                }

                this.heads = defaults.SalaryHeads;

                this.otherDefault =
                    defaults.DefaultCode && defaults.DefaultPublicId !== this.entity.PublicId
                        ? defaults.DefaultCode
                        : '';

                this.buildRows();

                this.loading = false;
                this.setInitialState();
            },
            error:error =>
            {
                this.loading = false;
                this.toast.error('Error', error?.error?.message ?? 'The salary structure could not be loaded.');
                this.cdr.detectChanges();
            }
        });
    }

    // One line per salary head (0 when the structure has none); the
    // structure's lines of retired heads stay at the end
    private buildRows():
        void
    {
        const existing =
            this.entity.Lines;

        const lines:
            SalaryStructureLine[] =
            this.heads.map(h =>
                existing.find(l => l.SalaryHeadId === h.SalaryHeadId)
                ?? { SalaryHeadId:h.SalaryHeadId, HeadName:h.Name, HeadType:h.HeadType, IsBasic:h.IsBasic, Percent:0, Basis:'Gross', FixedAmount:0 });

        const retired =
            existing.filter(l => !this.heads.some(h => h.SalaryHeadId === l.SalaryHeadId));

        this.entity.Lines =
            [...lines, ...retired];

        this.rows =
            this.entity.Lines.map(line => ({
                line,
                retired:!this.heads.some(h => h.SalaryHeadId === line.SalaryHeadId)
            }));
    }

    private setInitialState():
        void
    {
        this.initialJson = JSON.stringify(this.entity);
        this.hasChanges = false;
        this.cdr.detectChanges();
    }

    changed():
        void
    {
        this.hasChanges = JSON.stringify(this.entity) !== this.initialJson;
        this.cdr.detectChanges();
    }

    //===========================================================
    // Fields
    //===========================================================

    onText(field: 'Remarks', value: any):
        void
    {
        this.entity[field] = String(value ?? '');
        this.changed();
    }

    onStatus(value: any):
        void
    {
        this.entity.IsActive = value === true || value === 'true';

        if (!this.entity.IsActive)
        {
            // an inactive structure is never the Default
            this.entity.IsDefault = false;
        }

        this.changed();
    }

    onDefault(event: Event):
        void
    {
        this.entity.IsDefault = (event.target as HTMLInputElement).checked && this.entity.IsActive;
        this.changed();
    }

    // 0 to 100, three decimals
    private toPercent(value: any): number
    {
        const number =
            Number(String(value ?? '').replace(/[,%]/g, ''));

        return Number.isFinite(number) && number > 0
            ? Math.min(100, Math.round(number * 1000) / 1000)
            : 0;
    }

    onPercent(row: StructureRow, event: Event):
        void
    {
        row.line.Percent = this.toPercent((event.target as HTMLInputElement).value);
        this.changed();
    }

    //-----------------------------------------------------------
    // A deduction : one of three ways. The box that has a value is
    // the way; the other two are blocked until it is cleared.
    //-----------------------------------------------------------

    private hasValue(row: StructureRow): boolean
    {
        return (Number(row.line.Percent) || 0) > 0 || (Number(row.line.FixedAmount) || 0) > 0;
    }

    // The box of another way is blocked
    blocked(row: StructureRow, basis: string): boolean
    {
        return this.isViewMode || (this.hasValue(row) && row.line.Basis !== basis);
    }

    // What the box of a way shows
    wayValue(row: StructureRow, basis: string): string
    {
        if (row.line.Basis !== basis)
        {
            return '';
        }

        const value =
            basis === 'Fixed' ? row.line.FixedAmount : row.line.Percent;

        return value ? String(value) : '';
    }

    onWay(row: StructureRow, basis: string, event: Event):
        void
    {
        const typed =
            (event.target as HTMLInputElement).value;

        if (basis === 'Fixed')
        {
            const number =
                Number(String(typed ?? '').replace(/,/g, ''));

            row.line.FixedAmount = Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : 0;
            row.line.Percent = 0;
        }
        else
        {
            row.line.Percent = this.toPercent(typed);
            row.line.FixedAmount = 0;
        }

        // cleared : the three boxes are open again
        row.line.Basis = this.hasValue(row) ? basis : 'Gross';

        this.changed();
    }

    onWayBlur(row: StructureRow, basis: string, event: Event):
        void
    {
        (event.target as HTMLInputElement).value = this.wayValue(row, basis);
    }

    // Shows the cleaned percent once the user leaves the box
    onPercentBlur(row: StructureRow, event: Event):
        void
    {
        (event.target as HTMLInputElement).value = row.line.Percent ? String(row.line.Percent) : '';
    }

    // Basic takes what the other earnings leave of the 100
    fillBasic():
        void
    {
        const basic =
            this.basicRow;

        if (!basic)
        {
            return;
        }

        const others =
            this.sum(this.earningRows.filter(r => r !== basic));

        if (others >= 100)
        {
            this.toast.error('Salary Structure', `The other earnings already add up to ${this.percent(others)} % : lower them first.`);
            return;
        }

        basic.line.Percent = Math.round((100 - others) * 1000) / 1000;

        this.changed();
    }

    onExampleGross(event: Event):
        void
    {
        const number =
            Number(String((event.target as HTMLInputElement).value ?? '').replace(/,/g, ''));

        this.exampleGross = Number.isFinite(number) && number > 0 ? number : 0;

        this.cdr.detectChanges();
    }

    //===========================================================
    // Save / Clear / Back
    //===========================================================

    private validate():
        string
    {
        if (!this.earningsOk)
        {
            return `The earnings must add up to 100 % of the gross salary : they add up to ${this.percent(this.earningPercent)} %.`;
        }

        if (this.deductionPercent > 100)
        {
            return 'The deductions cannot be more than 100 % of the gross salary.';
        }

        if (this.deductionRows.some(r => r.line.Basis === 'Basic' && r.line.Percent > 0) && !(this.basicRow && this.basicRow.line.Percent > 0))
        {
            return 'A deduction is a percent of the basic salary, but Basic Salary has no percent.';
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

        const save =
            () =>
            {
                this.isSaving = true;

                this.progressDialog.show('Saving', 'Saving the salary structure...', false);

                const done =
                    (message: string) =>
                    {
                        this.progressDialog.finish(() =>
                        {
                            this.isSaving = false;
                            this.setInitialState();
                            this.toast.success('Success', message);
                            this.goToList();
                        });
                    };

                const fail =
                    (error: any) =>
                    {
                        this.progressDialog.fail();
                        this.isSaving = false;
                        this.toast.error('Error', error?.error?.message ?? 'The salary structure could not be saved.');
                        this.cdr.detectChanges();
                    };

                if (this.mode === 'edit')
                {
                    this.service
                        .update(this.entityId, this.entity)
                        .subscribe({ next:() => done(`${this.entity.Code} updated.`), error:fail });
                }
                else
                {
                    this.service
                        .create(this.entity)
                        .subscribe({ next:s => done(`${s.Code} created.`), error:fail });
                }
            };

        // what saving changes besides the structure itself
        const notes:
            string[] = [];

        if (this.mode === 'edit' && this.entity.EmployeeCount > 0)
        {
            notes.push(`The salary of the ${this.entity.EmployeeCount} employee(s) on ${this.entity.Code} is worked out again from their own gross salary, from the next salary sheet.`);
        }

        if (this.entity.IsDefault && this.otherDefault)
        {
            notes.push(`${this.otherDefault} is the Default now : this structure becomes the Default instead.`);
        }

        if (notes.length > 0)
        {
            this.confirmDialog.open(
                this.mode === 'edit' ? 'Update Salary Structure' : 'Save Salary Structure',
                notes.join(' '),
                save,
                this.saveButtonText,
                'Cancel',
                'primary');
            return;
        }

        save();
    }

    onClear():
        void
    {
        if (this.isViewMode)
        {
            return;
        }

        this.confirmDialog.open(
            'Clear Form',
            'Clear every field of the form?',
            () =>
            {
                const kept = this.entity;

                this.entity = emptySalaryStructure();
                this.entity.Code = kept.Code;
                this.entity.Name = kept.Name;
                this.entity.PublicId = kept.PublicId;
                this.entity.SalaryStructureId = kept.SalaryStructureId;
                this.entity.EmployeeCount = kept.EmployeeCount;

                this.buildRows();
                this.changed();
            },
            'Clear',
            'Cancel',
            'primary');
    }

    private goToList():
        void
    {
        void this.router.navigate(['/human-resource-manangement/human-resource-setup/salary-structures/list']);
    }

    onBackToList():
        void
    {
        if (this.isSaving)
        {
            return;
        }

        if (!this.hasChanges || this.isViewMode)
        {
            this.goToList();
            return;
        }

        this.confirmDialog.open(
            'Cancel Changes',
            'Any unsaved changes will be lost. Do you want to leave this page?',
            () => this.goToList(),
            'Leave',
            'Stay',
            'primary');
    }
}
