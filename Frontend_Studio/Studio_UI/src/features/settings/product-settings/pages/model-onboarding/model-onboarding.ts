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
    forkJoin,
    of,
    catchError
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
    ModelOnboardingBrand,
    ModelOnboardingColor,
    ModelOnboardingDefaults,
    ModelOnboardingResult
}
from '../../models/model-onboarding.model';

import
{
    ModelOnboardingService
}
from '../../services/model-onboarding.service';

import
{
    MotorBikesService
}
from '../../services/motor-bikes.service';


//===============================================================
// A picked colour (one Motor Bike)
//===============================================================

interface PickedColor
{
    color: ModelOnboardingColor;

    swatch: string;

    imageFile: File | null;

    imagePreview: string;
}


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'model-onboarding',

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
        ToastComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./model-onboarding.html',

    styleUrls:
    [
        './model-onboarding.css'
    ]
})


//===============================================================
// Model Onboarding : Bike Model + Product Sub Category + one
// Motor Bike per colour, in one save (all or nothing).
// A custom action page : no list, no own table.
//===============================================================

export class ModelOnboarding
implements OnInit
{
    private readonly onboardingService =
        inject(ModelOnboardingService);

    private readonly motorBikesService =
        inject(MotorBikesService);

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
        ModelOnboardingDefaults | null =
        null;

    brandItems:
        any[] =
        [];

    bikeTypeItems:
        any[] =
        [];

    colors:
        ModelOnboardingColor[] =
        [];


    //===========================================================
    // Entry
    //===========================================================

    brandId:
        number | null =
        null;

    modelName =
        '';

    bikeType =
        '';

    reorderText =
        '0';

    redText =
        '0';

    maxText =
        '0';

    picked:
        PickedColor[] =
        [];

    isSaving =
        false;

    loadFailed =
        false;

    // Shown after a save until the next model is started
    lastResult:
        ModelOnboardingResult | null =
        null;

    lastImageWarnings =
        0;


    //===========================================================
    // Init
    //===========================================================

    ngOnInit():
        void
    {
        this.loadDefaults();
    }


    private loadDefaults():
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

                    this.brandItems =
                        defaults.Brands.map(
                            b =>
                            ({
                                label:b.BrandName,
                                value:b.BrandManagementId
                            })
                        );

                    this.bikeTypeItems =
                        defaults.BikeTypes.map(
                            t =>
                            ({
                                label:t,
                                value:t
                            })
                        );

                    this.colors =
                        defaults.Colors;

                    this.resetEntry();

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error('Load Model Onboarding Defaults Error', error);

                    this.loadFailed =
                        true;

                    this.toast.error(
                        'Error',
                        'Failed to load brands, bike types and colours.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }


    // Start values for a new model (brand kept when it is the
    // only one)
    private resetEntry():
        void
    {
        const d =
            this.defaults;

        this.brandId =
            d && d.Brands.length === 1
                ? d.Brands[0].BrandManagementId
                : null;

        this.modelName =
            '';

        this.bikeType =
            d && d.BikeTypes.includes(d.LastBikeType)
                ? d.LastBikeType
                : '';

        this.reorderText =
            String(d?.ReorderLevel ?? 0);

        this.redText =
            String(d?.RedLevel ?? 0);

        this.maxText =
            String(d?.MaxStockLevel ?? 0);

        this.picked =
            [];
    }


    //===========================================================
    // Derived values
    //===========================================================

    get brand():
        ModelOnboardingBrand | null
    {
        return this.defaults?.Brands.find(
            b =>
                b.BrandManagementId === Number(this.brandId ?? 0)
        ) ?? null;
    }

    get cleanModelName():
        string
    {
        return this.modelName
            .split(' ')
            .filter(x => !!x)
            .join(' ')
            .toUpperCase();
    }

    get isDuplicate():
        boolean
    {
        const name =
            this.cleanModelName.toLowerCase();

        return !!name
            && !!this.brand
            && this.brand.ExistingModels.some(
                x =>
                    x.trim().toLowerCase() === name
            );
    }

    get subCategoryName():
        string
    {
        return this.brand && this.cleanModelName
            ? `Motor Bikes - ${this.brand.BrandName} - ${this.cleanModelName}`
            : '';
    }

    get nextModelCode():
        string
    {
        return this.defaults?.NextModelCode ?? '';
    }

    bikeName
    (
        p:
            PickedColor
    ):
        string
    {
        return this.subCategoryName
            ? `${this.subCategoryName} - ${p.color.ColorName}`
            : `… - ${p.color.ColorName}`;
    }

    bikeCode
    (
        index:
            number
    ):
        string
    {
        const sub =
            this.brand?.NextSubCategoryCode ?? '';

        return sub
            ? `${sub}-${String(index + 1).padStart(5, '0')}`
            : 'Auto generated';
    }

    isPicked
    (
        c:
            ModelOnboardingColor
    ):
        boolean
    {
        return this.picked.some(
            p =>
                p.color.ColorManagementId === c.ColorManagementId
        );
    }

    swatch
    (
        name:
            string
    ):
        string
    {
        const css =
            String(name ?? '')
                .toLowerCase()
                .replace(/[^a-z]/g, '');

        return css && CSS.supports('color', css)
            ? css
            : '';
    }


    //===========================================================
    // Entry handlers
    //===========================================================

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
    }

    toggleColor
    (
        c:
            ModelOnboardingColor
    ):
        void
    {
        if
        (
            this.isSaving
        )
        {
            return;
        }

        const i =
            this.picked.findIndex(
                p =>
                    p.color.ColorManagementId === c.ColorManagementId
            );

        if
        (
            i >= 0
        )
        {
            this.removeAt(i);

            return;
        }

        this.lastResult =
            null;

        this.picked =
        [
            ...this.picked,
            {
                color:c,
                swatch:this.swatch(c.ColorName),
                imageFile:null,
                imagePreview:''
            }
        ];
    }

    removeAt
    (
        index:
            number
    ):
        void
    {
        const p =
            this.picked[index];

        if (p?.imagePreview)
        {
            URL.revokeObjectURL(p.imagePreview);
        }

        this.picked =
            this.picked.filter((_, i) => i !== index);
    }

    onImagePicked
    (
        p:
            PickedColor,

        event:
            Event
    ):
        void
    {
        const input =
            event.target as HTMLInputElement;

        const file =
            input.files?.[0] ?? null;

        input.value =
            '';

        if (!file)
        {
            return;
        }

        if (!file.type.startsWith('image/'))
        {
            this.toast.error('Validation', 'Pick an image file (JPG, PNG, WEBP or GIF).');

            return;
        }

        if (file.size > 2 * 1024 * 1024)
        {
            this.toast.error('Validation', 'The image must be 2 MB or smaller.');

            return;
        }

        if (p.imagePreview)
        {
            URL.revokeObjectURL(p.imagePreview);
        }

        p.imageFile =
            file;

        p.imagePreview =
            URL.createObjectURL(file);
    }

    clearImage
    (
        p:
            PickedColor
    ):
        void
    {
        if (p.imagePreview)
        {
            URL.revokeObjectURL(p.imagePreview);
        }

        p.imageFile =
            null;

        p.imagePreview =
            '';
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

        this.picked.forEach(
            p =>
            {
                if (p.imagePreview) { URL.revokeObjectURL(p.imagePreview); }
            });

        this.lastResult =
            null;

        this.resetEntry();
    }


    //===========================================================
    // Onboard
    //===========================================================

    onOnboard():
        void
    {
        if
        (
            this.isSaving
        )
        {
            return;
        }

        const brand =
            this.brand;

        const name =
            this.cleanModelName;

        if (!brand)
        {
            this.toast.error('Validation', 'Brand is required.');
            return;
        }

        if (!name)
        {
            this.toast.error('Validation', 'Model Name is required.');
            return;
        }

        if (this.isDuplicate)
        {
            this.toast.error('Validation', `Model ${name} already exists for ${brand.BrandName}.`);
            return;
        }

        if (!this.bikeType)
        {
            this.toast.error('Validation', 'Bike Type is required.');
            return;
        }

        if (this.picked.length === 0)
        {
            this.toast.error('Validation', 'Pick at least one colour.');
            return;
        }

        const picked =
            [...this.picked];

        this.isSaving =
            true;

        this.progressDialog.show(
            'Onboarding Model',
            `Creating ${name}, its sub category and ${picked.length} motor bike(s)...`
        );

        // The bar starts at 0 % and rises while the server works
        this.stopProgress =
            this.startProgress(
                900 + picked.length * 250 + picked.filter(p => !!p.imageFile).length * 600);

        this.onboardingService
            .onboard
            ({
                BrandManagementId:brand.BrandManagementId,
                ModelName:name,
                BikeType:this.bikeType,
                ReorderLevel:Number(this.reorderText || 0),
                RedLevel:Number(this.redText || 0),
                MaxStockLevel:Number(this.maxText || 0),
                ColorManagementIds:picked.map(p => p.color.ColorManagementId),
                Remarks:''
            })
            .subscribe
            ({
                next:
                (
                    result
                ): void =>
                {
                    this.uploadImages(
                        result,
                        picked
                    );
                },

                error:
                (
                    error:
                        any
                ): void =>
                {
                    console.error('Model Onboarding Error', error);

                    void this.stopProgress?.(false);

                    this.progressDialog.close();

                    this.isSaving =
                        false;

                    this.toast.error(
                        'Not saved',
                        typeof error?.error === 'string' && error.error
                            ? error.error
                            : 'The model could not be onboarded. Nothing was saved.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // Progress for the onboarding : rises toward 95 % over the
    // expected time (save + images), then 100 % when done. The
    // stop function ends it (a short pause at 100 % on success).
    //===========================================================

    private stopProgress?:
        (success: boolean) => Promise<void>;

    private startProgress
    (
        expectedMs:
            number
    ):
        (success: boolean) => Promise<void>
    {
        const started =
            Date.now();

        this.progressDialog.update(0);

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

            this.stopProgress = undefined;

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


    // Optional colour images, after the save (a failed image
    // never undoes the onboarding : it can be added on Motor Bikes)
    private uploadImages
    (
        result:
            ModelOnboardingResult,

        picked:
            PickedColor[]
    ):
        void
    {
        const uploads =
            picked
                .filter(p => !!p.imageFile)
                .map(
                    p =>
                    {
                        const bike =
                            result.Bikes.find(
                                b =>
                                    b.ColorManagementId === p.color.ColorManagementId
                            );

                        return bike
                            ? this.motorBikesService
                                .uploadImage(bike.PublicId, p.imageFile as File)
                                .pipe(catchError(() => of(null)))
                            : of(null);
                    });

        const finish =
            async (
                failed:
                    number
            ): Promise<void> =>
            {
                // 100 % for a moment, then close
                await this.stopProgress?.(true);

                this.progressDialog.close();

                this.isSaving =
                    false;

                picked.forEach(
                    p =>
                    {
                        if (p.imagePreview) { URL.revokeObjectURL(p.imagePreview); }
                    });

                this.lastResult =
                    result;

                this.lastImageWarnings =
                    failed;

                // The new model now exists : the duplicate check and
                // the next codes must know it
                this.loadDefaults();

                this.toast.success(
                    'Onboarded',
                    `${result.SubCategoryName} with ${result.Bikes.length} motor bike(s) created.`
                );

                if (failed > 0)
                {
                    this.toast.error(
                        'Images',
                        `${failed} image(s) could not be uploaded. Add them on the Motor Bikes page.`
                    );
                }
            };

        if (uploads.length === 0)
        {
            finish(0);

            return;
        }

        forkJoin(uploads)
            .subscribe
            ({
                next:
                (
                    answers
                ): void =>
                {
                    finish(
                        answers.filter(a => a === null).length
                    );
                },

                error:
                (): void =>
                {
                    finish(uploads.length);
                }
            });
    }


    trackColor
    (
        _index:
            number,

        c:
            ModelOnboardingColor
    ):
        number
    {
        return c.ColorManagementId;
    }
}
