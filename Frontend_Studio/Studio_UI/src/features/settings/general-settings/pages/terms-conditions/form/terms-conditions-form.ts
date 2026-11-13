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

import { PageHeaderComponent } from '../../../../../../shared/components/layout/page-header/page-header';
import { PageCanvasComponent } from '../../../../../../shared/components/layout/page-canvas/page-canvas';
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { TextboxComponent } from '../../../../../../shared/components/controls/textbox/textbox';
import { DropdownComponent } from '../../../../../../shared/components/controls/dropdown/dropdown';
import { SearchDropdownComponent } from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogService } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ConfirmDialogComponent } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { ProgressDialogService } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';

import
{
    TermsConditionLine,
    TermsConditionSet,
    TermsOperation,
    emptyTermsLine
}
from '../../../models/terms-conditions.model';

import
{
    TermsConditionsService
}
from '../../../services/terms-conditions.service';


//===============================================================
// Terms & Conditions Form (Settings > General Settings)
//
// Left : the set (code, operation, title, Default, status, note).
// The title is made from the operation's page name and a number
// (Sales Invoice - MB 1, 2, 3 ...); the operation is fixed once
// the set is saved.
// Right : the numbered lines, English and Bangla, with a print
// preview in either language (the documents' page switch will
// choose the language; an empty Bangla line prints in English).
//===============================================================

