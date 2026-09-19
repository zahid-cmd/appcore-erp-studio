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

export const LoginPagesRoutes:
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
            breadcrumb:'Login Pages'
        },

        loadComponent:() =>
            import(
                '../pages/login-pages/list/login-pages-list'
            )
            .then(
                m =>
                    m.LoginPagesList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Login Pages'
        },

        loadComponent:() =>
            import(
                '../pages/login-pages/form/login-pages-form'
            )
            .then(
                m =>
                    m.LoginPagesForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Login Pages'
        },

        loadComponent:() =>
            import(
                '../pages/login-pages/form/login-pages-form'
            )
            .then(
                m =>
                    m.LoginPagesForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Login Pages'
        },

        loadComponent:() =>
            import(
                '../pages/login-pages/form/login-pages-form'
            )
            .then(
                m =>
                    m.LoginPagesForm
            )
    },


    //===========================================================
    // Preview
    //===========================================================

    {
        path:'preview/:id',

        data:
        {
            breadcrumb:'Preview Login Pages'
        },

        loadComponent:() =>
            import(
                '../../../../shared/previewer/login-page-previewer/login-page-previewer'
            )
            .then(
                m =>
                    m.LoginPagePreviewer
            )
    }

];