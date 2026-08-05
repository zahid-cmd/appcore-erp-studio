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
    }
];