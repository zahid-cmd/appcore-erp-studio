//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Submenu Routes
//===============================================================

export const SourceControlRoutes:
Routes =
[


    //===========================================================
    // Default
    //===========================================================

    {
        path:'',

        redirectTo:'list',

        pathMatch:'full'
    },


    //===========================================================
    // List
    //===========================================================

    {
        path:'list',

        data:
        {
            breadcrumb:'Source Control'
        },

        loadComponent:() =>
            import(
                '../pages/source-control/list/source-control-list'
            )
            .then(
                m =>
                    m.SourceControlList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Source Control'
        },

        loadComponent:() =>
            import(
                '../pages/source-control/form/source-control-form'
            )
            .then(
                m =>
                    m.SourceControlForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Source Control'
        },

        loadComponent:() =>
            import(
                '../pages/source-control/form/source-control-form'
            )
            .then(
                m =>
                    m.SourceControlForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Source Control'
        },

        loadComponent:() =>
            import(
                '../pages/source-control/form/source-control-form'
            )
            .then(
                m =>
                    m.SourceControlForm
            )
    },


    //===========================================================
    // Git Operation
    //===========================================================

    {
        path:'repository/:id',

        data:
        {
            breadcrumb:'Git Operation'
        },

        loadComponent:() =>
            import(
                '../../../../core/git-operation/git-operation'
            )
            .then(
                m =>
                    m.GitOperation
            )
    }

];