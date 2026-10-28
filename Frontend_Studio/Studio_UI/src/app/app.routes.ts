import
{
    Routes
}
from '@angular/router';

import
{
    LayoutComponent
}
from '../core/layout/layout';

import
{
    DashboardComponent
}
from '../core/dashboard/dashboard';

import
{
    LoginPageLoader
}
from '../core/login-page-loader/login-page-loader';

import
{
    authenticationGuard
}
from '../core/authentication/authentication.guard';



export const routes:
    Routes =
[
    //===========================================================
    // Authentication
    //===========================================================

    {
        path:
            'login',

        component:
            LoginPageLoader
    },


    //===========================================================
    // Print Viewer (own browser tab, no layout)
    //   /print-viewer/<source>/<id>?doc=<document key | all>
    //===========================================================

    {
        path:
            'print-viewer/:source/:id',

        canActivate:
        [
            authenticationGuard
        ],

        loadComponent:
            () =>
                import(
                    '../shared/print/print-viewer/print-viewer'
                )
                .then(
                    m =>
                        m.PrintViewerComponent
                )
    },


    //===========================================================
    // Authenticated Application
    //===========================================================

    {
        path:
            '',

        component:
            LayoutComponent,

        canActivate:
        [
            authenticationGuard
        ],

        children:
        [
            //=======================================================
            // Fall Back
            //=======================================================

            {
                path:
                    '',

                redirectTo:
                    'dashboard',

                pathMatch:
                    'full'
            },


            //=======================================================
            // Dashboard
            //=======================================================

            {
                path:
                    'dashboard',

                component:
                    DashboardComponent,

                data:
                {
                    breadcrumb:
                        'Dashboard'
                }
            },


            // AUTO-BEGIN : MOD-004

            //=======================================================
            // Accounts & Finance
            //=======================================================

            {
                path:
                    'accounts-finance',

                data:
                {
                    breadcrumb:
                        'Accounts & Finance'
                },

                loadChildren:
                    () =>
                        import(
                            '../features/accounts-finance/routes/accounts-finance.routes'
                        )
                        .then(
                            m =>
                                m.accountsFinanceRoutes
                        )
            },

            // AUTO-END : MOD-004


            // AUTO-BEGIN : MOD-003

            //=======================================================
            // Settings
            //=======================================================

            {
                path:
                    'settings',

                data:
                {
                    breadcrumb:
                        'Settings'
                },

                loadChildren:
                    () =>
                        import(
                            '../features/settings/routes/settings.routes'
                        )
                        .then(
                            m =>
                                m.settingsRoutes
                        )
            },

            // AUTO-END : MOD-003


            // AUTO-BEGIN : MOD-002

            //=======================================================
            // Infrastructure Control
            //=======================================================

            {
                path:
                    'infrastructure-control',

                data:
                {
                    breadcrumb:
                        'Infrastructure Control'
                },

                loadChildren:
                    () =>
                        import(
                            '../features/infrastructure-control/routes/infrastructure-control.routes'
                        )
                        .then(
                            m =>
                                m.infrastructureControlRoutes
                        )
            },

            // AUTO-END : MOD-002


            // AUTO-BEGIN : MOD-005

            //=======================================================
            // Human Resource Management
            //=======================================================

            {
                path:
                    'human-resource-manangement',

                data:
                {
                    breadcrumb:
                        'Human Resource Manangement'
                },

                loadChildren:
                    () =>
                        import(
                            '../features/human-resource-manangement/routes/human-resource-manangement.routes'
                        )
                        .then(
                            m =>
                                m.humanResourceManangementRoutes
                        )
            },

            // AUTO-END : MOD-005


            // AUTO-BEGIN : MOD-006

            //=======================================================
            // Security & Permission
            //=======================================================

            {
                path:
                    'security-permission',

                data:
                {
                    breadcrumb:
                        'Security & Permission'
                },

                loadChildren:
                    () =>
                        import(
                            '../features/security-permission/routes/security-permission.routes'
                        )
                        .then(
                            m =>
                                m.securityPermissionRoutes
                        )
            },

            // AUTO-END : MOD-006
            // AUTO-BEGIN : MOD-009

            //===========================================================
            // Membership Management
            //===========================================================

            {
                path:'membership-management',

                data:
                {
                    breadcrumb:'Membership Management'
                },

                loadChildren:() =>
                    import(
                        '../features/membership-management/routes/membership-management.routes'
                    )
                    .then(
                        m =>
                            m.membershipManagementRoutes
                    )
            },

            // AUTO-END : MOD-009

            // AUTO-BEGIN : MOD-012

            //===========================================================
            // Store Management
            //===========================================================

            {
                path:'store-management',

                data:
                {
                    breadcrumb:'Store Management'
                },

                loadChildren:() =>
                    import(
                        '../features/store-management/routes/store-management.routes'
                    )
                    .then(
                        m =>
                            m.storeManagementRoutes
                    )
            },

            // AUTO-END : MOD-012

            // AUTO-BEGIN : MOD-007

            //===========================================================
            // Procurement
            //===========================================================

            {
                path:'procurement',

                data:
                {
                    breadcrumb:'Procurement'
                },

                loadChildren:() =>
                    import(
                        '../features/procurement/routes/procurement.routes'
                    )
                    .then(
                        m =>
                            m.procurementRoutes
                    )
            },

            // AUTO-END : MOD-007

            // AUTO-BEGIN : MOD-013

            //===========================================================
            // VAT Management
            //===========================================================

            {
                path:'vat-management',

                data:
                {
                    breadcrumb:'VAT Management'
                },

                loadChildren:() =>
                    import(
                        '../features/vat-management/routes/vat-management.routes'
                    )
                    .then(
                        m =>
                            m.vatManagementRoutes
                    )
            },

            // AUTO-END : MOD-013

        ]
    },


    //===========================================================
    // Unknown Route
    //===========================================================

    {
        path:
            '**',

        redirectTo:
            ''
    }
];