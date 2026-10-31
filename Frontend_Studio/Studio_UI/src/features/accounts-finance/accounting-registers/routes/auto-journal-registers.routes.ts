//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Submenu Routes : Accounting Registers › Auto Journal Registers
// (read-only page : one register page, no Code Sync)
//===============================================================

export const AutoJournalRegistersRoutes:
Routes =
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
            breadcrumb:'Auto Journal Registers'
        },

        loadComponent:() =>
            import(
                '../pages/auto-journal-registers/list/auto-journal-registers-list'
            )
            .then(
                m =>
                    m.AutoJournalRegistersList
            )
    }
];
