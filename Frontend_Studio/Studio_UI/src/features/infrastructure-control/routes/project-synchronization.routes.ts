import
{
    Routes
}
from '@angular/router';


export const projectSynchronizationRoutes:
    Routes =
[
    //=========================================================
    // Project Synchronization List
    //=========================================================

    {
        path:'',

        data:
        {
            breadcrumb:'Project Synchronization'
        },

        loadComponent:() =>
            import(
                '../development management/pages/project-synchronization/list/project-synchronization-list'
            )
            .then(
                m =>
                    m.ProjectSynchronizationListComponent
            )
    },

    //=========================================================
    // Project Synchronization - Add
    //=========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Project Synchronization'
        },

        loadComponent:() =>
            import(
                '../development management/pages/project-synchronization/form/project-synchronization-form'
            )
            .then(
                m =>
                    m.ProjectSynchronizationComponent
            )
    },

    //=========================================================
    // Project Synchronization - Edit
    //=========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Project Synchronization'
        },

        loadComponent:() =>
            import(
                '../development management/pages/project-synchronization/form/project-synchronization-form'
            )
            .then(
                m =>
                    m.ProjectSynchronizationComponent
            )
    },

    //=========================================================
    // Project Synchronization - View
    //=========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Project Synchronization'
        },

        loadComponent:() =>
            import(
                '../development management/pages/project-synchronization/form/project-synchronization-form'
            )
            .then(
                m =>
                    m.ProjectSynchronizationComponent
            )
    }
];