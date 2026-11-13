//===============================================================
// Human Resource Setup routes : Shifts, Holidays, Leave Types,
// Salary Heads (hand-written pages : NEVER run Code Sync for
// them). Wired by the MANUAL block in
// human-resource-setup.routes.ts.
//
// The four pages share one list and one form (pages/hr-setup);
// the route data 'hrSetup' tells them which page they are.
//===============================================================

import
{
    Routes
}
from '@angular/router';

import
{
    HR_SETUP_PAGES,
    HrSetupKey
}
from '../models/hr-setup.model';

function hrSetupRoutes
(
    key: HrSetupKey
):
    Routes
{
    const page =
        HR_SETUP_PAGES[key];

    const list =
        () =>
            import('../pages/hr-setup/list/hr-setup-list')
                .then(m => m.HrSetupList);

    const form =
        () =>
            import('../pages/hr-setup/form/hr-setup-form')
                .then(m => m.HrSetupForm);

    return [
        {
            path:'',
            redirectTo:'list',
            pathMatch:'full'
        },
        {
            path:'list',
            data:{ breadcrumb:page.title, hrSetup:key },
            loadComponent:list
        },
        {
            path:'add',
            data:{ breadcrumb:`Add ${page.singular}`, hrSetup:key },
            loadComponent:form
        },
        {
            path:'edit/:id',
            data:{ breadcrumb:`Edit ${page.singular}`, hrSetup:key },
            loadComponent:form
        },
        {
            path:'view/:id',
            data:{ breadcrumb:`View ${page.singular}`, hrSetup:key },
            loadComponent:form
        }
    ];
}

export const ShiftsRoutes:
    Routes =
    hrSetupRoutes('shifts');

export const HolidaysRoutes:
    Routes =
    hrSetupRoutes('holidays');

export const LeaveTypesRoutes:
    Routes =
    hrSetupRoutes('leave-types');

export const SalaryHeadsRoutes:
    Routes =
    hrSetupRoutes('salary-heads');
