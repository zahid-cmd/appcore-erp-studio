import
{
    Routes
}
from '@angular/router';


export const infrastructureControlRoutes:
    Routes =
[
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
    }
];