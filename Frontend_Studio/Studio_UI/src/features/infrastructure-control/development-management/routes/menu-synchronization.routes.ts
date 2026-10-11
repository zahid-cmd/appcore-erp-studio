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

export const menuSynchronizationRoutes:
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
            '../pages/menu-synchronization/list/menu-synchronization-list'
        )
        .then(
            m =>
                m.MenuSynchronizationListComponent
        )
},

//===========================================================
// Frontend
//===========================================================

{
    path:'frontend/new',

    loadComponent:() =>
        import(
            '../pages/menu-synchronization/form/menu-synchronization-form'
        )
        .then(
            m =>
                m.MenuSynchronizationFormComponent
        )
},

{
    path:'frontend/view/:id',

    loadComponent:() =>
        import(
            '../pages/menu-synchronization/form/menu-synchronization-form'
        )
        .then(
            m =>
                m.MenuSynchronizationFormComponent
        )
},

{
    path:'frontend/edit/:id',

    loadComponent:() =>
        import(
            '../pages/menu-synchronization/form/menu-synchronization-form'
        )
        .then(
            m =>
                m.MenuSynchronizationFormComponent
        )
},

{
    path:'frontend/synchronize/:id',

    loadComponent:() =>
        import(
            '../pages/menu-synchronization/form/menu-synchronization-form'
        )
        .then(
            m =>
                m.MenuSynchronizationFormComponent
        )
},

//===========================================================
// Backend List
//===========================================================

{
    path:'backend',

    loadComponent:() =>
        import(
            '../pages/menu-synchronization/list/menu-synchronization-list'
        )
        .then(
            m =>
                m.MenuSynchronizationListComponent
        )
},

//===========================================================
// Backend
//===========================================================

{
    path:'backend/new',

    loadComponent:() =>
        import(
            '../pages/menu-synchronization/form/menu-synchronization-form'
        )
        .then(
            m =>
                m.MenuSynchronizationFormComponent
        )
},

{
    path:'backend/view/:id',

    loadComponent:() =>
        import(
            '../pages/menu-synchronization/form/menu-synchronization-form'
        )
        .then(
            m =>
                m.MenuSynchronizationFormComponent
        )
},

{
    path:'backend/edit/:id',

    loadComponent:() =>
        import(
            '../pages/menu-synchronization/form/menu-synchronization-form'
        )
        .then(
            m =>
                m.MenuSynchronizationFormComponent
        )
},

{
    path:'backend/synchronize/:id',

    loadComponent:() =>
        import(
            '../pages/menu-synchronization/form/menu-synchronization-form'
        )
        .then(
            m =>
                m.MenuSynchronizationFormComponent
        )
}

];