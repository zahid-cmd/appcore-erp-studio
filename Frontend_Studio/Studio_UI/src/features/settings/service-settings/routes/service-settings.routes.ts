import
{
    Routes
}
from '@angular/router';

import
{
    moved
}
from '../../../../shared/utils/moved-route';


//===========================================================
// MNU-003-004 Routes : Service Settings
//===========================================================
// Moved 2026-11-15 (operations restructure). The menu is gone;
// its old addresses open the pages at their new place. The page
// files stay in this folder.
//
//   Service Category, Service Sub Category, Service Policy,
//   Labor Chart, Scheduled Services, Customized Services,
//   Chart of Services     -> Service Operations > Service Setup
//   Membership Services   -> Membership Management > Membership Setup
//   PDI Templates         -> Sales Operations > Sales Setup
//
// NEVER run Menu / Submenu / Code Sync for Service Settings.
//===========================================================

const SERVICE_SETUP =
    '/service-operations/service-setup';

export const mnu003004Routes:
Routes =
[
    {
        path:'',

        redirectTo:SERVICE_SETUP,

        pathMatch:'full'
    },

    moved('service-category', `${SERVICE_SETUP}/service-category`),

    moved('service-sub-category', `${SERVICE_SETUP}/service-sub-category`),

    moved('service-policy', `${SERVICE_SETUP}/service-policy`),

    moved('labor-chart', `${SERVICE_SETUP}/labor-chart`),

    moved('scheduled-services', `${SERVICE_SETUP}/scheduled-services`),

    moved('customized-services', `${SERVICE_SETUP}/customized-services`),

    moved('chart-of-services', `${SERVICE_SETUP}/chart-of-services`),

    moved('membership-services', '/membership-management/membership-setup/membership-services'),

    moved('pdi-templates', '/sales-operations/sales-setup/pdi-templates')
];
