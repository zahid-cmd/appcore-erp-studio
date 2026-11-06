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

export const submenuSynchronizationRoutes:
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
            '../pages/submenu-synchronization/list/submenu-synchronization-list'
        )
        .then(
            m =>
                m.SubmenuSynchronizationListComponent
        )
},

//===========================================================
// Frontend
//===========================================================

{
    path:'frontend/new',

    loadComponent:() =>
        import(
            '../pages/submenu-synchronization/form/submenu-synchronization-form'
        )
        .then(
            m =>
                m.SubmenuSynchronizationFormComponent
        )
},

{
    path:'frontend/view/:id',

    loadComponent:() =>
        import(
            '../pages/submenu-synchronization/form/submenu-synchronization-form'
        )
        .then(
            m =>
                m.SubmenuSynchronizationFormComponent
        )
},

{
    path:'frontend/edit/:id',

    loadComponent:() =>
        import(
            '../pages/submenu-synchronization/form/submenu-synchronization-form'
        )
        .then(
            m =>
                m.SubmenuSynchronizationFormComponent
        )
},

{
    path:'frontend/synchronize/:id',

    loadComponent:() =>
        import(
            '../pages/submenu-synchronization/form/submenu-synchronization-form'
        )
        .then(
            m =>
                m.SubmenuSynchronizationFormComponent
        )
},

//===========================================================
// Backend List
//===========================================================

{
    path:'backend',

    loadComponent:() =>
        import(
            '../pages/submenu-synchronization/list/submenu-synchronization-list'
        )
        .then(
            m =>
                m.SubmenuSynchronizationListComponent
        )
},

//===========================================================
// Backend
//===========================================================

{
    path:'backend/new',

    loadComponent:() =>
        import(
            '../pages/submenu-synchronization/form/submenu-synchronization-form'
        )
        .then(
            m =>
                m.SubmenuSynchronizationFormComponent
        )
},

{
    path:'backend/view/:id',

    loadComponent:() =>
        import(
            '../pages/submenu-synchronization/form/submenu-synchronization-form'
        )
        .then(
            m =>
                m.SubmenuSynchronizationFormComponent
        )
},

{
    path:'backend/edit/:id',

    loadComponent:() =>
        import(
            '../pages/submenu-synchronization/form/submenu-synchronization-form'
        )
        .then(
            m =>
                m.SubmenuSynchronizationFormComponent
        )
},

{
    path:'backend/synchronize/:id',

    loadComponent:() =>
        import(
            '../pages/submenu-synchronization/form/submenu-synchronization-form'
        )
        .then(
            m =>
                m.SubmenuSynchronizationFormComponent
        )
}

];