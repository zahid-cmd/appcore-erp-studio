import
{
    Routes
}
from '@angular/router';

export const developmentManagementRoutes:
Routes =
[

//===========================================================
// Module Synchronization
//===========================================================

{
    path:'module-synchronization',

    data:
    {
        breadcrumb:'Module Synchronization'
    },

    loadChildren:() =>
        import(
            './module-synchronization.routes'
        )
        .then(
            m =>
                m.moduleSynchronizationRoutes
        )
},

//===========================================================
// Menu Synchronization
//===========================================================

{
    path:'menu-synchronization',

    data:
    {
        breadcrumb:'Menu Synchronization'
    },

    loadChildren:() =>
        import(
            './menu-synchronization.routes'
        )
        .then(
            m =>
                m.menuSynchronizationRoutes
        )
},

//===========================================================
// Submenu Synchronization
//===========================================================

{
    path:'submenu-synchronization',

    data:
    {
        breadcrumb:'Submenu Synchronization'
    },

    loadChildren:() =>
        import(
            './submenu-synchronization.routes'
        )
        .then(
            m =>
                m.submenuSynchronizationRoutes
        )
},

//===========================================================
// Default
//===========================================================

{
    path:'',

    redirectTo:
        'project-synchronization',

    pathMatch:
        'full'
}

];