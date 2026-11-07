import
{
    Routes
}
from '@angular/router';


//===========================================================
// Financial Statements Routes (hand-written read-only pages,
// no Code Sync)
//
//   trial-balance/list    Trial Balance
//   (later : Profit & Loss, Balance Sheet)
//===========================================================

export const financialStatementsRoutes:
Routes =
[
    {
        path:'',

        children:
        [
            //===========================================================
            // Trial Balance
            //===========================================================

            {
                path:'trial-balance',

                data:
                {
                    breadcrumb:'Trial Balance'
                },

                children:
                [
                    {
                        path:'',
                        redirectTo:'list',
                        pathMatch:'full'
                    },
                    {
                        path:'list',
                        data:
                        {
                            breadcrumb:'Trial Balance'
                        },
                        loadComponent:() =>
                            import(
                                '../trial-balance/trial-balance'
                            )
                            .then(
                                m =>
                                    m.TrialBalancePage
                            )
                    }
                ]
            }
        ]
    }
];
