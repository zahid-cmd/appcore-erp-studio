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
    ImageHubComponent
}
from '../../../../../../shared/components/controls/image-hub/image-hub';


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
    Company,

    CreateCompany,

    UpdateCompany,

    CompanyDefaults
}
from '../../../models/company.model';

import
{
    CompanyService
}
from '../../../services/company.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'company-form',

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

        ImageHubComponent,


        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,

        ConfirmDialogComponent,

        ProgressDialogComponent
    ],


    templateUrl:'./company-form.html',


    styleUrls:
    [
        './company-form.css'
    ]
})


export class CompanyForm
implements OnInit, OnDestroy
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);


    private readonly router =
        inject(Router);


    private readonly companyservice =
        inject(CompanyService);


    private readonly confirmDialog =
        inject(ConfirmDialogService);


    private readonly progressDialog =
        inject(ProgressDialogService);


    private readonly toast =
        inject(ToastService);


    private readonly cdr =
        inject(ChangeDetectorRef);



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
        'Company';


    entityName:
        string =
        'Company';



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
    // Status Items
    //===========================================================

    statusItems:
        any[]
    =
    [
        {
            label:'Active',

            value:true
        },

        {
            label:'Inactive',

            value:false
        }
    ];



    //===========================================================
    // Entity
    //===========================================================

    entity:
        Company
    =
    {
        CompanyId:0,

        CompanyCode:'',

        CompanyName:'',

        CompanyShortName:'',

        AddressLine1:'',

        AddressLine2:'',

        Phone:'',

        Mobile:'',

        Email:'',

        Website:'',

        BINNo:'',

        OwnershipType:'',

        EconomicActivity:'',

        TINNo:'',

        TradeLicenseNo:'',

        CompanyLogoPath:'',

        Remarks:'',

        IsActive:true
    };



    //===========================================================
    // Company Logo
    //===========================================================

    selectedLogoFile:
        File | null =
        null;


    companyLogoPreviewUrl:
        string =
        '';


    logoUploading:
        boolean =
        false;



    //===========================================================
    // Form State
    //===========================================================

    private originalEntity:
        string =
        '';


    hasChanges:
        boolean =
        false;


    // Prevents double submit while Save / Update is running
    isSaving:
        boolean =
        false;



    //===========================================================
    // Progress Dialog Settings
    //===========================================================

    // Minimum time the dialog stays open
    private readonly MIN_PROGRESS_MS:
        number =
        5000;


    // Animation tick
    private readonly PROGRESS_TICK_MS:
        number =
        100;


    // Highest % reached before the server answers
    private readonly PROGRESS_CEILING:
        number =
        90;


    // How long 100% is shown before closing
    private readonly PROGRESS_COMPLETE_HOLD_MS:
        number =
        600;


    private progressTimer?:
        number;


    private progressValue:
        number =
        0;



    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.initializeMode();
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


        //=======================================================
        // Release Local Logo Preview
        //=======================================================

        if
        (
            this.companyLogoPreviewUrl
            &&
            this.companyLogoPreviewUrl.startsWith('blob:')
        )
        {
            URL.revokeObjectURL(
                this.companyLogoPreviewUrl
            );
        }
    }



    //===========================================================
    // Initialize Mode
    //===========================================================

    private initializeMode():
        void
    {
        const url =
            this.router.url.toLowerCase();


        //=======================================================
        // View Mode
        //=======================================================

        if
        (
            url.includes('/view/')
        )
        {
            this.mode =
                'view';
        }


        //=======================================================
        // Edit Mode
        //=======================================================

        else if
        (
            url.includes('/edit/')
        )
        {
            this.mode =
                'edit';
        }


        //=======================================================
        // Add Mode
        //=======================================================

        else
        {
            this.mode =
                'add';
        }


        //=======================================================
        // Resolve Entity Id
        //=======================================================

        const id =
            this.resolveEntityId();


        //=======================================================
        // Existing Entity
        //=======================================================

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


        //=======================================================
        // New Entity
        //=======================================================

        this.initializeEntity();
    }



    //===========================================================
    // Resolve Entity Id
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
        {
            CompanyId:0,

            CompanyCode:'',

            CompanyName:'',

            CompanyShortName:'',

            AddressLine1:'',

            AddressLine2:'',

            Phone:'',

            Mobile:'',

            Email:'',

            Website:'',

            BINNo:'',

            OwnershipType:'',

            EconomicActivity:'',

            TINNo:'',

            TradeLicenseNo:'',

            CompanyLogoPath:'',

            Remarks:'',

            IsActive:true
        };


        this.selectedLogoFile =
            null;


        this.logoUploading =
            false;


        this.companyLogoPreviewUrl =
            '';


        this.generateDefaults();
    }



    //===========================================================
    // Generate Defaults
    //===========================================================

    private generateDefaults():
        void
    {
        //=======================================================
        // Existing Record
        //=======================================================

        if
        (
            this.entityId > 0
        )
        {
            return;
        }


        //=======================================================
        // Get Defaults
        //=======================================================

        this.companyservice
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    response:
                        CompanyDefaults
                ): void =>
                {
                    this.entity.CompanyCode =
                        response.Code;


                    this.entity.IsActive =
                        true;


                    this.setInitialFormState();
                },


                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Generate Company Defaults Error',

                        error
                    );


                    //===================================================
                    // Fallback Code
                    //===================================================

                    this.companyservice
                        .getNextCode()
                        .subscribe
                        ({
                            next:
                            (
                                code:
                                    string
                            ): void =>
                            {
                                this.entity.CompanyCode =
                                    code;


                                this.entity.IsActive =
                                    true;


                                this.setInitialFormState();
                            },


                            error:
                            (
                                codeError:
                                    unknown
                            ): void =>
                            {
                                console.error(
                                    'Generate Company Code Error',

                                    codeError
                                );


                                //===================================================
                                // Final Fallback Code
                                //===================================================

                                this.entity.CompanyCode =
                                    'CMP-01';


                                this.entity.IsActive =
                                    true;


                                this.setInitialFormState();
                            }
                        });
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
        this.companyservice
            .getById(
                this.entityId
            )
            .subscribe
            ({
                next:
                (
                    response:
                        any
                ): void =>
                {
                    this.entity =
                    {
                        CompanyId:
                            Number(
                                response?.CompanyId
                                ??
                                response?.companyId
                                ??
                                0
                            ),

                        CompanyCode:
                            response?.CompanyCode
                            ??
                            response?.companyCode
                            ??
                            '',

                        CompanyName:
                            response?.CompanyName
                            ??
                            response?.companyName
                            ??
                            '',

                        CompanyShortName:
                            response?.CompanyShortName
                            ??
                            response?.companyShortName
                            ??
                            '',

                        AddressLine1:
                            response?.AddressLine1
                            ??
                            response?.addressLine1
                            ??
                            '',

                        AddressLine2:
                            response?.AddressLine2
                            ??
                            response?.addressLine2
                            ??
                            '',

                        Phone:
                            response?.Phone
                            ??
                            response?.phone
                            ??
                            '',

                        Mobile:
                            response?.Mobile
                            ??
                            response?.mobile
                            ??
                            '',

                        Email:
                            response?.Email
                            ??
                            response?.email
                            ??
                            '',

                        Website:
                            response?.Website
                            ??
                            response?.website
                            ??
                            '',

                        BINNo:
                            response?.BINNo
                            ??
                            response?.binNo
                            ??
                            '',

                        OwnershipType:
                            response?.OwnershipType
                            ??
                            response?.ownershipType
                            ??
                            '',

                        EconomicActivity:
                            response?.EconomicActivity
                            ??
                            response?.economicActivity
                            ??
                            '',

                        TINNo:
                            response?.TINNo
                            ??
                            response?.tinNo
                            ??
                            '',

                        TradeLicenseNo:
                            response?.TradeLicenseNo
                            ??
                            response?.tradeLicenseNo
                            ??
                            '',

                        CompanyLogoPath:
                            response?.CompanyLogoPath
                            ??
                            response?.companyLogoPath
                            ??
                            '',

                        Remarks:
                            response?.Remarks
                            ??
                            response?.remarks
                            ??
                            '',

                        IsActive:
                            Boolean(
                                response?.IsActive
                                ??
                                response?.isActive
                                ??
                                true
                            )
                    };


                    this.selectedLogoFile =
                        null;


                    this.logoUploading =
                        false;


                    this.companyLogoPreviewUrl =
                        this.buildLogoUrl(
                            this.entity.CompanyLogoPath
                        );


                    this.originalEntity =
                        JSON.stringify(
                            this.entity
                        );


                    this.hasChanges =
                        false;


                    this.cdr.detectChanges();
                },


                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Company Error',

                        error
                    );


                    this.toast.error(
                        'Error',

                        'Failed to load Company.'
                    );


                    this.onBackToList();
                }
            });
    }



    //===========================================================
    // Build Company Logo URL
    //===========================================================

    private buildLogoUrl
    (
        logoPath:
            string
    ):
        string
    {
        if
        (
            !logoPath
            ||
            !logoPath.trim()
        )
        {
            return '';
        }


        const trimmedPath =
            logoPath.trim();


        //=======================================================
        // Absolute URL
        //=======================================================

        if
        (
            trimmedPath.startsWith(
                'http://'
            )
            ||
            trimmedPath.startsWith(
                'https://'
            )
            ||
            trimmedPath.startsWith(
                'data:'
            )
            ||
            trimmedPath.startsWith(
                'blob:'
            )
        )
        {
            return trimmedPath;
        }


        //=======================================================
        // API Base URL
        //=======================================================

        const apiBaseUrl =
            this.getApiBaseUrl();


        //=======================================================
        // Relative URL
        //=======================================================

        if
        (
            trimmedPath.startsWith('/')
        )
        {
            return `${apiBaseUrl}${trimmedPath}`;
        }


        return `${apiBaseUrl}/${trimmedPath}`;
    }



    //===========================================================
    // Get API Base URL
    //===========================================================

    private getApiBaseUrl():
        string
    {
        const apiUrl =
            this.companyservice.getApiBaseUrl();


        return apiUrl.replace(
            /\/settings\/general-settings\/company\/?$/,
            ''
        );
    }



    //===========================================================
    // Company Logo Selected / Removed
    //===========================================================

    onCompanyLogoChange
    (
        file:
            File | null
    ):
        void
    {
        //=======================================================
        // Logo Removed
        //=======================================================

        if
        (
            file === null
        )
        {
            this.onRemoveCompanyLogo();

            return;
        }


        //=======================================================
        // Invalid File
        //=======================================================

        if
        (
            !file
        )
        {
            return;
        }


        //=======================================================
        // View Mode / Saving
        //=======================================================

        if
        (
            this.isViewMode
            ||
            this.isSaving
        )
        {
            return;
        }


        //=======================================================
        // Company Code Validation
        //=======================================================

        if
        (
            !this.entity.CompanyCode?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Company Code is required before uploading the logo.'
            );

            return;
        }


        this.selectedLogoFile =
            file;


        //=======================================================
        // Local Preview
        //=======================================================

        if
        (
            this.companyLogoPreviewUrl
            &&
            this.companyLogoPreviewUrl.startsWith('blob:')
        )
        {
            URL.revokeObjectURL(
                this.companyLogoPreviewUrl
            );
        }


        this.companyLogoPreviewUrl =
            URL.createObjectURL(
                file
            );


        this.checkForChanges();


        this.cdr.detectChanges();


        //=======================================================
        // Upload Logo
        //=======================================================

        this.logoUploading =
            true;


        this.companyservice
            .uploadLogo(
                file,

                this.entity.CompanyCode.trim()
            )
            .subscribe
            ({
                next:
                (
                    path:
                        string
                ): void =>
                {
                    if
                    (
                        !path
                        ||
                        !path.trim()
                    )
                    {
                        this.logoUploading =
                            false;


                        this.toast.error(
                            'Logo Upload',

                            'Logo was uploaded but no logo path was returned.'
                        );


                        return;
                    }


                    this.entity.CompanyLogoPath =
                        path.trim();


                    this.logoUploading =
                        false;


                    this.checkForChanges();


                    this.cdr.detectChanges();
                },


                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Company Logo Upload Error',

                        error
                    );


                    this.logoUploading =
                        false;


                    this.selectedLogoFile =
                        null;


                    this.entity.CompanyLogoPath =
                        '';


                    this.companyLogoPreviewUrl =
                        '';


                    const message =
                        (error as any)?.error
                        ??
                        'Failed to upload Company Logo.';


                    this.toast.error(
                        'Logo Upload',

                        message
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Remove Company Logo
    // ----------------------------------------------------------
    // Clears the logo from the current Company entity.
    //
    // The actual database update is performed when the user
    // clicks Update.
    //
    // CompanyLogoPath is intentionally set to an empty string
    // so the Update payload persists the removal.
    //===========================================================

    onRemoveCompanyLogo():
        void
    {
        //=======================================================
        // View Mode / Saving
        //=======================================================

        if
        (
            this.isViewMode
            ||
            this.isSaving
        )
        {
            return;
        }


        //=======================================================
        // Logo Upload In Progress
        //=======================================================

        if
        (
            this.logoUploading
        )
        {
            this.toast.error(
                'Logo Upload',

                'Please wait until the Company Logo upload is complete.'
            );

            return;
        }


        //=======================================================
        // Revoke Local Blob URL
        //=======================================================

        if
        (
            this.companyLogoPreviewUrl
            &&
            this.companyLogoPreviewUrl.startsWith('blob:')
        )
        {
            URL.revokeObjectURL(
                this.companyLogoPreviewUrl
            );
        }


        //=======================================================
        // Clear Logo State
        //=======================================================

        this.selectedLogoFile =
            null;


        this.entity.CompanyLogoPath =
            '';


        this.companyLogoPreviewUrl =
            '';


        //=======================================================
        // Track Changes
        //=======================================================

        this.checkForChanges();


        this.cdr.detectChanges();
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
            this.originalEntity
            ||
            this.selectedLogoFile !== null;
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
    // Progress Dialog (Animated)
    //
    // The bar eases from 0% toward 90% while the request runs,
    // then jumps to 100% on success before closing.
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


        // Determinate : we drive the percentage ourselves
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
                    // Ease-out : big steps first, smaller near the ceiling
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


    //-----------------------------------------------------------
    // Success : show 100%, pause briefly, then close
    //-----------------------------------------------------------

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


    //-----------------------------------------------------------
    // Error : close immediately, then report
    //-----------------------------------------------------------

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
    //
    // Keeps the progress dialog visible for at least
    // MIN_PROGRESS_MS, on both success and error.
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
        //=======================================================
        // View Mode / Already Saving
        //=======================================================

        if
        (
            this.isViewMode
            ||
            this.isSaving
        )
        {
            return;
        }


        //=======================================================
        // Logo Upload In Progress
        //=======================================================

        if
        (
            this.logoUploading
        )
        {
            this.toast.error(
                'Logo Upload',

                'Please wait until the Company Logo upload is complete.'
            );

            return;
        }


        //=======================================================
        // Validation
        //=======================================================

        if
        (
            !this.entity.CompanyCode?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Company Code is required.'
            );

            return;
        }


        if
        (
            !this.entity.CompanyName?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Company Name is required.'
            );

            return;
        }


        //=======================================================
        // Add
        //=======================================================

        if
        (
            this.mode === 'add'
        )
        {
            this.saveCreate();

            return;
        }


        //=======================================================
        // Update
        //=======================================================

        this.saveUpdate();
    }



    //===========================================================
    // Create
    //===========================================================

    private saveCreate():
        void
    {
        const model:
            CreateCompany =
        {
            CompanyCode:
                this.entity.CompanyCode.trim(),

            CompanyName:
                this.entity.CompanyName.trim(),

            CompanyShortName:
                this.entity.CompanyShortName?.trim()
                ??
                '',

            AddressLine1:
                this.entity.AddressLine1?.trim()
                ??
                '',

            AddressLine2:
                this.entity.AddressLine2?.trim()
                ??
                '',

            Phone:
                this.entity.Phone?.trim()
                ??
                '',

            Mobile:
                this.entity.Mobile?.trim()
                ??
                '',

            Email:
                this.entity.Email?.trim()
                ??
                '',

            Website:
                this.entity.Website?.trim()
                ??
                '',

            BINNo:
                this.entity.BINNo?.trim()
                ??
                '',

            OwnershipType:
                this.entity.OwnershipType?.trim()
                ??
                '',

            EconomicActivity:
                this.entity.EconomicActivity?.trim()
                ??
                '',

            TINNo:
                this.entity.TINNo?.trim()
                ??
                '',

            TradeLicenseNo:
                this.entity.TradeLicenseNo?.trim()
                ??
                '',

            CompanyLogoPath:
                this.entity.CompanyLogoPath?.trim()
                ??
                '',

            Remarks:
                this.entity.Remarks?.trim()
                ??
                '',

            IsActive:
                this.entity.IsActive
        };


        this.startProgress(
            'Saving Company',

            'Please wait while the company is being saved...'
        );


        this.withMinimumDuration(
            this.companyservice.create(
                model
            )
        )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.completeProgress(

                        'Company saved.',

                        () =>
                        {
                            this.selectedLogoFile =
                                null;


                            this.setInitialFormState();


                            this.toast.success(
                                'Success',

                                'Company created successfully.'
                            );


                            this.onBackToList();
                        }
                    );
                },


                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Create Company Error',

                        error
                    );


                    this.failProgress(
                        () =>
                        {
                            const message =
                                (error as any)?.error
                                ??
                                'Failed to create Company.';


                            this.toast.error(
                                'Validation',

                                message
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
        const model:
            UpdateCompany =
        {
            CompanyId:
                this.entity.CompanyId,

            CompanyCode:
                this.entity.CompanyCode.trim(),

            CompanyName:
                this.entity.CompanyName.trim(),

            CompanyShortName:
                this.entity.CompanyShortName?.trim()
                ??
                '',

            AddressLine1:
                this.entity.AddressLine1?.trim()
                ??
                '',

            AddressLine2:
                this.entity.AddressLine2?.trim()
                ??
                '',

            Phone:
                this.entity.Phone?.trim()
                ??
                '',

            Mobile:
                this.entity.Mobile?.trim()
                ??
                '',

            Email:
                this.entity.Email?.trim()
                ??
                '',

            Website:
                this.entity.Website?.trim()
                ??
                '',

            BINNo:
                this.entity.BINNo?.trim()
                ??
                '',

            OwnershipType:
                this.entity.OwnershipType?.trim()
                ??
                '',

            EconomicActivity:
                this.entity.EconomicActivity?.trim()
                ??
                '',

            TINNo:
                this.entity.TINNo?.trim()
                ??
                '',

            TradeLicenseNo:
                this.entity.TradeLicenseNo?.trim()
                ??
                '',

            CompanyLogoPath:
                this.entity.CompanyLogoPath?.trim()
                ??
                '',

            Remarks:
                this.entity.Remarks?.trim()
                ??
                '',

            IsActive:
                this.entity.IsActive
        };


        //=======================================================
        // Update
        // ------------------------------------------------------
        // CompanyLogoPath is deliberately included even when
        // empty. This allows Remove Logo to be persisted.
        //=======================================================

        this.startProgress(
            'Updating Company',

            'Please wait while the company is being updated...'
        );


        this.withMinimumDuration(
            this.companyservice.update(
                model
            )
        )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.completeProgress(

                        'Company updated.',

                        () =>
                        {
                            this.selectedLogoFile =
                                null;


                            this.setInitialFormState();


                            this.toast.success(
                                'Success',

                                'Company updated successfully.'
                            );


                            this.onBackToList();
                        }
                    );
                },


                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Update Company Error',

                        error
                    );


                    this.failProgress(
                        () =>
                        {
                            const message =
                                (error as any)?.error
                                ??
                                'Failed to update Company.';


                            this.toast.error(
                                'Validation',

                                message
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
        //=======================================================
        // Saving In Progress
        //=======================================================

        if
        (
            this.isSaving
        )
        {
            return;
        }


        //=======================================================
        // Edit Mode
        //=======================================================

        if
        (
            this.mode === 'edit'
        )
        {
            this.loadEntity();


            return;
        }


        //=======================================================
        // Add Mode
        //=======================================================

        this.initializeEntity();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Back To List
    //===========================================================

    onBackToList():
        void
    {
        if
        (
            !this.hasChanges
        )
        {
            void this.router.navigate
            (
                [
                    '/settings',

                    'general-settings',

                    'company',

                    'list'
                ]
            );


            return;
        }


        this.confirmDialog.open(

            'Cancel Changes',

            'Any unsaved changes will be lost. Do you want to leave this page?',


            () =>
            {
                void this.router.navigate
                (
                    [
                        '/settings',

                        'general-settings',

                        'company',

                        'list'
                    ]
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
        return this.mode === 'edit'
            ? 'Update'
            : 'Save';
    }



    //===========================================================
    // View Mode
    //===========================================================

    get isViewMode():
        boolean
    {
        return this.mode === 'view';
    }



    //===========================================================
    // Edit Mode
    //===========================================================

    get isEditMode():
        boolean
    {
        return this.mode === 'edit';
    }



    //===========================================================
    // Add Mode
    //===========================================================

    get isAddMode():
        boolean
    {
        return this.mode === 'add';
    }



    //===========================================================
    // Close
    //===========================================================

    close():
        void
    {
        this.onBackToList();
    }



    //===========================================================
    // Refresh
    //===========================================================

    refresh():
        void
    {
        if
        (
            this.mode === 'edit'
            ||
            this.mode === 'view'
        )
        {
            this.loadEntity();

            return;
        }


        this.initializeEntity();


        this.cdr.detectChanges();
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