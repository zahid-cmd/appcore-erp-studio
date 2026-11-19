import
{
    Routes
}
from '@angular/router';

import
{
    moved
}
from '../../../shared/utils/moved-route';

export const infrastructureControlRoutes:
    Routes =
[
    //===========================================================
    // Navigation Management
    //===========================================================

    {
        path:'navigation-management',

        data:
        {
            breadcrumb:'Navigation Management'
        },

        loadChildren:() =>
            import(
                './navigation-management.routes'
            )
            .then(
                m =>
                    m.navigationManagementRoutes
            )
    },
    
    //===========================================================
    // Development Management
    //===========================================================

    {
        path:'development-management',

        data:
        {
            breadcrumb:'Development Management'
        },

        loadChildren:() =>
            import(
                '../development-management/routes/development-management.routes'
            )
            .then(
                m =>
                    m.developmentManagementRoutes
            )
    },

    //===========================================================
    // Default
    //===========================================================

    {
        path:'',

        redirectTo:'navigation-management',

        pathMatch:'full'
    },
    // AUTO-BEGIN : MNU-002-003

    //===========================================================
    // Component Management
    //===========================================================

    {
        path:'component-management',

        data:
        {
            breadcrumb:'Component Management'
        },

        loadChildren:() =>
            import(
                '../component-management/routes/component-management.routes'
            )
            .then(
                m =>
                    m.mnu002003Routes
            )
    },

    // AUTO-END : MNU-002-003

    // AUTO-BEGIN : MNU-002-004

    //===========================================================
    // Code Management
    //===========================================================

    {
        path:'code-management',

        data:
        {
            breadcrumb:'Code Management'
        },

        loadChildren:() =>
            import(
                '../code-management/routes/code-management.routes'
            )
            .then(
                m =>
                    m.mnu002004Routes
            )
    },

    // AUTO-END : MNU-002-004

    //===========================================================
    // Application Configuration : moved to Settings 2026-11-20.
    // The old addresses open the new ones (rest of the address and
    // the query kept). Never run Menu Sync here : it would add the
    // old block back.
    //===========================================================

    moved('application-configuration', '/settings/application-configuration'),

    // AUTO-BEGIN : MNU-002-006

    //===========================================================
    // Login Components
    //===========================================================

    {
        path:'login-components',

        data:
        {
            breadcrumb:'Login Components'
        },

        loadChildren:() =>
            import(
                '../login-components/routes/login-components.routes'
            )
            .then(
                m =>
                    m.mnu002006Routes
            )
    },

    // AUTO-END : MNU-002-006

    // AUTO-BEGIN : MNU-002-007

    //===========================================================
    // Dashboard Components
    //===========================================================

    {
        path:'dashboard-components',

        data:
        {
            breadcrumb:'Dashboard Components'
        },

        loadChildren:() =>
            import(
                '../dashboard-components/routes/dashboard-components.routes'
            )
            .then(
                m =>
                    m.mnu002007Routes
            )
    },

    // AUTO-END : MNU-002-007

    //===========================================================
    // Data Management (hand-written; outside the AUTO blocks)
    //===========================================================

    {
        path:'data-management',

        data:
        {
            breadcrumb:'Data Management'
        },

        loadChildren:() =>
            import(
                '../data-management/routes/data-management.routes'
            )
            .then(
                m =>
                    m.dataManagementRoutes
            )
    },

];