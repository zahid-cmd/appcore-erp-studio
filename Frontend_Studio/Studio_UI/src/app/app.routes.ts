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
            // Fall Back
            {
                path:'',

                redirectTo:
                    'infrastructure-control',

                pathMatch:'full'
            },
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
            

            // AUTO-BEGIN : MOD-005

            //===========================================================
            // Settings
            //===========================================================

            {
                path:'settings',

                data:
                {
                    breadcrumb:'Settings'
                },

                loadChildren:() =>
                    import(
                        '../features/settings/routes/settings.routes'
                    )
                    .then(
                        m =>
                            m.settingsRoutes
                    )
            },

            // AUTO-END : MOD-005

            // AUTO-BEGIN : MOD-007

            //===========================================================
            // Accounts & Fianance
            //===========================================================

            {
                path:'accounts-fianance',

                data:
                {
                    breadcrumb:'Accounts & Fianance'
                },

                loadChildren:() =>
                    import(
                        '../features/accounts-fianance/routes/accounts-fianance.routes'
                    )
                    .then(
                        m =>
                            m.accountsFiananceRoutes
                    )
            },

            // AUTO-END : MOD-007

        ]
    },

    {
        path:'**',

        redirectTo:''
    }
];