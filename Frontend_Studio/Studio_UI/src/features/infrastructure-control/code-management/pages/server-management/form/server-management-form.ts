import { Observable } from 'rxjs';
//===============================================================
// Server Management Form
//
// Add / edit / view a live server. "Test Connection" asks the
// server's Deploy Agent (saved values; save first after a
// change). The agent token is never shown again after saving :
// leave it empty to keep the saved one.
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
    ServerManagement,
    CreateServerManagement,
    UpdateServerManagement,
    ServerConnectionTest,
    SERVER_ENVIRONMENTS
}
from '../../../models/server-management.model';

import
{
    ServerManagementService
}
from '../../../services/server-management.service';


@Component(
{
    selector:'serverManagement-form',
    standalone:true,
    imports:
    [
        CommonModule,
        FormsModule,
        PageHeaderComponent,
        PageToolbarComponent,
        CommandCenterComponent,
        ControlTabsComponent,
        PageCanvasComponent,
        FormGridComponent,
        FormSectionComponent,
        TextboxComponent,
        TextareaComponent,
        DropdownComponent,
        ToastComponent,
        ConfirmDialogComponent
    ],
    templateUrl:'./server-management-form.html',
    styleUrls:
    [
        './server-management-form.css'
    ]
})
export class ServerManagementForm
implements OnInit
{
    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly servermanagementservice =
        inject(ServerManagementService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);


    //===========================================================
    // Mode / Tabs
    //===========================================================

    mode:
        'add' | 'edit' | 'view' =
        'add';

    // Public Id from the link (uuid v7)
    entityId:
        string =
        '';

    pageTitle:
        string =
        'Server Management';

    selectedTab:
        string =
        'general';

    get tabs():
        ControlTab[]
    {
        const label =
            this.mode === 'add'
                ? 'Add Server'
                : this.mode === 'edit'
                    ? 'Update Server'
                    : 'View Server';

        return [
            {
                id:'general',
                label
            }
        ];
    }


    //===========================================================
    // Lists
    //===========================================================

    readonly environmentItems:
        any[] =
        SERVER_ENVIRONMENTS.map(
            value => ({ text:value, value })
        );

    readonly statusItems:
        any[] =
    [
        { text:'Active',   value:true },
        { text:'Inactive', value:false }
    ];


    //===========================================================
    // Entity
    //===========================================================

    entity:
        ServerManagement =
        this.emptyEntity();

    // port as text for the textbox
    agentPortText:
        string =
        '5099';

    // new token typed in the form ('' = keep the saved one)
    agentToken:
        string =
        '';

    private originalEntity:
        string =
        '';

    hasChanges:
        boolean =
        false;


    //===========================================================
    // Test Connection
    //===========================================================

    testing:
        boolean =
        false;

    lastTest:
        ServerConnectionTest | null =
        null;


    //===========================================================
    // Init
    //===========================================================

    ngOnInit():
        void
    {
        const id =
            (this.route.snapshot.paramMap.get('id') ?? '').trim();

        const url =
            this.router.url.toLowerCase();

        this.mode =
            url.includes('/view/')
                ? 'view'
                : url.includes('/edit/')
                    ? 'edit'
                    : 'add';

        if (id)
        {
            this.entityId =
                id;

            this.loadEntity();

            return;
        }

        this.initializeEntity();
    }

    private emptyEntity():
        ServerManagement
    {
        return {
            id:0,
            code:'',
            name:'',
            hostAddress:'',
            agentPort:5099,
            hasAgentToken:false,
            appUrl:'',
            environment:'Production',
            lastCheckedDate:null,
            lastCheckStatus:'',
            lastCheckMessage:'',
            agentVersion:'',
            currentRelease:'',
            status:true,
            remarks:''
        };
    }

    private initializeEntity():
        void
    {
        this.entity =
            this.emptyEntity();

        this.agentPortText =
            '5099';

        this.agentToken =
            '';

        this.lastTest =
            null;

        this.servermanagementservice
            .getDefaults()
            .subscribe(
            {
                next:
                    defaults =>
                    {
                        this.entity.code =
                            defaults.code;

                        this.agentPortText =
                            String(defaults.agentPort || 5099);

                        this.markClean();

                        this.cdr.detectChanges();
                    },
                error:
                    () => this.markClean()
            });

        this.markClean();
    }

    private loadEntity():
        void
    {
        this.servermanagementservice
            .getById(
                this.entityId
            )
            .subscribe(
            {
                next:
                    response =>
                    {
                        this.entity =
                            response;

                        this.agentPortText =
                            String(response.agentPort);

                        this.agentToken =
                            '';

                        this.markClean();

                        this.cdr.detectChanges();
                    },
                error:
                    error =>
                    {
                        console.error('Load Server Error', error);

                        this.toast.error(
                            'Error',
                            'Failed to load the server.'
                        );

                        this.goToList();
                    }
            });
    }


    //===========================================================
    // Changes
    //===========================================================

    private snapshot():
        string
    {
        return JSON.stringify(
            {
                e:this.entity,
                p:this.agentPortText,
                t:this.agentToken
            }
        );
    }

    private markClean():
        void
    {
        this.originalEntity =
            this.snapshot();

        this.hasChanges =
            false;
    }

    onValueChange():
        void
    {
        this.hasChanges =
            this.snapshot() !== this.originalEntity;

        this.cdr.detectChanges();
    }


    //===========================================================
    // Labels
    //===========================================================

    get tokenPlaceholder():
        string
    {
        return this.entity.hasAgentToken
            ? 'Saved - leave empty to keep it'
            : 'Agent:Token from the server (C:\\AppCore\\agent\\appsettings.json)';
    }

    get lastCheckedText():
        string
    {
        return this.entity.lastCheckedDate
            ? new Date(this.entity.lastCheckedDate).toLocaleString()
            : 'Never';
    }

    get diskText():
        string
    {
        return this.lastTest?.diskFreeGb == null
            ? ''
            : `${this.lastTest.diskFreeGb} GB free`;
    }

    get saveButtonText():
        string
    {
        return this.mode === 'edit'
            ? 'Update'
            : 'Save';
    }

    get isViewMode():
        boolean
    {
        return this.mode === 'view';
    }

    get isAddMode():
        boolean
    {
        return this.mode === 'add';
    }


    //===========================================================
    // Validate (the server checks again)
    //===========================================================

    private validate():
        string
    {
        const host =
            this.entity.hostAddress.trim();

        const port =
            Number(this.agentPortText);

        if (!this.entity.name.trim())
        {
            return 'Name is required.';
        }

        if (!host)
        {
            return 'Host address is required (the server\'s Tailscale address, e.g. 100.117.11.97).';
        }

        if (/[\s/]|:\/\//.test(host))
        {
            return 'Host address is only the address or machine name, without http:// or a port.';
        }

        if (!Number.isInteger(port) || port < 1 || port > 65535)
        {
            return 'Agent port must be a number between 1 and 65535.';
        }

        if (this.isAddMode && !this.agentToken.trim())
        {
            return 'Agent token is required (the same value as Agent:Token on the server).';
        }

        const url =
            this.entity.appUrl.trim();

        if (url && !/^https?:\/\/\S+$/i.test(url))
        {
            return 'App URL must be a full address, e.g. http://100.117.11.97:8080';
        }

        return '';
    }


    //===========================================================
    // Save
    //===========================================================

    onSave():
        void
    {
        if (this.isViewMode)
        {
            return;
        }

        const problem =
            this.validate();

        if (problem)
        {
            this.toast.error(
                'Validation',
                problem
            );

            return;
        }

        const model:
            CreateServerManagement =
        {
            name:this.entity.name.trim(),
            hostAddress:this.entity.hostAddress.trim(),
            agentPort:Number(this.agentPortText),
            agentToken:this.agentToken.trim(),
            appUrl:this.entity.appUrl.trim(),
            environment:this.entity.environment,
            status:this.entity.status,
            remarks:(this.entity.remarks ?? '').trim()
        };

        const request: Observable<unknown> =
            this.isAddMode
                ? this.servermanagementservice.create(model)
                : this.servermanagementservice.update(
                    this.entityId,
                    {
                        ...model,
                        id:this.entity.id
                    } as UpdateServerManagement
                );

        request.subscribe(
        {
            next:
                () =>
                {
                    this.markClean();

                    this.toast.success(
                        'Success',
                        this.isAddMode
                            ? `Server ${model.name} added. Open it and use Test Connection.`
                            : `Server ${model.name} updated.`
                    );

                    this.goToList();
                },
            error:
                (error: any) =>
                {
                    console.error('Save Server Error', error);

                    this.toast.error(
                        'Validation',
                        error?.error?.message
                        ??
                        (typeof error?.error === 'string' ? error.error : 'Failed to save the server.')
                    );
                }
        });
    }


    //===========================================================
    // Test Connection (saved values)
    //===========================================================

    onTestConnection():
        void
    {
        if
        (
            this.testing
            ||
            this.isAddMode
            ||
            !this.entityId
        )
        {
            return;
        }

        if (this.hasChanges)
        {
            this.toast.warning(
                'Test Connection',
                'Save your changes first : the test uses the saved address and token.'
            );

            return;
        }

        this.testing =
            true;

        this.servermanagementservice
            .testConnection(
                this.entityId
            )
            .subscribe(
            {
                next:
                    result =>
                    {
                        this.testing =
                            false;

                        this.lastTest =
                            result;

                        // reflect the saved check on the page
                        this.entity.lastCheckStatus =
                            result.status;

                        this.entity.lastCheckMessage =
                            result.message;

                        this.entity.lastCheckedDate =
                            result.checkedDate;

                        if (result.success)
                        {
                            this.entity.agentVersion =
                                result.agentVersion;

                            this.entity.currentRelease =
                                result.currentRelease;

                            this.toast.success(
                                'Online',
                                result.message
                            );
                        }
                        else
                        {
                            this.toast.error(
                                result.status,
                                result.message
                            );
                        }

                        this.markClean();

                        this.cdr.detectChanges();
                    },
                error:
                    error =>
                    {
                        this.testing =
                            false;

                        console.error('Test Connection Error', error);

                        this.toast.error(
                            'Test Connection',
                            error?.error?.message
                            ??
                            'The test could not be run.'
                        );

                        this.cdr.detectChanges();
                    }
            });
    }


    //===========================================================
    // Clear / Back
    //===========================================================

    onClear():
        void
    {
        if (this.mode === 'edit')
        {
            this.loadEntity();

            return;
        }

        this.initializeEntity();

        this.cdr.detectChanges();
    }

    onBackToList():
        void
    {
        if (!this.hasChanges)
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
            'primary'
        );
    }

    private goToList():
        void
    {
        void this.router.navigate(
            [ '..', 'list' ],
            { relativeTo:this.route }
        );
    }
}
