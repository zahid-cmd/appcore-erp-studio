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

export const moduleSynchronizationRoutes:
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
                '../pages/module-synchronization/list/module-synchronization-list'
            )
            .then(
                m =>
                    m.ModuleSynchronizationListComponent
            )
    },


    //===========================================================
    // Frontend
    //===========================================================

    {
        path:'frontend/new',

        loadComponent:() =>
            import(
                '../pages/module-synchronization/form/module-synchronization-form'
            )
            .then(
                m =>
                    m.ModuleSynchronizationFormComponent
            )
    },

    {
        path:'frontend/view/:id',

        loadComponent:() =>
            import(
                '../pages/module-synchronization/form/module-synchronization-form'
            )
            .then(
                m =>
                    m.ModuleSynchronizationFormComponent
            )
    },

    {
        path:'frontend/edit/:id',

        loadComponent:() =>
            import(
                '../pages/module-synchronization/form/module-synchronization-form'
            )
            .then(
                m =>
                    m.ModuleSynchronizationFormComponent
            )
    },

    {
        path:'frontend/synchronize/:id',

        loadComponent:() =>
            import(
                '../pages/module-synchronization/form/module-synchronization-form'
            )
            .then(
                m =>
                    m.ModuleSynchronizationFormComponent
            )
    },


    //===========================================================
    // Backend List
    //===========================================================

    {
        path:'backend',

        loadComponent:() =>
            import(
                '../pages/module-synchronization/list/module-synchronization-list'
            )
            .then(
                m =>
                    m.ModuleSynchronizationListComponent
            )
    },


    //===========================================================
    // Backend
    //===========================================================

    {
        path:'backend/new',

        loadComponent:() =>
            import(
                '../pages/module-synchronization/form/module-synchronization-form'
            )
            .then(
                m =>
                    m.ModuleSynchronizationFormComponent
            )
    },

    {
        path:'backend/view/:id',

        loadComponent:() =>
            import(
                '../pages/module-synchronization/form/module-synchronization-form'
            )
            .then(
                m =>
                    m.ModuleSynchronizationFormComponent
            )
    },

    {
        path:'backend/edit/:id',

        loadComponent:() =>
            import(
                '../pages/module-synchronization/form/module-synchronization-form'
            )
            .then(
                m =>
                    m.ModuleSynchronizationFormComponent
            )
    },

    {
        path:'backend/synchronize/:id',

        loadComponent:() =>
            import(
                '../pages/module-synchronization/form/module-synchronization-form'
            )
            .then(
                m =>
                    m.ModuleSynchronizationFormComponent
            )
    }
];