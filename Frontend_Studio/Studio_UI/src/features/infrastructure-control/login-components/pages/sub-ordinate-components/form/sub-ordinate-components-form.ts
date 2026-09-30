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

import { environment } 
from '../../../../../../environments/environment';

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
    SubOrdinateComponents,

    CreateSubOrdinateComponents,

    UpdateSubOrdinateComponents
}
from '../../../models/sub-ordinate-components.model';

import
{
    SubOrdinateComponentsService
}
from '../../../services/sub-ordinate-components.service';


//===============================================================
// Component
//===============================================================

@Component
(
    {
        selector:
            'sub-ordinate-components-form',

        standalone:
            true,

        imports:
        [
            CommonModule,

            FormsModule,


            //===================================================
            // Layout
            //===================================================

            PageHeaderComponent,

            PageToolbarComponent,

            CommandCenterComponent,

            ControlTabsComponent,

            PageCanvasComponent,

            FormGridComponent,

            FormSectionComponent,


            //===================================================
            // Form Controls
            //===================================================

            TextboxComponent,

            DropdownComponent,

            ImageHubComponent,


            //===================================================
            // Utilities
            //===================================================

            ToastComponent,

            ConfirmDialogComponent
        ],


        templateUrl:
            './sub-ordinate-components-form.html',


        styleUrls:
        [
            './sub-ordinate-components-form.css'
        ]
    }
)


//===============================================================
// Sub Ordinate Components Form Component
//===============================================================

