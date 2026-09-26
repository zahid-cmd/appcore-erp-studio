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
 
export const RoleBasedDbComponentsRoutes: 
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
            breadcrumb:'Role Based DB Components' 
        }, 
 
        loadComponent:() => 
            import( 
                '../pages/role-based-db-components/list/role-based-db-components-list' 
            ) 
            .then( 
                m => 
                    m.RoleBasedDashboardComponentsList 
            ) 
    }, 
 
 
    //=========================================================== 
    // Add 
    //=========================================================== 
 
    { 
        path:'add', 
 
        data: 
        { 
            breadcrumb:'Add Role Based DB Components' 
        }, 
 
        loadComponent:() => 
            import( 
                '../pages/role-based-db-components/form/role-based-db-components-form' 
            ) 
            .then( 
                m => 
                    m.RoleBasedDbComponentsForm 
            ) 
    }, 
 
 
    //=========================================================== 
    // Edit 
    //=========================================================== 
 
    { 
        path:'edit/:id', 
 
        data: 
        { 
            breadcrumb:'Edit Role Based DB Components' 
        }, 
 
        loadComponent:() => 
            import( 
                '../pages/role-based-db-components/form/role-based-db-components-form' 
            ) 
            .then( 
                m => 
                    m.RoleBasedDbComponentsForm 
            ) 
    }, 
 
 
    //=========================================================== 
    // View 
    //=========================================================== 
 
    { 
        path:'view/:id', 
 
        data: 
        { 
            breadcrumb:'View Role Based DB Components' 
        }, 
 
        loadComponent:() => 
            import( 
                '../pages/role-based-db-components/form/role-based-db-components-form' 
            ) 
            .then( 
                m => 
                    m.RoleBasedDbComponentsForm 
            ) 
    } 
 
]; 