@Component(
{
    selector:'terms-conditions-form',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageCanvasComponent,
        CommandCenterComponent,
        TextboxComponent,
        DropdownComponent,
        SearchDropdownComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./terms-conditions-form.html',
    styleUrl:'./terms-conditions-form.css'
})
export class TermsConditionsForm
implements OnInit
{
    private readonly service = inject(TermsConditionsService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progressDialog = inject(ProgressDialogService);

    private readonly cdr = inject(ChangeDetectorRef);

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
        TermsConditionSet =
        this.emptyEntity();

    operations:
        TermsOperation[] = [];

    // Print preview language
    previewBangla =
        false;

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
            ? 'Terms & Conditions'
            : this.mode === 'edit'
                ? `Update Terms & Conditions ${this.entity.Code}`
                : `View Terms & Conditions ${this.entity.Code}`;
    }

    get saveButtonText(): string
    {
        return this.mode === 'edit' ? 'Update' : 'Save';
    }

    // Edit / view : the saved set's operation never changes
    get operationLocked(): boolean
    {
        return this.mode !== 'add';
    }

    // Saved : its own title. New : the title it will get.
    get titleText(): string
    {
        if (this.mode !== 'add')
        {
            return this.entity.Title;
        }

        return this.selectedOperation?.NextTitle ?? '';
    }

    get operationItems(): any[]
    {
        return this.operations.map(o => ({ label:`${o.Name}  (${o.Group})`, value:o.Code }));
    }

    get selectedOperation(): TermsOperation | undefined
    {
        return this.operations.find(o => o.Code === this.entity.OperationCode);
    }

    // The operation's Default when it is another set
    get otherDefault(): string
    {
        const op =
            this.selectedOperation;

        return op && op.DefaultSetCode && op.DefaultSetPublicId !== this.entity.PublicId
            ? op.DefaultSetCode
            : '';
    }

    get filledLines(): TermsConditionLine[]
    {
        return this.entity.Lines.filter(l => l.TextEn.trim() || l.TextBn.trim());
    }

    get banglaCount(): number
    {
        return this.filledLines.filter(l => l.TextBn.trim()).length;
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

        this.loadDefaults();

        if (this.entityId)
        {
            this.loading = true;

            this.service
                .getById(this.entityId)
                .subscribe(
                {
                    next:t =>
                    {
                        this.entity = t;

                        if (this.entity.Lines.length === 0)
                        {
                            this.entity.Lines = [emptyTermsLine()];
                        }

                        this.loading = false;
                        this.setInitialState();
                    },
                    error:error =>
                    {
                        this.loading = false;
                        this.toast.error('Error', error?.error?.message ?? 'The terms & conditions set could not be loaded.');
                        this.cdr.detectChanges();
                    }
                });
        }
        else
        {
            this.setInitialState();
        }
    }

    private emptyEntity():
        TermsConditionSet
    {
        return {
            TermsConditionSetId:0,
            PublicId:'',
            Code:'',
            Title:'',
            OperationCode:'',
            OperationName:'',
            IsDefault:true,
            Note:'',
            IsActive:true,
            // A new set starts with two blank lines
            Lines:[emptyTermsLine(), emptyTermsLine()]
        };
    }

    private loadDefaults():
        void
    {
        this.service
            .getDefaults()
            .subscribe(
            {
                next:d =>
                {
                    this.operations = d.Operations;

                    if (this.mode === 'add' && !this.entity.Code)
                    {
                        this.entity.Code = d.NextCode;
                        this.initialJson = JSON.stringify(this.entity);
                    }

                    this.cdr.detectChanges();
                },
                error:() =>
                    this.toast.error('Error', 'The operations could not be loaded.')
            });
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
    // Header fields
    //===========================================================

    onText(field: 'Note', value: any):
        void
    {
        this.entity[field] = String(value ?? '');
        this.changed();
    }

    onOperation(value: any):
        void
    {
        if (this.operationLocked)
        {
            return;
        }

        this.entity.OperationCode = String(value ?? '');
        this.entity.OperationName = this.selectedOperation?.Name ?? '';
        this.entity.Title = this.selectedOperation?.NextTitle ?? '';
        this.changed();
    }

    onStatus(value: any):
        void
    {
        this.entity.IsActive = value === true || value === 'true';

        if (!this.entity.IsActive)
        {
            // an inactive set is never the Default
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

    //===========================================================
    // Lines
    //===========================================================

    addLine():
        void
    {
        this.entity.Lines = [...this.entity.Lines, emptyTermsLine()];
        this.changed();
    }

    insertLine(index: number):
        void
    {
        const list =
            [...this.entity.Lines];

        list.splice(index + 1, 0, emptyTermsLine());

        this.entity.Lines = list;
        this.changed();
    }

    removeLine(index: number):
        void
    {
        this.entity.Lines = this.entity.Lines.filter((_, i) => i !== index);

        if (this.entity.Lines.length === 0)
        {
            this.entity.Lines = [emptyTermsLine()];
        }

        this.changed();
    }

    moveLine(index: number, step: number):
        void
    {
        const target =
            index + step;

        if (target < 0 || target >= this.entity.Lines.length)
        {
            return;
        }

        const list =
            [...this.entity.Lines];

        [list[index], list[target]] = [list[target], list[index]];

        this.entity.Lines = list;

        this.changed();
    }

    onLineText(line: TermsConditionLine, field: 'TextEn' | 'TextBn', event: Event):
        void
    {
        line[field] = (event.target as HTMLTextAreaElement).value;
        this.changed();
    }

    setPreview(bangla: boolean):
        void
    {
        this.previewBangla = bangla;
        this.cdr.detectChanges();
    }

    previewText(line: TermsConditionLine): string
    {
        return this.previewBangla && line.TextBn.trim() ? line.TextBn : line.TextEn;
    }

    //===========================================================
    // Save / Clear / Back
    //===========================================================

    private validate():
        string
    {
        if (!this.entity.OperationCode)
        {
            return 'Pick the operation (document) these terms are for.';
        }

        const lines =
            this.filledLines;

        if (lines.length === 0)
        {
            return 'Add at least one line.';
        }

        const missing =
            this.entity.Lines.findIndex(l => !l.TextEn.trim() && !!l.TextBn.trim());

        if (missing >= 0)
        {
            return `Line ${missing + 1} needs the English text (the Bangla text is optional).`;
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

                this.progressDialog.show('Saving', 'Saving the terms & conditions...', false);

                const done =
                    (message: string) =>
                    {
                        this.progressDialog.close();
                        this.isSaving = false;
                        this.setInitialState();
                        this.toast.success('Success', message);
                        this.goToList();
                    };

                const fail =
                    (error: any) =>
                    {
                        this.progressDialog.close();
                        this.isSaving = false;
                        this.toast.error('Error', error?.error?.message ?? 'The terms & conditions set could not be saved.');
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
                        .subscribe({ next:t => done(`${t.Code} created.`), error:fail });
                }
            };

        const other =
            this.otherDefault;

        if (this.entity.IsDefault && other)
        {
            this.confirmDialog.open(
                'Change the Default',
                `${other} is the Default of ${this.selectedOperation?.Name}. Make ${this.entity.Code || 'this set'} the Default instead? ${other} stays as a normal set.`,
                save,
                'Make Default',
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
                const code = this.entity.Code;
                const publicId = this.entity.PublicId;
                const id = this.entity.TermsConditionSetId;
                const keep = { ...this.entity };

                this.entity = this.emptyEntity();
                this.entity.Code = code;
                this.entity.PublicId = publicId;
                this.entity.TermsConditionSetId = id;

                // edit : the operation and title stay (fixed once saved)
                if (this.operationLocked)
                {
                    this.entity.OperationCode = keep.OperationCode;
                    this.entity.OperationName = keep.OperationName;
                    this.entity.Title = keep.Title;
                }
                this.changed();
            },
            'Clear',
            'Cancel',
            'primary');
    }

    private goToList():
        void
    {
        void this.router.navigate(['/settings/general-settings/terms-conditions/list']);
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
