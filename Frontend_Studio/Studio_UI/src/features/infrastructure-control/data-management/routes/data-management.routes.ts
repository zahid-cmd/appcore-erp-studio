import
{
    Routes
}
from '@angular/router';

//===============================================================
// Data Management (hand-written; never Menu / Submenu / Code Sync)
//
//   /infrastructure-control/data-management/database-backups
//   /infrastructure-control/data-management/data-reset
//   /infrastructure-control/data-management/reset-history
//
// AppCore Admin (RP-001) only : checked by the API on every call.
//===============================================================

export const dataManagementRoutes:
    Routes =
[
    {
        path:'database-backups',

        data:
        {
            breadcrumb:'Database Backups'
        },

        loadComponent:() =>
            import(
                '../pages/database-backups/database-backups'
            )
            .then(
                m =>
                    m.DatabaseBackupsPage
            )
    },

    {
        path:'data-reset',

        data:
        {
            breadcrumb:'Data Reset'
        },

        loadComponent:() =>
            import(
                '../pages/data-reset/data-reset'
            )
            .then(
                m =>
                    m.DataResetPage
            )
    },

    {
        path:'reset-history',

        data:
        {
            breadcrumb:'Reset History'
        },

        loadComponent:() =>
            import(
                '../pages/reset-history/reset-history'
            )
            .then(
                m =>
                    m.ResetHistoryPage
            )
    },

    {
        path:'',

        redirectTo:'database-backups',

        pathMatch:'full'
    }
];
