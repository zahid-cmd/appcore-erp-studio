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


import
{
    WebsitePageLoader
}
from '../core/website-page-loader/website-page-loader';

import
{
    WebsitePage1
}
from '../shared/website-pages/website-page-1/website-page-1';

import
{
    BikeDetailPage
}
from '../shared/website-pages/bike-detail/bike-detail';

import
{
    PolicyPage
}
from '../shared/website-pages/policy-page/policy-page';

import
{
    BrandPage
}
from '../shared/website-pages/brand-page/brand-page';

import
{
    EnquirePage
}
from '../shared/website-pages/enquire-page/enquire-page';


export const routes:
    Routes =
[
    //===========================================================
    // Company website (public)
    //   /                home
    //   /bikes/:slug     bike detail
    //   /enquire         Enquire Now (→ an ERP Sales Enquiry)
    //   /brands/:slug    brand : bikes · price list · parts
    //   /warranty /terms /privacy
    //   Switched off in site-content.json → the login page.
    //   Any other address falls through to the routes below.
    //===========================================================

    {
        path:
            '',

        component:
            WebsitePageLoader,

        children:
        [
            {
                path:
                    '',

                pathMatch:
                    'full',

                component:
                    WebsitePage1
            },

            {
                path:
                    'bikes/:slug',

                component:
                    BikeDetailPage
            },

            {
                path:
                    'enquire',

                component:
                    EnquirePage
            },

            {
                path:
                    'brands/:slug',

                component:
                    BrandPage
            },

            {
                path:
                    'warranty',

                component:
                    PolicyPage,

                data:
                {
                    policy:
                        'warranty'
                }
            },

            {
                path:
                    'terms',

                component:
                    PolicyPage,

                data:
                {
                    policy:
                        'terms'
                }
            },

            {
                path:
                    'privacy',

                component:
                    PolicyPage,

                data:
                {
                    policy:
                        'privacy'
                }
            },

        ]
    },


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
            // Inventory Management
            //===========================================================

            {
                path:'inventory-management',

                data:
                {
                    breadcrumb:'Inventory Management'
                },

                loadChildren:() =>
                    import(
                        '../features/inventory-management/routes/inventory-management.routes'
                    )
                    .then(
                        m =>
                            m.inventoryManagementRoutes
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
            // AUTO-BEGIN : MOD-010

            //===========================================================
            // Enquiry Management
            //===========================================================

            {
                path:'enquiry-management',

                data:
                {
                    breadcrumb:'Enquiry Management'
                },

                loadChildren:() =>
                    import(
                        '../features/enquiry-management/routes/enquiry-management.routes'
                    )
                    .then(
                        m =>
                            m.enquiryManagementRoutes
                    )
            },

            // AUTO-END : MOD-010

            // AUTO-BEGIN : MOD-008

            //===========================================================
            // Sales Operations
            //===========================================================

            {
                path:'sales-operations',

                data:
                {
                    breadcrumb:'Sales Operations'
                },

                loadChildren:() =>
                    import(
                        '../features/sales-operations/routes/sales-operations.routes'
                    )
                    .then(
                        m =>
                            m.salesOperationsRoutes
                    )
            },

            // AUTO-END : MOD-008

            // AUTO-BEGIN : MOD-014

            //===========================================================
            // Service Operations
            //===========================================================

            {
                path:'service-operations',

                data:
                {
                    breadcrumb:'Service Operations'
                },

                loadChildren:() =>
                    import(
                        '../features/service-operations/routes/service-operations.routes'
                    )
                    .then(
                        m =>
                            m.serviceOperationsRoutes
                    )
            },

            // AUTO-END : MOD-014

            // AUTO-BEGIN : MOD-011

            //===========================================================
            // Registration Management
            //===========================================================

            {
                path:'registration-management',

                data:
                {
                    breadcrumb:'Registration Management'
                },

                loadChildren:() =>
                    import(
                        '../features/registration-management/routes/registration-management.routes'
                    )
                    .then(
                        m =>
                            m.registrationManagementRoutes
                    )
            },

            // AUTO-END : MOD-011

            // AUTO-BEGIN : MOD-015

            //===========================================================
            // Warranty Management
            //===========================================================

            {
                path:'warranty-management',

                data:
                {
                    breadcrumb:'Warranty Management'
                },

                loadChildren:() =>
                    import(
                        '../features/warranty-management/routes/warranty-management.routes'
                    )
                    .then(
                        m =>
                            m.warrantyManagementRoutes
                    )
            },

            // AUTO-END : MOD-015

        ]
    },


    //===========================================================
    // Unknown Route
    //   Under an ERP module (/dashboard, /registration-management,
    //   /settings, ...) : the dashboard (it asks for login when
    //   needed). Anything else : the website home.
    //===========================================================

    {
        path:
            '**',

        redirectTo:
            ({ url }) =>
                erpModulePaths().has(url[0]?.path ?? '')
                    ? '/dashboard'
                    : '/'
    }
];


//===============================================================
// The first segments of the ERP pages : the paths of the
// authenticated layout's children (read from the routes above,
// so a module added by Module Sync is covered at once).
//===============================================================

let erpPaths:
    Set<string> | null =
    null;

function erpModulePaths():
    Set<string>
{
    if (!erpPaths)
    {
        const layout =
            routes.find(r => r.component === LayoutComponent);

        erpPaths =
            new Set(
                (layout?.children ?? [])
                    .map(r => (r.path ?? '').split('/')[0])
                    .filter(p => p.length > 0 && p !== '**'));
    }

    return erpPaths;
}