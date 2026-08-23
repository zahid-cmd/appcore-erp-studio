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

            // AUTO-BEGIN : MOD-004

            //===========================================================
            // Accounts & Finance
            //===========================================================

            {
                path:'accounts-finance',

                data:
                {
                    breadcrumb:'Accounts & Finance'
                },

                loadChildren:() =>
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

            // AUTO-END : MOD-003

        ]
    },

    {
        path:'**',

        redirectTo:''
    }
];