import
{
    Routes
}
from '@angular/router';


export const humanResourceRoutes:
    Routes =
[
    {
        path:'human-resource-setup',

        data:
        {
            breadcrumb:'Human Resource Setup'
        },

        loadChildren:() =>
            import(
                './human-resource-setup.routes'
            )
            .then(
                m =>
                    m.humanResourceSetupRoutes
            )
    }
];