//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Service Operations > Service Setup (hand-written : NEVER run
// Menu / Submenu / Code Sync for it)
//
// The service pages moved here from Settings > Service Settings
// (2026-11-15). Their files stay in features/settings/service-
// settings; only the address changed.
//===============================================================

export const serviceSetupRoutes:
Routes =
[
    {
        path:'',

        redirectTo:'service-category',

        pathMatch:'full'
    },

    {
        path:'service-category',

        data:
        {
            breadcrumb:'Service Category'
        },

        loadChildren:() =>
            import(
                '../../settings/service-settings/routes/service-category.routes'
            )
            .then(
                m =>
                    m.ServiceCategoryRoutes
            )
    },

    {
        path:'service-sub-category',

        data:
        {
            breadcrumb:'Service Sub Category'
        },

        loadChildren:() =>
            import(
                '../../settings/service-settings/routes/service-sub-category.routes'
            )
            .then(
                m =>
                    m.ServiceSubCategoryRoutes
            )
    },

    {
        path:'service-policy',

        data:
        {
            breadcrumb:'Service Policy'
        },

        loadChildren:() =>
            import(
                '../../settings/service-settings/routes/service-policy.routes'
            )
            .then(
                m =>
                    m.ServicePolicyRoutes
            )
    },

    {
        path:'labor-chart',

        data:
        {
            breadcrumb:'Labor Chart'
        },

        loadChildren:() =>
            import(
                '../../settings/service-settings/routes/labor-chart.routes'
            )
            .then(
                m =>
                    m.LaborChartRoutes
            )
    },

    {
        path:'scheduled-services',

        data:
        {
            breadcrumb:'Scheduled Services'
        },

        loadChildren:() =>
            import(
                '../../settings/service-settings/routes/scheduled-services.routes'
            )
            .then(
                m =>
                    m.ScheduledServicesRoutes
            )
    },

    {
        path:'customized-services',

        data:
        {
            breadcrumb:'Customized Services'
        },

        loadChildren:() =>
            import(
                '../../settings/service-settings/routes/customized-services.routes'
            )
            .then(
                m =>
                    m.CustomizedServicesRoutes
            )
    },

    {
        path:'chart-of-services',

        data:
        {
            breadcrumb:'Chart of Services'
        },

        loadChildren:() =>
            import(
                '../../settings/service-settings/routes/chart-of-services.routes'
            )
            .then(
                m =>
                    m.ChartOfServicesRoutes
            )
    }

    // workshop-configuration : added when the page is built
];
