//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Routes
//===============================================================

export const codeSynchronizationRoutes:
Routes =
[

    //===========================================================
    // Default
    //===========================================================

    {
        path:'',

        redirectTo:'frontend',

        pathMatch:'full'
    },


    //===========================================================
    // Frontend List
    //===========================================================

    {
        path:'frontend',

        loadComponent:() =>
            import(
                '../pages/code synchronization/list/code-synchronization-list'
            )
            .then(
                m =>
                    m.CodeSynchronizationListComponent
            )
    },


    //===========================================================
    // Backend List
    //===========================================================

    {
        path:'backend',

        loadComponent:() =>
            import(
                '../pages/code synchronization/list/code-synchronization-list'
            )
            .then(
                m =>
                    m.CodeSynchronizationListComponent
            )
    }

];