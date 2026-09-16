//===============================================================
// Imports
//===============================================================

import
{
    Component,
    Input,
    OnChanges,
    SimpleChanges,
    ViewChild,
    ViewContainerRef,
    Type,
    ComponentRef,
    ChangeDetectorRef
}
from '@angular/core';


//===============================================================
// Control Components
//===============================================================

import
{
    CalendarComponent
}
from '../../shared/components/controls/calendar/calendar';

import
{
    ControlTabsComponent
}
from '../../shared/components/controls/control-tabs/control-tabs';

import
{
    DatepickerComponent
}
from '../../shared/components/controls/datepicker/datepicker';

import
{
    DropdownComponent
}
from '../../shared/components/controls/dropdown/dropdown';

import
{
    ImageHubComponent
}
from '../../shared/components/controls/image-hub/image-hub';

import
{
    OverlayComponent
}
from '../../shared/components/controls/overlay/overlay';

import
{
    PaginationComponent
}
from '../../shared/components/controls/pagination/pagination';

import
{
    SearchDropdownComponent
}
from '../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    TextareaComponent
}
from '../../shared/components/controls/textarea/textarea';

import
{
    TextboxComponent
}
from '../../shared/components/controls/textbox/textbox';


//===============================================================
// Layout Components
//===============================================================

import
{
    BreadcrumbComponent
}
from '../../shared/components/layout/breadcrumb/breadcrumb';

import
{
    EmptyStateComponent
}
from '../../shared/components/layout/empty-state/empty-state';

import
{
    FooterBrandComponent
}
from '../../shared/components/layout/footer-brand/footer-brand';

import
{
    FooterVersionComponent
}
from '../../shared/components/layout/footer-version/footer-version';

import
{
    FormGridComponent
}
from '../../shared/components/layout/form-grid/form-grid';

import
{
    FormSectionComponent
}
from '../../shared/components/layout/form-section/form-section';

import
{
    InlineSelectionComponent
}
from '../../shared/components/layout/inline-selection/inline-selection';

import
{
    ItemCart
}
from '../../shared/components/layout/item-cart/item-cart';

import
{
    ListTableComponent
}
from '../../shared/components/layout/list-table/list-table';

import
{
    PageCanvasComponent
}
from '../../shared/components/layout/page-canvas/page-canvas';

import
{
    PageHeaderComponent
}
from '../../shared/components/layout/page-header/page-header';

import
{
    PageToolbarComponent
}
from '../../shared/components/layout/page-toolbar/page-toolbar';

import
{
    SelectionPanelComponent
}
from '../../shared/components/layout/selection-panel/selection-panel';

import
{
    SidebarFooterComponent
}
from '../../shared/components/layout/sidebar-footer/sidebar-footer';

import
{
    TopbarActionsComponent
}
from '../../shared/components/layout/topbar-actions/topbar-actions';

import
{
    TopbarHeaderComponent
}
from '../../shared/components/layout/topbar-header/topbar-header';


//===============================================================
// Utility Components
//===============================================================

import
{
    ActivitySelector
}
from '../../shared/components/utilities/activity-selector/activity-selector';

import
{
    CheckboxComponent
}
from '../../shared/components/utilities/checkbox/checkbox';

import
{
    CommandCenterComponent
}
from '../../shared/components/utilities/command-center/command-center';

import
{
    ConfirmDialogComponent
}
from '../../shared/components/utilities/confirm-dialog/confirm-dialog';

import
{
    ControlSegmentComponent
}
from '../../shared/components/utilities/control-segment/control-segment';

import
{
    GitMessageModalComponent
}
from '../../shared/components/utilities/git-message-modal/git-message-modal';

import
{
    HistoryDrawerComponent
}
from '../../shared/components/utilities/history-drawer/history-drawer';

import
{
    OrbitLoaderComponent
}
from '../../shared/components/utilities/orbit-loader/orbit-loader';

import
{
    ProgressDialogComponent
}
from '../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    RecordCounterComponent
}
from '../../shared/components/utilities/record-counter/record-counter';

import
{
    SearchBoxComponent
}
from '../../shared/components/utilities/search-box/search-box';

import
{
    ToastComponent
}
from '../../shared/components/utilities/toast/toast';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:
        'app-component-renderer',

    standalone:
        true,

    templateUrl:
        './component-renderer.html',

    styleUrl:
        './component-renderer.css'
})


