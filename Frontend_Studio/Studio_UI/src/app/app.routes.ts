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

import 
{ 
    DashboardComponent 
} 
from '../core/dashboard/dashboard'; 
 
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
                    'dashboard', 
 
                pathMatch:'full' 
            }, 

            //=========================================================== 
            // Dashboard 
            //=========================================================== 

            { 
                path:'dashboard', 
 
                component: 
                    DashboardComponent, 
 
                data: 
                { 
                    breadcrumb:'Dashboard' 
                } 
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
 
            // AUTO-BEGIN : MOD-002 
 
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
 
            // AUTO-END : MOD-002 
 
            // AUTO-BEGIN : MOD-005

            //===========================================================
            // Human Resource Manangement
            //===========================================================

            {
                path:'human-resource-manangement',

                data:
                {
                    breadcrumb:'Human Resource Manangement'
                },

                loadChildren:() =>
                    import(
                        '../features/human-resource-manangement/routes/human-resource-manangement.routes'
                    )
                    .then(
                        m =>
                            m.humanResourceManangementRoutes
                    )
            },

            // AUTO-END : MOD-005

        ] 
    }, 
 
    { 
        path:'**', 
 
        redirectTo:'' 
    } 
];