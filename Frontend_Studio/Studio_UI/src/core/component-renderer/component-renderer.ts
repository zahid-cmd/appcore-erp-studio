//===============================================================

// Imports

//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    ComponentRef,
    Input,
    OnChanges,
    SimpleChanges,
    Type,
    ViewChild,
    ViewContainerRef
}
from '@angular/core';


//===============================================================
// Login Page 1 Components
//===============================================================


import
{
    LoginPageBackgroundComponent
}
from '../../shared/components/login-page-1/background/background';


import
{
    LoginPageBrandingComponent
}
from '../../shared/components/login-page-1/branding/branding';


import
{
    LoginPagePromotionalPanelComponent
}
from '../../shared/components/login-page-1/promotional-panel/promotional-panel';


import
{
    LoginPagePromotionalImageComponent
}
from '../../shared/components/login-page-1/promotional-image/promotional-image';


import
{
    LoginPageClientLogoComponent
}
from '../../shared/components/login-page-1/client-logo/client-logo';


import
{
    LoginPageLoginPanelComponent
}
from '../../shared/components/login-page-1/login-panel/login-panel';


import
{
    LoginPageNotificationPanelComponent
}
from '../../shared/components/login-page-1/notification-panel/notification-panel';


import
{
    LoginPagePoweredByComponent
}
from '../../shared/components/login-page-1/powered-by/powered-by';


import
{
    LoginPageFooterComponent
}
from '../../shared/components/login-page-1/footer/footer';


//===============================================================
// Login Page 2 Components
//===============================================================


import
{
    LoginPageBackgroundComponent as
    LoginPage2BackgroundComponent
}
from '../../shared/components/login-page-2/background/background';


import
{
    LoginPageBrandingComponent as
    LoginPage2BrandingComponent
}
from '../../shared/components/login-page-2/branding/branding';


import
{
    LoginPagePromotionalPanelComponent as
    LoginPage2PromotionalPanelComponent
}
from '../../shared/components/login-page-2/promotional-panel/promotional-panel';


import
{
    LoginPagePromotionalImageLightComponent as
    LoginPage2PromotionalImageLightComponent
}
from '../../shared/components/login-page-2/promotional-image-light/promotional-image-light';


import
{
    LoginPagePromotionalImageDeepComponent as
    LoginPage2PromotionalImageDeepComponent
}
from '../../shared/components/login-page-2/promotional-image-deep/promotional-image-deep';


import
{
    LoginPageClientLogoComponent as
    LoginPage2ClientLogoComponent
}
from '../../shared/components/login-page-2/client-logo/client-logo';


import
{
    LoginPageLoginPanelComponent as
    LoginPage2LoginPanelComponent
}
from '../../shared/components/login-page-2/login-panel/login-panel';


import
{
    LoginPageRegistrationPanelComponent as
    LoginPage2RegistrationPanelComponent
}
from '../../shared/components/login-page-2/registration-panel/registration-panel';


import
{
    LoginPageForgetPasswordPanelComponent as
    LoginPage2ForgetPasswordPanelComponent
}
from '../../shared/components/login-page-2/forget-password/forget-password';


import
{
    LoginPageNotificationPanelComponent as
    LoginPage2NotificationPanelComponent
}
from '../../shared/components/login-page-2/notification-panel/notification-panel';


import
{
    LoginPagePoweredByComponent as
    LoginPage2PoweredByComponent
}
from '../../shared/components/login-page-2/powered-by/powered-by';


import
{
    LoginPageThemeSelectorComponent as
    LoginPage2ThemeSelectorComponent
}
from '../../shared/components/login-page-2/theme-selector/theme-selector';


import
{
    LoginPageFooterComponent as
    LoginPage2FooterComponent
}
from '../../shared/components/login-page-2/footer/footer';


//===============================================================
// Login Page 3 Components
//===============================================================


import
{
    LoginPageBackgroundComponent as
    LoginPage3BackgroundComponent
}
from '../../shared/components/login-page-3/background/background';


import
{
    LoginPageBrandingComponent as
    LoginPage3BrandingComponent
}
from '../../shared/components/login-page-3/branding/branding';


import
{
    LoginPagePromotionalPanelComponent as
    LoginPage3PromotionalPanelComponent
}
from '../../shared/components/login-page-3/promotional-panel/promotional-panel';


import
{
    LoginPagePromotionalImageLightComponent as
    LoginPage3PromotionalImageLightComponent
}
from '../../shared/components/login-page-3/promotional-image-light/promotional-image-light';


import
{
    LoginPagePromotionalImageDeepComponent as
    LoginPage3PromotionalImageDeepComponent
}
from '../../shared/components/login-page-3/promotional-image-deep/promotional-image-deep';


import
{
    LoginPageClientLogoComponent as
    LoginPage3ClientLogoComponent
}
from '../../shared/components/login-page-3/client-logo/client-logo';


import
{
    LoginPageLoginPanelComponent as
    LoginPage3LoginPanelComponent
}
from '../../shared/components/login-page-3/login-panel/login-panel';


