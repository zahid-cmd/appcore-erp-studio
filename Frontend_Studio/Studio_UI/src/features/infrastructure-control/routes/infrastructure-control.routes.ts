import
{
    Routes
}
from '@angular/router';


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
                '../development management/routes/development-management.routes'
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

];