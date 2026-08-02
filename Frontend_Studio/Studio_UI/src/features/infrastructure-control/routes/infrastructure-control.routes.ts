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
    // Project Synchronization
    //===========================================================

    {
        path:'development-management/project-synchronization',

        data:
        {
            breadcrumb:'Project Synchronization'
        },

        loadChildren:() =>
            import(
                './project-synchronization.routes'
            )
            .then(
                m =>
                    m.projectSynchronizationRoutes
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