import
{
    LoginPageRegistrationPanelComponent as
    LoginPage3RegistrationPanelComponent
}
from '../../shared/components/login-page-3/registration-panel/registration-panel';


import
{
    LoginPageForgetPasswordPanelComponent as
    LoginPage3ForgetPasswordPanelComponent
}
from '../../shared/components/login-page-3/forget-password/forget-password';


import
{
    LoginPageNotificationPanelComponent as
    LoginPage3NotificationPanelComponent
}
from '../../shared/components/login-page-3/notification-panel/notification-panel';


import
{
    LoginPagePoweredByComponent as
    LoginPage3PoweredByComponent
}
from '../../shared/components/login-page-3/powered-by/powered-by';


import
{
    LoginPageThemeSelectorComponent as
    LoginPage3ThemeSelectorComponent
}
from '../../shared/components/login-page-3/theme-selector/theme-selector';


import
{
    LoginPageFooterComponent as
    LoginPage3FooterComponent
}
from '../../shared/components/login-page-3/footer/footer';


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
implements
    OnChanges
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

        //===============================================================
        // Login Page 1 Components
        //===============================================================

        'login-page-1-background':
            LoginPageBackgroundComponent,

        'login-page-1-branding':
            LoginPageBrandingComponent,

        'login-page-1-promotional-panel':
            LoginPagePromotionalPanelComponent,

        'login-page-1-promotional-image':
            LoginPagePromotionalImageComponent,

        'login-page-1-login-panel':
            LoginPageLoginPanelComponent,

        'login-page-1-notification-panel':
            LoginPageNotificationPanelComponent,

        'login-page-1-powered-by':
            LoginPagePoweredByComponent,

        'login-page-1-footer':
            LoginPageFooterComponent,

        'login-page-1-client-logo':
            LoginPageClientLogoComponent,


        //===============================================================
        // Login Page 2 Components
        //===============================================================

        'login-page-2-background':
            LoginPage2BackgroundComponent,

        'login-page-2-branding':
            LoginPage2BrandingComponent,

        'login-page-2-promotional-panel':
            LoginPage2PromotionalPanelComponent,

        'login-page-2-promotional-image-light':
            LoginPage2PromotionalImageLightComponent,

        'login-page-2-promotional-image-deep':
            LoginPage2PromotionalImageDeepComponent,

        'login-page-2-login-panel':
            LoginPage2LoginPanelComponent,

        'login-page-2-registration-panel':
            LoginPage2RegistrationPanelComponent,

        'login-page-2-forget-password':
            LoginPage2ForgetPasswordPanelComponent,

        'login-page-2-notification-panel':
            LoginPage2NotificationPanelComponent,

        'login-page-2-powered-by':
            LoginPage2PoweredByComponent,

        'login-page-2-theme-selector':
            LoginPage2ThemeSelectorComponent,

        'login-page-2-footer':
            LoginPage2FooterComponent,

        'login-page-2-client-logo':
            LoginPage2ClientLogoComponent,


        //===============================================================
        // Login Page 3 Components
        //===============================================================

        'login-page-3-background':
            LoginPage3BackgroundComponent,

        'login-page-3-branding':
            LoginPage3BrandingComponent,

        'login-page-3-promotional-panel':
            LoginPage3PromotionalPanelComponent,

        'login-page-3-promotional-image-light':
            LoginPage3PromotionalImageLightComponent,

        'login-page-3-promotional-image-deep':
            LoginPage3PromotionalImageDeepComponent,

        'login-page-3-login-panel':
            LoginPage3LoginPanelComponent,

        'login-page-3-registration-panel':
            LoginPage3RegistrationPanelComponent,

        'login-page-3-forget-password':
            LoginPage3ForgetPasswordPanelComponent,

        'login-page-3-notification-panel':
            LoginPage3NotificationPanelComponent,

        'login-page-3-powered-by':
            LoginPage3PoweredByComponent,

        'login-page-3-theme-selector':
            LoginPage3ThemeSelectorComponent,

        'login-page-3-footer':
            LoginPage3FooterComponent,

        'login-page-3-client-logo':
            LoginPage3ClientLogoComponent,


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


        this.setComponentHostSize();


        this.setPreviewMode();


        this.cdr.detectChanges();
    }


    //===========================================================
    // Set Component Host Size
    //===========================================================

    private setComponentHostSize():
        void
    {
        if
        (
            !this.componentRef
        )
        {
            return;
        }


        const hostElement =
            this.componentRef
                .location
                .nativeElement as HTMLElement;


        hostElement.style.display =
            'block';


        hostElement.style.width =
            '100%';


        hostElement.style.height =
            '100%';


        hostElement.style.minWidth =
            '0';


        hostElement.style.minHeight =
            '0';


        hostElement.style.boxSizing =
            'border-box';
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
            (
                componentKey
                ??
                ''
            )
            .trim()
            .toLowerCase();


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