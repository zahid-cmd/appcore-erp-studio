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