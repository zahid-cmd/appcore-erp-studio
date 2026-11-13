//===============================================================
// Terms & Conditions routes (hand-written page : NEVER run Code
// Sync for it). Wired by the MANUAL block in
// general-settings.routes.ts.
//===============================================================

import
{
    Routes
}
from '@angular/router';

export const TermsConditionsRoutes:
Routes =
[
    {
        path:'',
        redirectTo:'list',
        pathMatch:'full'
    },
    {
        path:'list',
        data:{ breadcrumb:'Terms & Conditions' },
        loadComponent:() =>
            import('../pages/terms-conditions/list/terms-conditions-list')
                .then(m => m.TermsConditionsList)
    },
    {
        path:'add',
        data:{ breadcrumb:'Add Terms & Conditions' },
        loadComponent:() =>
            import('../pages/terms-conditions/form/terms-conditions-form')
                .then(m => m.TermsConditionsForm)
    },
    {
        path:'edit/:id',
        data:{ breadcrumb:'Edit Terms & Conditions' },
        loadComponent:() =>
            import('../pages/terms-conditions/form/terms-conditions-form')
                .then(m => m.TermsConditionsForm)
    },
    {
        path:'view/:id',
        data:{ breadcrumb:'View Terms & Conditions' },
        loadComponent:() =>
            import('../pages/terms-conditions/form/terms-conditions-form')
                .then(m => m.TermsConditionsForm)
    }
];
