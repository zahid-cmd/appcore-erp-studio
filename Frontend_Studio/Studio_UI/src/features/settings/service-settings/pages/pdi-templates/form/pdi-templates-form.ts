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
    PDI_ITEM_TYPES,
    PdiItemType,
    PdiTemplate,
    PdiTemplateItem,
    PdiTemplateModelOption,
    PdiTemplateSection,
    emptyPdiItem,
    emptyPdiSection
}
from '../../../models/pdi-templates.model';

import
{
    PdiTemplatesService
}
from '../../../services/pdi-templates.service';


//===============================================================
// PDI Templates Form (Settings > Service Settings)
//
// Header (code, names, sheet title, footer note : English and
// Bangla), the bike models it is used for (a model : one active
// template), then the sheet : sections with their items.
// Bangla boxes are plain inputs (the shared textbox keeps English
// only); the service stores Bangla escaped.
//===============================================================

@Component(
{
    selector:'pdi-templates-form',
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
    templateUrl:'./pdi-templates-form.html',
    styleUrl:'./pdi-templates-form.css'
})
export class PdiTemplatesForm
implements OnInit
{
    private readonly service = inject(PdiTemplatesService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progressDialog = inject(ProgressDialogService);

    private readonly cdr = inject(ChangeDetectorRef);

    readonly itemTypes =
        PDI_ITEM_TYPES;

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
        PdiTemplate =
        this.emptyEntity();

    models:
        PdiTemplateModelOption[] = [];

    // Re-created after each pick : the picker clears itself
    modelPickerKeys:
        number[] = [1];

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
            ? 'PDI Template'
            : this.mode === 'edit'
                ? `Update PDI Template ${this.entity.Code}`
                : `View PDI Template ${this.entity.Code}`;
    }

    get saveButtonText(): string
    {
        return this.mode === 'edit' ? 'Update' : 'Save';
    }

    get itemCount(): number
    {
        return this.entity.Sections.reduce((n, s) => n + s.Items.length, 0);
    }

    // Models that can still be picked (not on this template; one in
    // another active template is shown with its code, disabled)
    get modelPickItems(): any[]
    {
        const picked =
            new Set(this.entity.Models.map(m => m.BikeModelId));

        return this.models
            .filter(m => !picked.has(m.BikeModelId))
            .filter(m => !m.TemplateCode || m.TemplatePublicId === this.entity.PublicId)
            .map(m => ({
                label:`${m.ModelName}${m.BrandName ? ' · ' + m.BrandName : ''}${m.BikeType ? ' (' + m.BikeType + ')' : ''}`,
                value:m.BikeModelId
            }));
    }

    get modelsElsewhere(): PdiTemplateModelOption[]
    {
        return this.models.filter(m => !!m.TemplateCode && m.TemplatePublicId !== this.entity.PublicId);
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
                        this.loading = false;
                        this.setInitialState();
                    },
                    error:error =>
                    {
                        this.loading = false;
                        this.toast.error('Error', error?.error?.message ?? 'The PDI template could not be loaded.');
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
        PdiTemplate
    {
        return {
            PdiTemplateId:0,
            PublicId:'',
            Code:'',
            Name:'',
            NameBn:'',
            SheetTitle:'QC - Pre Delivery Inspection (PDI)',
            SheetTitleBn:'',
            FooterNote:'After the PDI, send one copy with the bike and keep the other copy.',
            FooterNoteBn:'',
            ServiceProviderName:'',
            BrandName:'',
            BrandImagePath:'',
            Remarks:'',
            IsActive:true,
            Models:[],
            Sections:[emptyPdiSection()]
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
                    this.models = d.Models;

                    if (this.mode === 'add' && !this.entity.Code)
                    {
                        this.entity.Code = d.NextCode;
                        this.initialJson = JSON.stringify(this.entity);
                    }

                    this.cdr.detectChanges();
                },
                error:() =>
                    this.toast.error('Error', 'The bike models could not be loaded.')
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

    onText(field: 'Name' | 'SheetTitle' | 'FooterNote' | 'ServiceProviderName' | 'Remarks', value: any):
        void
    {
        this.entity[field] = String(value ?? '');
        this.changed();
    }

    onBn(field: 'NameBn' | 'SheetTitleBn' | 'FooterNoteBn', event: Event):
        void
    {
        this.entity[field] = (event.target as HTMLInputElement).value;
        this.changed();
    }

    onStatus(value: any):
        void
    {
        this.entity.IsActive = value === true || value === 'true';
        this.changed();
    }

    //===========================================================
    // Models
    //===========================================================

    onAddModel(value: any):
        void
    {
        const id =
            Number(value);

        const model =
            this.models.find(m => m.BikeModelId === id);

        if (!model || this.entity.Models.some(m => m.BikeModelId === id))
        {
            return;
        }

        this.entity.Models =
            [...this.entity.Models, { BikeModelId:model.BikeModelId, ModelName:model.ModelName, BrandName:model.BrandName }]
                .sort((a, b) => a.ModelName.localeCompare(b.ModelName));

        this.modelPickerKeys = [this.modelPickerKeys[0] + 1];

        this.changed();
    }

    addAllModels():
        void
    {
        const ids =
            new Set(this.modelPickItems.map(x => x.value));

        this.entity.Models =
            [
                ...this.entity.Models,
                ...this.models
                    .filter(m => ids.has(m.BikeModelId))
                    .map(m => ({ BikeModelId:m.BikeModelId, ModelName:m.ModelName, BrandName:m.BrandName }))
            ]
            .sort((a, b) => a.ModelName.localeCompare(b.ModelName));

        this.modelPickerKeys = [this.modelPickerKeys[0] + 1];

        this.changed();
    }

    removeModel(id: number):
        void
    {
        this.entity.Models = this.entity.Models.filter(m => m.BikeModelId !== id);
        this.changed();
    }

    //===========================================================
    // Sections / items
    //===========================================================

    addSection():
        void
    {
        this.entity.Sections = [...this.entity.Sections, emptyPdiSection()];
        this.changed();
    }

    removeSection(index: number):
        void
    {
        const section =
            this.entity.Sections[index];

        const drop =
            () =>
            {
                this.entity.Sections = this.entity.Sections.filter((_, i) => i !== index);
                this.changed();
            };

        if (section.Items.some(i => i.Text.trim()))
        {
            this.confirmDialog.open(
                'Remove Section',
                `Remove section ${index + 1} (${section.Title || 'no title'}) and its ${section.Items.length} item(s)?`,
                drop,
                'Remove',
                'Keep',
                'danger');
            return;
        }

        drop();
    }

    moveSection(index: number, step: number):
        void
    {
        const target =
            index + step;

        if (target < 0 || target >= this.entity.Sections.length)
        {
            return;
        }

        const list =
            [...this.entity.Sections];

        [list[index], list[target]] = [list[target], list[index]];

        this.entity.Sections = list;

        this.changed();
    }

    onSectionText(section: PdiTemplateSection, field: 'Title' | 'TitleBn', event: Event):
        void
    {
        section[field] = (event.target as HTMLInputElement).value;
        this.changed();
    }

    onSectionComments(section: PdiTemplateSection, event: Event):
        void
    {
        section.HasComments = (event.target as HTMLInputElement).checked;
        this.changed();
    }

    addItem(section: PdiTemplateSection):
        void
    {
        section.Items = [...section.Items, emptyPdiItem()];
        this.changed();
    }

    removeItem(section: PdiTemplateSection, index: number):
        void
    {
        section.Items = section.Items.filter((_, i) => i !== index);
        this.changed();
    }

    moveItem(section: PdiTemplateSection, index: number, step: number):
        void
    {
        const target =
            index + step;

        if (target < 0 || target >= section.Items.length)
        {
            return;
        }

        const list =
            [...section.Items];

        [list[index], list[target]] = [list[target], list[index]];

        section.Items = list;

        this.changed();
    }

    onItemText(item: PdiTemplateItem, field: 'Text' | 'TextBn' | 'Unit', event: Event):
        void
    {
        item[field] = (event.target as HTMLInputElement).value;
        this.changed();
    }

    onItemType(item: PdiTemplateItem, event: Event):
        void
    {
        item.ItemType = (event.target as HTMLSelectElement).value as PdiItemType;

        if (item.ItemType !== 'Reading')
        {
            item.Unit = '';
        }

        this.changed();
    }

    onItemRequired(item: PdiTemplateItem, event: Event):
        void
    {
        item.IsRequired = (event.target as HTMLInputElement).checked;
        this.changed();
    }

    //===========================================================
    // Save / Clear / Back
    //===========================================================

    private validate():
        string
    {
        if (!this.entity.Name.trim())
        {
            return 'Template Name is required.';
        }

        if (this.entity.Models.length === 0)
        {
            return 'Pick at least one bike model.';
        }

        if (this.entity.Sections.length === 0)
        {
            return 'Add at least one section.';
        }

        for (let s = 0; s < this.entity.Sections.length; s++)
        {
            const section =
                this.entity.Sections[s];

            if (!section.Title.trim())
            {
                return `Section ${s + 1} needs a title.`;
            }

            if (section.Items.length === 0)
            {
                return `Section ${s + 1} (${section.Title}) needs at least one item.`;
            }

            for (let i = 0; i < section.Items.length; i++)
            {
                if (!section.Items[i].Text.trim())
                {
                    return `Section ${s + 1}, item ${i + 1} needs a text.`;
                }
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

        this.isSaving = true;

        this.progressDialog.show('Saving', 'Saving the PDI template...', false);

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
                this.toast.error('Error', error?.error?.message ?? 'The PDI template could not be saved.');
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
                const code =
                    this.entity.Code;

                const publicId =
                    this.entity.PublicId;

                const id =
                    this.entity.PdiTemplateId;

                this.entity = this.emptyEntity();
                this.entity.Code = code;
                this.entity.PublicId = publicId;
                this.entity.PdiTemplateId = id;
                this.changed();
            },
            'Clear',
            'Cancel',
            'primary');
    }

    private goToList():
        void
    {
        void this.router.navigate(['/settings/service-settings/pdi-templates/list']);
    }

    // View mode : print the blank PDI sheet of the saved template
    onPrint():
        void
    {
        this.openPrint(this.entity.PublicId);
    }

    // Opens the print viewer in a new tab (the session's login is kept)
    private openPrint(publicId: string):
        void
    {
        if (!publicId)
        {
            return;
        }

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(['/print-viewer', 'pdi-templates', publicId], { queryParams:{ doc:'blank-pdi-sheet' } }));

        if (!window.open(url, '_blank'))
        {
            this.toast.warning('Print', 'The print tab was blocked by the browser. Allow pop-ups for this site and try again.');
        }
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

    trackIndex(index: number): number
    {
        return index;
    }
}
