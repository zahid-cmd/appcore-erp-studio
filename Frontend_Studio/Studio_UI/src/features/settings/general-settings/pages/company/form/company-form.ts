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
    FormsModule
}
from '@angular/forms';


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

        ConfirmDialogComponent
    ],


    templateUrl:'./company-form.html',


    styleUrls:
    [
        './company-form.css'
    ]
})


export class CompanyForm
implements OnInit
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



    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.initializeMode();
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
                    console.log(
                        'Company API Response:',

                        response
                    );


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


                    console.log(
                        'Company Form Entity:',

                        this.entity
                    );


                    console.log(
                        'Company Logo URL:',

                        this.companyLogoPreviewUrl
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
        // View Mode
        //=======================================================

        if
        (
            this.isViewMode
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


                    console.log(
                        'Company Logo Path:',

                        this.entity.CompanyLogoPath
                    );
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
        // View Mode
        //=======================================================

        if
        (
            this.isViewMode
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
    // Save
    //===========================================================

    onSave():
        void
    {
        //=======================================================
        // View Mode
        //=======================================================

        if
        (
            this.isViewMode
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


        this.companyservice
            .create(
                model
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.originalEntity =
                        JSON.stringify(
                            this.entity
                        );


                    this.hasChanges =
                        false;


                    this.toast.success(
                        'Success',

                        'Company created successfully.'
                    );


                    this.onBackToList();
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


                    const message =
                        (error as any)?.error
                        ??
                        'Failed to create Company.';


                    this.toast.error(
                        'Validation',

                        message
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

        this.companyservice
            .update(
                model
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.originalEntity =
                        JSON.stringify(
                            this.entity
                        );


                    this.hasChanges =
                        false;


                    this.toast.success(
                        'Success',

                        'Company updated successfully.'
                    );


                    this.onBackToList();
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


                    const message =
                        (error as any)?.error
                        ??
                        'Failed to update Company.';


                    this.toast.error(
                        'Validation',

                        message
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