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