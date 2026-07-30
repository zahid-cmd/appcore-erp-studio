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

export const routes:
    Routes =
[
    {
        path:'',

        component:
            LayoutComponent,

        children:
        [
            //===========================================================
            // Infrastructure Control
            //===========================================================
            {
                path:'infrastructure-control',

                data:
                {
                    breadcrumb:'Infrastructure Control'
                },

                loadChildren:() =>
                    import(
                        '../features/infrastructure-control/routes/infrastructure-control.routes'
                    )
                    .then(
                        m =>
                            m.infrastructureControlRoutes
                    )
            },

            //===========================================================
            // Security & Permission
            //===========================================================
            {
                path:'security-permission',

                data:
                {
                    breadcrumb:'Security & Permission'
                },

                loadChildren:() =>
                    import(
                        '../features/security-permission/role-management/route/security-permission.route'
                    )
                    .then(
                        m =>
                            m.SECURITY_PERMISSION_ROUTES
                    )
            },

            //===========================================================
            // Human Resource
            //===========================================================
            {
                path:'human-resource',

                data:
                {
                    breadcrumb:'Human Resource'
                },

                loadChildren:() =>
                    import(
                        '../features/human-resource/routes/human-resource.routes'
                    )
                    .then(
                        m =>
                            m.humanResourceRoutes
                    )
            },

            //===========================================================
            // Fall Back
            //===========================================================
            {
                path:'',

                redirectTo:
                    'infrastructure-control',

                pathMatch:'full'
            }
        ]
    },

    {
        path:'**',

        redirectTo:''
    }
];