export class ComponentRenderer
implements OnChanges
{

    //===========================================================
    // Component Host
    //===========================================================

    @ViewChild(
        'componentHost',
        {
            read:
                ViewContainerRef,

            static:
                true
        }
    )
    private componentHost!:
        ViewContainerRef;


    //===========================================================
    // Component Key
    //===========================================================

    @Input()
    componentKey:
        string =
        '';


    //===========================================================
    // Component Reference
    //===========================================================

    private componentRef:
        ComponentRef<unknown>
        |
        null =
        null;


    //===========================================================
    // Dependency Injection
    //===========================================================

    constructor
    (
        private readonly cdr:
            ChangeDetectorRef
    )
    {
    }


    //===========================================================
    // Component Registry
    //===========================================================

    private readonly componentRegistry:
        Record<
            string,
            Type<unknown>
        >
    =
    {
        //=======================================================
        // Control Components
        //=======================================================

        'calendar':
            CalendarComponent,

        'control-tabs':
            ControlTabsComponent,

        'datepicker':
            DatepickerComponent,

        'dropdown':
            DropdownComponent,

        'image-hub':
            ImageHubComponent,

        'overlay':
            OverlayComponent,

        'pagination':
            PaginationComponent,

        'search-dropdown':
            SearchDropdownComponent,

        'textarea':
            TextareaComponent,

        'text-box':
            TextboxComponent,

        'textbox':
            TextboxComponent,


        //=======================================================
        // Layout Components
        //=======================================================

        'breadcrumb':
            BreadcrumbComponent,

        'empty-state':
            EmptyStateComponent,

        'footer-brand':
            FooterBrandComponent,

        'footer-version':
            FooterVersionComponent,

        'form-grid':
            FormGridComponent,

        'form-section':
            FormSectionComponent,

        'inline-selection':
            InlineSelectionComponent,

        'item-cart':
            ItemCart,

        'list-table':
            ListTableComponent,

        'page-canvas':
            PageCanvasComponent,

        'page-header':
            PageHeaderComponent,

        'page-toolbar':
            PageToolbarComponent,

        'selection-panel':
            SelectionPanelComponent,

        'sidebar-footer':
            SidebarFooterComponent,

        'topbar-actions':
            TopbarActionsComponent,

        'topbar-header':
            TopbarHeaderComponent,


        //=======================================================
        // Utility Components
        //=======================================================

        'activity-selector':
            ActivitySelector,

        'checkbox':
            CheckboxComponent,

        'command-center':
            CommandCenterComponent,

        'confirm-dialog':
            ConfirmDialogComponent,

        'control-segment':
            ControlSegmentComponent,

        'git-message-modal':
            GitMessageModalComponent,

        'history-drawer':
            HistoryDrawerComponent,

        'orbit-loader':
            OrbitLoaderComponent,

        'progress-dialog':
            ProgressDialogComponent,

        'record-counter':
            RecordCounterComponent,

        'search-box':
            SearchBoxComponent,

        'toast':
            ToastComponent
    };


    //===========================================================
    // Changes
    //===========================================================

    ngOnChanges
    (
        changes:
            SimpleChanges
    ):
        void
    {
        if
        (
            changes['componentKey']
        )
        {
            this.renderComponent();
        }
    }


    //===========================================================
    // Render Component
    //===========================================================

    private renderComponent():
        void
    {
        this.clearComponent();


        const componentType =
            this.resolveComponent(
                this.componentKey
            );


        if
        (
            !componentType
        )
        {
            return;
        }


        this.componentRef =
            this.componentHost.createComponent(
                componentType
            );


        this.setPreviewMode();


        this.cdr.detectChanges();
    }


    //===========================================================
    // Set Preview Mode
    //===========================================================

    private setPreviewMode():
        void
    {
        if
        (
            !this.componentRef
        )
        {
            return;
        }


        const instance =
            this.componentRef.instance as
            {
                previewMode?:
                    boolean;
            };


        if
        (
            'previewMode' in instance
        )
        {
            this.componentRef.setInput(
                'previewMode',
                true
            );
        }
    }


    //===========================================================
    // Resolve Component
    //===========================================================

    private resolveComponent
    (
        componentKey:
            string
    ):
        Type<unknown>
        |
        null
    {
        const normalizedKey =
            componentKey
                ?.trim()
                .toLowerCase();


        if
        (
            !normalizedKey
        )
        {
            return null;
        }


        return this.componentRegistry[
            normalizedKey
        ]
        ??
        null;
    }


    //===========================================================
    // Clear Component
    //===========================================================

    private clearComponent():
        void
    {
        if
        (
            this.componentRef
        )
        {
            this.componentRef.destroy();


            this.componentRef =
                null;
        }


        this.componentHost.clear();
    }

}