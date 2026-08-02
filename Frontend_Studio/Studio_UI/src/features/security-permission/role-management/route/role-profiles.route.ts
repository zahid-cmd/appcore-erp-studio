//===============================================================
// Imports
//===============================================================

import { Routes } from '@angular/router';

import { RoleProfileListComponent } from '../role-profiles/pages/list/role-profile-list';
import { RoleProfileFormComponent } from '../role-profiles/pages/form/role-profile-form';

//===============================================================
// Role Profile Routes
//===============================================================

export const ROLE_PROFILE_ROUTES: Routes = [

    //===========================================================
    // List
    //===========================================================

    {
        path: '',
        component: RoleProfileListComponent
    },

    //===========================================================
    // Create
    //===========================================================

    {
        path: 'new',
        component: RoleProfileFormComponent
    },

    //===========================================================
    // View
    //===========================================================

    {
        path: 'view/:id',
        component: RoleProfileFormComponent
    },

    //===========================================================
    // Edit
    //===========================================================

    {
        path: 'edit/:id',
        component: RoleProfileFormComponent
    }

];