export class SubOrdinateComponentsForm
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);


    private readonly router =
        inject(Router);


    private readonly subOrdinateComponentsService =
        inject(SubOrdinateComponentsService);


    private readonly confirmDialog =
        inject(ConfirmDialogService);


    private readonly toast =
        inject(ToastService);


    private readonly cdr =
        inject(ChangeDetectorRef);



    //===========================================================
    // Fixed Rendering Folder
    //===========================================================

    private readonly renderingFolder =
        'Frontend_Studio\\Studio_UI\\src\\shared\\components';



    //===========================================================
    // Fixed Registration File Path
    //===========================================================

    private readonly registrationFilePath =
        'Frontend_Studio\\Studio_UI\\src\\core\\component-renderer\\component-renderer.ts';



    //===========================================================
    // API Image Base URL
    //===========================================================

    /*
       The backend returns a relative image path.

       Example:

       /uploads/sub-ordinate-components/1/light.jpg

       This method converts it into a browser URL.
    */

    private readonly apiBaseUrl =
        environment.apiUrl
            .replace(
                /\/api\/?$/,
                ''
            );



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
        'Sub Ordinate Components';


    entityName:
        string =
        'Sub Ordinate Component';



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
                id:
                    'general',

                label:
                    this.tabTitle
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
                text:
                    'Active',

                value:
                    true
            },

            {
                text:
                    'Inactive',

                value:
                    false
            }
        ];



    //===========================================================
    // Background Image - Light
    //===========================================================

    lightBackgroundImageUrl:
        string =
        '';


    lightBackgroundImageFile:
        File | null =
        null;


    private originalLightBackgroundImagePath:
        string =
        '';



    //===========================================================
    // Background Image - Deep
    //===========================================================

    deepBackgroundImageUrl:
        string =
        '';


    deepBackgroundImageFile:
        File | null =
        null;


    private originalDeepBackgroundImagePath:
        string =
        '';



    //===========================================================
    // Image Removal State
    //===========================================================

    removeLightBackgroundImage:
        boolean =
        false;


    removeDeepBackgroundImage:
        boolean =
        false;



    //===========================================================
    // Entity
    //===========================================================

    entity:
        SubOrdinateComponents
    =
    {
        id:
            0,


        //=======================================================
        // Section 1 - General Information
        //=======================================================

        code:
            '',

        name:
            '',

        tabName:
            '',

        icon:
            '',

        displayOrder:
            0,


        //=======================================================
        // Section 2 - Component Information
        //=======================================================

        folderName:
            '',

        featureFolder:
            '',

        featureSubFolder:
            '',

        componentPath:
            '',

        status:
            true,


        //=======================================================
        // Section 3 - File & Registration Information
        //=======================================================

        registrationFilePath:
            this.registrationFilePath,

        htmlFilePath:
            '',

        tsFilePath:
            '',

        cssFilePath:
            '',

        remarks:
            '',


        //=======================================================
        // Section 5 - Background Image Configuration
        //=======================================================

        lightBackgroundImagePath:
            '',

        deepBackgroundImagePath:
            ''
    };



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
        const id =
            Number(
                this.route.snapshot.paramMap.get(
                    'id'
                )
            );


        const url =
            this.router.url.toLowerCase();


        //=======================================================
        // View Mode
        //=======================================================

        if
        (
            url.includes(
                '/view/'
            )
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
            url.includes(
                '/edit/'
            )
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
    // Initialize Entity
    //===========================================================

    private initializeEntity():
        void
    {
        this.clearBackgroundImageState();


        this.entity =
        {
            id:
                0,


            //===================================================
            // Section 1
            //===================================================

            code:
                '',

            name:
                '',

            tabName:
                '',

            icon:
                '',

            displayOrder:
                0,


            //===================================================
            // Section 2
            //===================================================

            folderName:
                '',

            featureFolder:
                '',

            featureSubFolder:
                '',

            componentPath:
                '',

            status:
                true,


            //===================================================
            // Section 3
            //===================================================

            registrationFilePath:
                this.registrationFilePath,

            htmlFilePath:
                '',

            tsFilePath:
                '',

            cssFilePath:
                '',

            remarks:
                '',


            //===================================================
            // Section 5
            //===================================================

            lightBackgroundImagePath:
                '',

            deepBackgroundImagePath:
                ''
        };


        this.subOrdinateComponentsService
            .getAll()
            .subscribe
            (
                {
                    next:
                    (
                        entities:
                            SubOrdinateComponents[]
                    ):
                        void =>
                    {
                        //========================================
                        // Generate Next Code
                        //========================================

                        this.entity.code =
                            this.generateNextCode(
                                entities
                            );


                        //========================================
                        // Generate Next Display Order
                        //========================================

                        this.entity.displayOrder =
                            this.generateNextDisplayOrder(
                                entities
                            );


                        //========================================
                        // Load Last Created Folder Information
                        //========================================

                        const lastCreatedEntity =
                            this.getLastCreatedEntity(
                                entities
                            );


                        if
                        (
                            lastCreatedEntity
                        )
                        {
                            this.entity.folderName =
                                lastCreatedEntity.folderName
                                    ?.trim()
                                    || '';


                            this.generateFeatureFolder();


                            this.generateFeatureSubFolder();


                            this.entity.componentPath =
                                this.generateComponentPath();


                            this.entity.htmlFilePath =
                                this.generateHtmlFilePath();


                            this.entity.tsFilePath =
                                this.generateTsFilePath();


                            this.entity.cssFilePath =
                                this.generateCssFilePath();


                            this.entity.registrationFilePath =
                                this.registrationFilePath;
                        }


                        else
                        {
                            this.updateGeneratedFields();
                        }


                        this.storeOriginalState();


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
                            'Generate Sub Ordinate Components Defaults Error',

                            error
                        );


                        this.entity.code =
                            'SOC-001';


                        this.entity.displayOrder =
                            1;


                        this.updateGeneratedFields();


                        this.storeOriginalState();


                        this.cdr.detectChanges();
                    }
                }
            );
    }



    //===========================================================
    // Get Last Created Entity
    //===========================================================

    private getLastCreatedEntity
    (
        entities:
            SubOrdinateComponents[]
    ):
        SubOrdinateComponents | null
    {
        if
        (
            !entities
            ||
            entities.length === 0
        )
        {
            return null;
        }


        let lastCreatedEntity =
            entities[0];


        for
        (
            const entity of entities
        )
        {
            if
            (
                Number(entity.id)
                >
                Number(lastCreatedEntity.id)
            )
            {
                lastCreatedEntity =
                    entity;
            }
        }


        return lastCreatedEntity;
    }



    //===========================================================
    // Generate Next Code
    //===========================================================

    private generateNextCode
    (
        entities:
            SubOrdinateComponents[]
    ):
        string
    {
        let highestNumber =
            0;


        for
        (
            const entity of entities
        )
        {
            const match =
                /^SOC-?(\d+)$/.exec(
                    entity.code
                );


            if
            (
                match
            )
            {
                const number =
                    Number(
                        match[1]
                    );


                if
                (
                    number > highestNumber
                )
                {
                    highestNumber =
                        number;
                }
            }
        }


        return `SOC-${String(
            highestNumber + 1
        ).padStart(
            3,
            '0'
        )}`;
    }



    //===========================================================
    // Generate Lowest Available Display Order
    //===========================================================

    private generateNextDisplayOrder
    (
        entities:
            SubOrdinateComponents[]
    ):
        number
    {
        const usedOrders =
            new Set<number>();


        for
        (
            const entity of entities
        )
        {
            const displayOrder =
                Number(
                    entity.displayOrder
                );


            if
            (
                Number.isInteger(
                    displayOrder
                )
                &&
                displayOrder > 0
            )
            {
                usedOrders.add(
                    displayOrder
                );
            }
        }


        let displayOrder =
            1;


        while
        (
            usedOrders.has(
                displayOrder
            )
        )
        {
            displayOrder++;
        }


        return displayOrder;
    }



    //===========================================================
    // Normalize Folder Value
    //===========================================================

    private normalizeFolderValue
    (
        value:
            string
    ):
        string
    {
        return (value || '')
            .trim()
            .toLowerCase()
            .replace(
                /[^a-z0-9]+/g,
                '-'
            )
            .replace(
                /^-+|-+$/g,
                ''
            );
    }



    //===========================================================
    // Generate Feature Folder
    //===========================================================

    private generateFeatureFolder():
        void
    {
        this.entity.featureFolder =
            this.normalizeFolderValue(
                this.entity.folderName
            );
    }



    //===========================================================
    // Generate Feature Sub Folder
    //===========================================================

    private generateFeatureSubFolder():
        void
    {
        this.entity.featureSubFolder =
            this.normalizeFolderValue(
                this.entity.name
            );
    }



    //===========================================================
    // Generate Component Path
    //===========================================================

    private generateComponentPath():
        string
    {
        const featureFolder =
            this.entity.featureFolder
                ?.trim();


        const featureSubFolder =
            this.entity.featureSubFolder
                ?.trim();


        if
        (
            !featureFolder
            ||
            !featureSubFolder
        )
        {
            return '';
        }


        return `${this.renderingFolder}\\${featureFolder}\\${featureSubFolder}`;
    }



    //===========================================================
    // Generate HTML File Path
    //===========================================================

    private generateHtmlFilePath():
        string
    {
        const componentPath =
            this.entity.componentPath
                ?.trim();


        const featureSubFolder =
            this.entity.featureSubFolder
                ?.trim();


        if
        (
            !componentPath
            ||
            !featureSubFolder
        )
        {
            return '';
        }


        return `${componentPath}\\${featureSubFolder}.html`;
    }



    //===========================================================
    // Generate TS File Path
    //===========================================================

    private generateTsFilePath():
        string
    {
        const componentPath =
            this.entity.componentPath
                ?.trim();


        const featureSubFolder =
            this.entity.featureSubFolder
                ?.trim();


        if
        (
            !componentPath
            ||
            !featureSubFolder
        )
        {
            return '';
        }


        return `${componentPath}\\${featureSubFolder}.ts`;
    }



    //===========================================================
    // Generate CSS File Path
    //===========================================================

    private generateCssFilePath():
        string
    {
        const componentPath =
            this.entity.componentPath
                ?.trim();


        const featureSubFolder =
            this.entity.featureSubFolder
                ?.trim();


        if
        (
            !componentPath
            ||
            !featureSubFolder
        )
        {
            return '';
        }


        return `${componentPath}\\${featureSubFolder}.css`;
    }



    //===========================================================
    // Update Generated Fields
    //===========================================================

    private updateGeneratedFields():
        void
    {
        this.generateFeatureFolder();


        this.generateFeatureSubFolder();


        this.entity.componentPath =
            this.generateComponentPath();


        this.entity.htmlFilePath =
            this.generateHtmlFilePath();


        this.entity.tsFilePath =
            this.generateTsFilePath();


        this.entity.cssFilePath =
            this.generateCssFilePath();


        this.entity.registrationFilePath =
            this.registrationFilePath;
    }



    //===========================================================
    // Build Image URL
    //===========================================================

    private buildImageUrl
    (
        imagePath:
            string
    ):
        string
    {
        if
        (
            !imagePath
        )
        {
            return '';
        }


        const value =
            imagePath.trim();


        if
        (
            !value
        )
        {
            return '';
        }


        //=======================================================
        // Already Absolute
        //=======================================================

        if
        (
            value.startsWith(
                'http://'
            )
            ||
            value.startsWith(
                'https://'
            )
            ||
            value.startsWith(
                'data:'
            )
            ||
            value.startsWith(
                'blob:'
            )
        )
        {
            return value;
        }


        //=======================================================
        // Absolute Root Relative Path
        //=======================================================

        if
        (
            value.startsWith(
                '/'
            )
        )
        {
            return `${this.apiBaseUrl}${value}`;
        }


        //=======================================================
        // Relative Path
        //=======================================================

        return `${this.apiBaseUrl}/${value}`;
    }



    //===========================================================
    // Load Entity
    //===========================================================

    private loadEntity():
        void
    {
        this.subOrdinateComponentsService
            .getById(
                this.entityId
            )
            .subscribe
            (
                {
                    next:
                    (
                        response:
                            SubOrdinateComponents
                    ):
                        void =>
                    {
                        this.clearBackgroundImageState();


                        this.entity =
                            response;


                        //========================================
                        // Rebuild Generated Fields
                        //========================================

                        this.updateGeneratedFields();


                        //========================================
                        // Existing Light Image
                        //========================================

                        this.entity.lightBackgroundImagePath =
                            this.entity.lightBackgroundImagePath
                            ||
                            '';


                        this.entity.deepBackgroundImagePath =
                            this.entity.deepBackgroundImagePath
                            ||
                            '';


                        this.lightBackgroundImageUrl =
                            this.buildImageUrl(
                                this.entity.lightBackgroundImagePath
                            );


                        this.deepBackgroundImageUrl =
                            this.buildImageUrl(
                                this.entity.deepBackgroundImagePath
                            );


                        //========================================
                        // Reset New File State
                        //========================================

                        this.lightBackgroundImageFile =
                            null;


                        this.deepBackgroundImageFile =
                            null;


                        this.removeLightBackgroundImage =
                            false;


                        this.removeDeepBackgroundImage =
                            false;


                        //========================================
                        // Store Original Image Paths
                        //========================================

                        this.originalLightBackgroundImagePath =
                            this.entity.lightBackgroundImagePath;


                        this.originalDeepBackgroundImagePath =
                            this.entity.deepBackgroundImagePath;


                        //========================================
                        // Store Original State
                        //========================================

                        this.storeOriginalState();


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
                            'Load Sub Ordinate Component Error',

                            error
                        );


                        this.toast.error(
                            'Error',

                            this.getErrorMessage(
                                error,

                                'Failed to load Sub Ordinate Component.'
                            )
                        );


                        this.onBackToList();
                    }
                }
            );
    }



    //===========================================================
    // Store Original State
    //===========================================================

    private storeOriginalState():
        void
    {
        this.originalEntity =
            JSON.stringify(
                this.entity
            );


        this.originalLightBackgroundImagePath =
            this.entity.lightBackgroundImagePath
            ||
            '';


        this.originalDeepBackgroundImagePath =
            this.entity.deepBackgroundImagePath
            ||
            '';


        this.hasChanges =
            false;
    }



    //===========================================================
    // Track Changes
    //===========================================================

    checkForChanges():
        void
    {
        const entityChanged =
            JSON.stringify(
                this.entity
            )
            !==
            this.originalEntity;


        const lightImageChanged =
            this.lightBackgroundImageFile !== null
            ||
            this.removeLightBackgroundImage;


        const deepImageChanged =
            this.deepBackgroundImageFile !== null
            ||
            this.removeDeepBackgroundImage;


        this.hasChanges =
            entityChanged
            ||
            lightImageChanged
            ||
            deepImageChanged;
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
    // Light Background Image Changed
    //===========================================================

    onLightBackgroundImageChange
    (
        file:
            File | null
    ):
        void
    {
        this.releaseObjectUrl(
            this.lightBackgroundImageUrl
        );


        this.lightBackgroundImageFile =
            file;


        if
        (
            file
        )
        {
            this.removeLightBackgroundImage =
                false;


            this.lightBackgroundImageUrl =
                URL.createObjectURL(
                    file
                );
        }


        else
        {
            this.lightBackgroundImageUrl =
                '';


            this.removeLightBackgroundImage =
                true;
        }


        this.checkForChanges();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Deep Background Image Changed
    //===========================================================

    onDeepBackgroundImageChange
    (
        file:
            File | null
    ):
        void
    {
        this.releaseObjectUrl(
            this.deepBackgroundImageUrl
        );


        this.deepBackgroundImageFile =
            file;


        if
        (
            file
        )
        {
            this.removeDeepBackgroundImage =
                false;


            this.deepBackgroundImageUrl =
                URL.createObjectURL(
                    file
                );
        }


        else
        {
            this.deepBackgroundImageUrl =
                '';


            this.removeDeepBackgroundImage =
                true;
        }


        this.checkForChanges();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Release Object URL
    //===========================================================

    private releaseObjectUrl
    (
        url:
            string
    ):
        void
    {
        if
        (
            url
            &&
            url.startsWith(
                'blob:'
            )
        )
        {
            URL.revokeObjectURL(
                url
            );
        }
    }



    //===========================================================
    // Clear Background Image State
    //===========================================================

    private clearBackgroundImageState():
        void
    {
        this.releaseObjectUrl(
            this.lightBackgroundImageUrl
        );


        this.releaseObjectUrl(
            this.deepBackgroundImageUrl
        );


        this.lightBackgroundImageUrl =
            '';


        this.deepBackgroundImageUrl =
            '';


        this.lightBackgroundImageFile =
            null;


        this.deepBackgroundImageFile =
            null;


        this.removeLightBackgroundImage =
            false;


        this.removeDeepBackgroundImage =
            false;


        this.originalLightBackgroundImagePath =
            '';


        this.originalDeepBackgroundImagePath =
            '';
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
        // Generate Fields
        //=======================================================

        this.updateGeneratedFields();


        //=======================================================
        // Validation
        //=======================================================

        if
        (
            !this.entity.name?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Name is required.'
            );

            return;
        }


        if
        (
            !this.entity.tabName?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Tab Name is required.'
            );

            return;
        }


        if
        (
            !this.entity.icon?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Icon is required.'
            );

            return;
        }


        if
        (
            !this.entity.folderName?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Folder Name is required.'
            );

            return;
        }


        if
        (
            !this.entity.featureFolder?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Feature Folder could not be generated.'
            );

            return;
        }


        if
        (
            !this.entity.featureSubFolder?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Feature Sub Folder could not be generated.'
            );

            return;
        }



        //=======================================================
        // Create
        //=======================================================

        if
        (
            this.mode === 'add'
        )
        {
            const model:
                CreateSubOrdinateComponents =
            {
                name:
                    this.entity.name,

                tabName:
                    this.entity.tabName,

                icon:
                    this.entity.icon,

                folderName:
                    this.entity.folderName,

                featureFolder:
                    this.entity.featureFolder,

                featureSubFolder:
                    this.entity.featureSubFolder,

                componentPath:
                    this.entity.componentPath,

                registrationFilePath:
                    this.entity.registrationFilePath,

                htmlFilePath:
                    this.entity.htmlFilePath,

                tsFilePath:
                    this.entity.tsFilePath,

                cssFilePath:
                    this.entity.cssFilePath,

                displayOrder:
                    this.entity.displayOrder,

                status:
                    this.entity.status,

                remarks:
                    this.entity.remarks,


                //==============================================
                // Background Images
                //==============================================

                lightBackgroundImage:
                    this.lightBackgroundImageFile,

                deepBackgroundImage:
                    this.deepBackgroundImageFile
            };


            this.subOrdinateComponentsService
                .create(
                    model
                )
                .subscribe
                (
                    {
                        next:
                        (
                            id:
                                number
                        ):
                            void =>
                        {
                            this.entity.id =
                                id;


                            this.storeOriginalState();


                            this.toast.success(
                                'Success',

                                'Sub Ordinate Component created successfully.'
                            );


                            this.onBackToList();
                        },


                        error:
                        (
                            error:
                                unknown
                        ):
                            void =>
                        {
                            console.error(
                                'Create Sub Ordinate Component Error',

                                error
                            );


                            this.toast.error(
                                'Validation',

                                this.getErrorMessage(
                                    error,

                                    'Failed to create Sub Ordinate Component.'
                                )
                            );
                        }
                    }
                );


            return;
        }



        //=======================================================
        // Update
        //=======================================================

        const model:
            UpdateSubOrdinateComponents =
        {
            id:
                this.entity.id,

            name:
                this.entity.name,

            tabName:
                this.entity.tabName,

            icon:
                this.entity.icon,

            folderName:
                this.entity.folderName,

            featureFolder:
                this.entity.featureFolder,

            featureSubFolder:
                this.entity.featureSubFolder,

            componentPath:
                this.entity.componentPath,

            registrationFilePath:
                this.entity.registrationFilePath,

            htmlFilePath:
                this.entity.htmlFilePath,

            tsFilePath:
                this.entity.tsFilePath,

            cssFilePath:
                this.entity.cssFilePath,

            displayOrder:
                this.entity.displayOrder,

            status:
                this.entity.status,

            remarks:
                this.entity.remarks,

            //=======================================================
            // Background Image Configuration
            //=======================================================

            lightBackgroundImage:
                this.lightBackgroundImageFile,

            deepBackgroundImage:
                this.deepBackgroundImageFile,

            removeLightBackgroundImage:
                this.removeLightBackgroundImage,

            removeDeepBackgroundImage:
                this.removeDeepBackgroundImage
        };

        this.subOrdinateComponentsService
            .update(
                model
            )
            .subscribe
            (
                {
                    next:
                    ():
                        void =>
                    {
                        this.storeOriginalState();


                        this.toast.success(
                            'Success',

                            'Sub Ordinate Component updated successfully.'
                        );


                        this.onBackToList();
                    },


                    error:
                    (
                        error:
                            unknown
                    ):
                        void =>
                    {
                        console.error(
                            'Update Sub Ordinate Component Error',

                            error
                        );


                        this.toast.error(
                            'Validation',

                            this.getErrorMessage(
                                error,

                                'Failed to update Sub Ordinate Component.'
                            )
                        );
                    }
                }
            );
    }



    //===========================================================
    // Extract Error Message
    //===========================================================

    private getErrorMessage
    (
        error:
            any,

        defaultMessage:
            string
    ):
        string
    {
        const response =
            error?.error;


        if
        (
            typeof response === 'string'
            &&
            response.trim()
        )
        {
            return response;
        }


        if
        (
            response?.message
            &&
            typeof response.message === 'string'
        )
        {
            return response.message;
        }


        if
        (
            response?.title
            &&
            typeof response.title === 'string'
        )
        {
            return response.title;
        }


        if
        (
            response?.errors
        )
        {
            const messages:
                string[] =
                [];


            for
            (
                const key of Object.keys(
                    response.errors
                )
            )
            {
                const value =
                    response.errors[key];


                if
                (
                    Array.isArray(
                        value
                    )
                )
                {
                    messages.push(
                        ...value.filter
                        (
                            (
                                message:
                                    unknown
                            ):
                                message is string =>
                                typeof message === 'string'
                        )
                    );
                }


                else if
                (
                    typeof value === 'string'
                )
                {
                    messages.push(
                        value
                    );
                }
            }


            if
            (
                messages.length > 0
            )
            {
                return messages.join(
                    ' '
                );
            }
        }


        if
        (
            typeof response === 'object'
            &&
            response !== null
        )
        {
            try
            {
                return JSON.stringify(
                    response
                );
            }
            catch
            {
                return defaultMessage;
            }
        }


        return defaultMessage;
    }



    //===========================================================
    // Clear
    //===========================================================

    onClear():
        void
    {
        //=======================================================
        // Edit / View Mode
        //=======================================================

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
                    'list'
                ],
                {
                    relativeTo:
                        this.route.parent
                }
            );


            return;
        }


        this.confirmDialog.open(

            'Cancel Changes',

            'Any unsaved changes will be lost. Do you want to leave this page?',


            ():
                void =>
            {
                void this.router.navigate
                (
                    [
                        'list'
                    ],
                    {
                        relativeTo:
                            this.route.parent
                    }
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
    // Folder Name Readonly
    //===========================================================

    get isFolderNameReadonly():
        boolean
    {
        return this.isViewMode;
    }



    //===========================================================
    // Feature Folder Readonly
    //===========================================================

    get isFeatureFolderReadonly():
        boolean
    {
        return true;
    }



    //===========================================================
    // Feature Sub Folder Readonly
    //===========================================================

    get isFeatureSubFolderReadonly():
        boolean
    {
        return true;
    }



    //===========================================================
    // Generated Field Readonly
    //===========================================================

    get isGeneratedFieldReadonly():
        boolean
    {
        return true;
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
        this.updateGeneratedFields();


        this.checkForChanges();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Folder Name Changed
    //===========================================================

    onFolderNameChange():
        void
    {
        this.generateFeatureFolder();


        this.entity.componentPath =
            this.generateComponentPath();


        this.entity.htmlFilePath =
            this.generateHtmlFilePath();


        this.entity.tsFilePath =
            this.generateTsFilePath();


        this.entity.cssFilePath =
            this.generateCssFilePath();


        this.checkForChanges();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Name Changed
    //===========================================================

    onNameChange():
        void
    {
        this.generateFeatureSubFolder();


        this.entity.componentPath =
            this.generateComponentPath();


        this.entity.htmlFilePath =
            this.generateHtmlFilePath();


        this.entity.tsFilePath =
            this.generateTsFilePath();


        this.entity.cssFilePath =
            this.generateCssFilePath();


        this.checkForChanges();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Destroy
    //===========================================================

    ngOnDestroy():
        void
    {
        this.releaseObjectUrl(
            this.lightBackgroundImageUrl
        );


        this.releaseObjectUrl(
            this.deepBackgroundImageUrl
        );
    }

}