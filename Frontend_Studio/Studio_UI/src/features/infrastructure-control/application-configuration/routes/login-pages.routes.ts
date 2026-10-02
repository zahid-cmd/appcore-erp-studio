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
    // ----------------------------------------------------------
    // IMPORTANT:
    //
    // Preview is now handled directly by LoginPageLoader.
    //
    // Loader location:
    //
    //     src/core/login-page-loader/login-page-loader.ts
    //
    // Route:
    //
    //     /preview/1
    //     /preview/2
    //     /preview/3
    //     /preview/4
    //     /preview/5
    //
    // The LoginPageLoader reads :id and renders:
    //
    //     1 → Login Page 1
    //     2 → Login Page 2
    //     3 → Login Page 3
    //     4 → Login Page 4
    //     5 → Login Page 5
    //
    // The old LoginPagePreviewer is no longer used.
    //===========================================================

    {
        path:
            'preview/:id',

        data:
        {
            breadcrumb:
                'Preview Login Pages'
        },

        loadComponent:
            () =>
                import(
                    '../../../../core/login-page-loader/login-page-loader'
                )
                .then(
                    m =>
                        m.LoginPageLoader
                )
    }

];