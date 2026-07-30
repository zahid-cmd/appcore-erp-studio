import
{
    Routes
}
from '@angular/router';

export const navigationManagementRoutes:
    Routes =
[
    //=========================================================
    // Navigation Module List
    //=========================================================

    {
        path:'modules',

        data:
        {
            breadcrumb:'Modules'
        },

        loadComponent:() =>
            import(
                '../navigation-management/pages/module/list/module-list'
            )
            .then(
                m =>
                    m.ModuleListComponent
            )
    },

    //=========================================================
    // Navigation Module - Add
    //=========================================================

    {
        path:'modules/add',

        data:
        {
            breadcrumb:'Add Module'
        },

        loadComponent:() =>
            import(
                '../navigation-management/pages/module/form/module-form'
            )
            .then(
                m =>
                    m.ModuleFormComponent
            )
    },

    //=========================================================
    // Navigation Module - Edit
    //=========================================================

    {
        path:'modules/edit/:id',

        data:
        {
            breadcrumb:'Edit Module'
        },

        loadComponent:() =>
            import(
                '../navigation-management/pages/module/form/module-form'
            )
            .then(
                m =>
                    m.ModuleFormComponent
            )
    },

    //=========================================================
    // Navigation Module - View
    //=========================================================

    {
        path:'modules/view/:id',

        data:
        {
            breadcrumb:'View Module'
        },

        loadComponent:() =>
            import(
                '../navigation-management/pages/module/form/module-form'
            )
            .then(
                m =>
                    m.ModuleFormComponent
            )
    },
    //=========================================================
    // Navigation Menu List
    //=========================================================

    {
        path:'navigation-menus',

        data:
        {
            breadcrumb:'Navigation Menus'
        },

        loadComponent:() =>
            import(
                '../navigation-management/pages/menu/list/menu-list'
            )
            .then(
                m =>
                    m.NavigationMenuListComponent
            )
    },


    //=========================================================
    // Navigation Menu - Add
    //=========================================================

    {
        path:'navigation-menus/add',

        data:
        {
            breadcrumb:'Add Navigation Menu'
        },

        loadComponent:() =>
            import(
                '../navigation-management/pages/menu/form/menu-form'
            )
            .then(
                m =>
                    m.NavigationMenuFormComponent
            )
    },


    //=========================================================
    // Navigation Menu - Edit
    //=========================================================

    {
        path:'navigation-menus/edit/:id',

        data:
        {
            breadcrumb:'Edit Navigation Menu'
        },

        loadComponent:() =>
            import(
                '../navigation-management/pages/menu/form/menu-form'
            )
            .then(
                m =>
                    m.NavigationMenuFormComponent
            )
    },


    //=========================================================
    // Navigation Menu - View
    //=========================================================

    {
        path:'navigation-menus/view/:id',

        data:
        {
            breadcrumb:'View Navigation Menu'
        },

        loadComponent:() =>
            import(
                '../navigation-management/pages/menu/form/menu-form'
            )
            .then(
                m =>
                    m.NavigationMenuFormComponent
            )
    },

    //=========================================================
    // Navigation Submenu List
    //=========================================================

    {
        path:'navigation-submenus',

        data:
        {
            breadcrumb:'Navigation Submenus'
        },

        loadComponent:() =>
            import(
                '../navigation-management/pages/submenu/list/sub-menu-list'
            )
            .then(
                m =>
                    m.NavigationSubmenuListComponent
            )
    },


    //=========================================================
    // Navigation Submenu - Add
    //=========================================================

    {
        path:'navigation-submenus/add',

        data:
        {
            breadcrumb:'Add Navigation Submenu'
        },

        loadComponent:() =>
            import(
                '../navigation-management/pages/submenu/form/sub-menu-form'
            )
            .then(
                m =>
                    m.NavigationSubmenuFormComponent
            )
    },


    //=========================================================
    // Navigation Submenu - Edit
    //=========================================================

    {
        path:'navigation-submenus/edit/:id',

        data:
        {
            breadcrumb:'Edit Navigation Submenu'
        },

        loadComponent:() =>
            import(
                '../navigation-management/pages/submenu/form/sub-menu-form'
            )
            .then(
                m =>
                    m.NavigationSubmenuFormComponent
            )
    },


    //=========================================================
    // Navigation Submenu - View
    //=========================================================

    {
        path:'navigation-submenus/view/:id',

        data:
        {
            breadcrumb:'View Navigation Submenu'
        },

        loadComponent:() =>
            import(
                '../navigation-management/pages/submenu/form/sub-menu-form'
            )
            .then(
                m =>
                    m.NavigationSubmenuFormComponent
            )
    },
    //=========================================================
    // Navigation Activity List
    //=========================================================

    {
        path:'navigation-activities',

        data:
        {
            breadcrumb:'Navigation Activities'
        },

        loadComponent:() =>
            import(
                '../navigation-management/pages/activity/list/activity-list'
            )
            .then(
                m =>
                    m.NavigationActivityListComponent
            )
    },


    //=========================================================
    // Navigation Activity - Add
    //=========================================================

    {
        path:'navigation-activities/add',

        data:
        {
            breadcrumb:'Add Navigation Activity'
        },

        loadComponent:() =>
            import(
                '../navigation-management/pages/activity/form/activity-form'
            )
            .then(
                m =>
                    m.NavigationActivityFormComponent
            )
    },


    //=========================================================
    // Navigation Activity - Edit
    //=========================================================

    {
        path:'navigation-activities/edit/:id',

        data:
        {
            breadcrumb:'Edit Navigation Activity'
        },

        loadComponent:() =>
            import(
                '../navigation-management/pages/activity/form/activity-form'
            )
            .then(
                m =>
                    m.NavigationActivityFormComponent
            )
    },


    //=========================================================
    // Navigation Activity - View
    //=========================================================

    {
        path:'navigation-activities/view/:id',

        data:
        {
            breadcrumb:'View Navigation Activity'
        },

        loadComponent:() =>
            import(
                '../navigation-management/pages/activity/form/activity-form'
            )
            .then(
                m =>
                    m.NavigationActivityFormComponent
            )
    },
    
    //=========================================================
    // Sidebar
    //=========================================================

    {
        path:'sidebar',

        data:
        {
            breadcrumb:'Sidebar'
        },

        loadComponent:() =>
            import(
                '../navigation-management/sidebar/sidebar'
            )
            .then(
                m =>
                    m.SidebarComponent
            )
    },

    //=========================================================
    // Default
    //=========================================================

    {
        path:'',

        redirectTo:'modules',

        pathMatch:'full'
    }
];