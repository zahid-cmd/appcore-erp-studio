<div class="app-form-page"> 
 
    <!-- ===================================================== 
         PAGE HEADER 
    ====================================================== --> 
 
    <app-page-header 
 
        icon="{{PAGE_ICON}}" 
 
        [title]="pageTitle" 
 
        subtitle="{{PAGE_SUBTITLE}}"> 
 
        <app-command-center 
 
            pageHeaderRight 
 
            [command1Text]="saveButtonText" 
 
            command1Icon="fas fa-floppy-disk" 
 
            (command1Click)="onSave()" 
 
            [command1Visible]="!isViewMode" 
 
            command2Text="Clear" 
 
            command2Icon="fas fa-broom" 
 
            (command2Click)="onClear()" 
 
            [command2Visible]="!isViewMode" 
 
            [command3Visible]="false" 
 
            rightCommandIcon="fas fa-arrow-left" 
 
            (rightCommandClick)="onBackToList()"> 
 
        </app-command-center> 
 
    </app-page-header> 
 
 
 
    <!-- ===================================================== 
         PAGE TOOLBAR 
    ====================================================== --> 
 
    <app-page-toolbar> 
 
        <app-control-tabs 
 
            pageToolbarLeft 
 
            [tabs]="tabs" 
 
            [(selectedTab)]="selectedTab"> 
 
        </app-control-tabs> 
 
    </app-page-toolbar> 
 
 
 
    <!-- ===================================================== 
         PAGE CANVAS 
    ====================================================== --> 
 
    <app-page-canvas> 
 
        <app-form-grid 
 
            canvasBody 
 
            [columns]="4"> 
 
 
            <!-- ============================================= 
                 GENERAL INFORMATION 
            ============================================== --> 
 
            <app-form-section 
 
                title="General Information" 
 
                icon="fas fa-circle-info"> 
 
 
                <!-- Code --> 
 
                <app-textbox 
 
                    label="Code" 
 
                    placeholder="Auto generated" 
 
                    [(value)]="entity.code" 
 
                    [readonly]="true" 
 
                    [required]="true"> 
 
                </app-textbox> 
 
 
 
                <!-- Name --> 
 
                <app-textbox 
 
                    label="Name" 
 
                    placeholder="Enter name" 
 
                    [(value)]="entity.name" 
 
                    (valueChange)="onValueChange()" 
 
                    [disabled]="isViewMode" 
 
                    [required]="true"> 
 
                </app-textbox> 
 
 
 
                <!-- Icon --> 
 
                <app-textbox 
 
                    label="Icon" 
 
                    placeholder="Enter Font Awesome icon" 
 
                    [(value)]="entity.icon" 
 
                    (valueChange)="onValueChange()" 
 
                    [disabled]="isViewMode"> 
 
                </app-textbox> 
 
 
            </app-form-section> 
 
 
 
            <!-- ============================================= 
                 PARENT MENU 
            ============================================== --> 
 
            <app-form-section 
 
                title="Parent Menu" 
 
                icon="fas fa-sitemap"> 
 
 
                <!-- Menu --> 
 
                <app-search-dropdown 
 
                    label="Menu" 
 
                    [items]="items" 
 
                    labelField="text" 
 
                    valueField="value" 
 
                    [(value)]="entity.{{PARENT_PROPERTY}}Id" 
 
                    (valueChange)="onParentChange()" 
 
                    [disabled]="isViewMode" 
 
                    [required]="true"> 
 
                </app-search-dropdown> 
 
 
 
                <!-- Menu Code --> 
 
                <app-textbox 
 
                    label="Menu Code" 
 
                    placeholder="Parent menu code" 
 
                    [(value)]="entity.{{PARENT_PROPERTY}}Code" 
 
                    [readonly]="true"> 
 
                </app-textbox> 
 
 
 
                <!-- Menu Name --> 
 
                <app-textbox 
 
                    label="Menu Name" 
 
                    placeholder="Parent menu name" 
 
                    [(value)]="entity.{{PARENT_PROPERTY}}Name" 
 
                    [readonly]="true"> 
 
                </app-textbox> 
 
 
            </app-form-section> 
 
 
 
            <!-- ============================================= 
                 ROUTE SETTINGS 
            ============================================== --> 
 
            <app-form-section 
 
                title="Route Settings" 
 
                icon="fas fa-route"> 
 
 
                <!-- Route Key --> 
 
                <app-textbox 
 
                    label="Route Key" 
 
                    placeholder="Enter route key" 
 
                    [(value)]="entity.routeKey" 
 
                    (valueChange)="onValueChange()" 
 
                    [disabled]="isViewMode"> 
 
                </app-textbox> 
 
 
 
                <!-- Route --> 
 
                <app-textbox 
 
                    label="Route" 
 
                    placeholder="Generated route" 
 
                    [(value)]="entity.route" 
 
                    [readonly]="true"> 
 
                </app-textbox> 
 
 
 
                <!-- Display Order --> 
 
                <app-textbox 
 
                    label="Display Order" 
 
                    type="number" 
 
                    [(value)]="entity.displayOrder" 
 
                    (valueChange)="onValueChange()" 
 
                    [disabled]="isViewMode"> 
 
                </app-textbox> 
 
 
 
                <!-- Active --> 
 
                <app-checkbox 
 
                    label="Active" 
 
                    [(value)]="entity.isActive" 
 
                    (valueChange)="onValueChange()" 
 
                    [disabled]="isViewMode"> 
 
                </app-checkbox> 
 
 
            </app-form-section> 
 
 
 
            <!-- ============================================= 
                 ADDITIONAL INFORMATION 
            ============================================== --> 
 
            <app-form-section 
 
                title="Additional Information" 
 
                icon="fas fa-clipboard"> 
 
 
                <!-- Remarks --> 
 
                <app-textarea 
 
                    label="Remarks" 
 
                    placeholder="Enter remarks" 
 
                    [(value)]="entity.remarks" 
 
                    (valueChange)="onValueChange()" 
 
                    [disabled]="isViewMode"> 
 
                </app-textarea> 
 
 
            </app-form-section> 
 
 
        </app-form-grid> 
 
    </app-page-canvas> 
 
</div> 
 
 
 
<!-- ===================================================== 
     UTILITIES 
====================================================== --> 
 
<app-toast></app-toast> 
 
<app-confirm-dialog></app-confirm-dialog>