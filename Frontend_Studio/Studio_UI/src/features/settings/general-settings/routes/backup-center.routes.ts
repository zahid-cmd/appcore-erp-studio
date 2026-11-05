//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Backup Center routes (custom page, no list, no sync)
//===============================================================

export const BackupCenterRoutes:
Routes =
[
    {
        path:'',

        data:
        {
            breadcrumb:'Backup Center'
        },

        loadComponent:() =>
            import(
                '../pages/backup-center/backup-center'
            )
            .then(
                m =>
                    m.BackupCenterPage
            )
    }
];
