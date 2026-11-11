//===============================================================
// Bike Deliveries routes (hand-written page : NEVER run Code
// Sync for it). Wired by hand in motor-bike-sales.routes.ts.
//
//   list               Pending / Delivered / Undone / All
//   deliver/:lineId    a new delivery of a sold bike (invoice line)
//   view/:id           a saved delivery (PublicId)
//===============================================================

import
{
    Routes
}
from '@angular/router';

export const BikeDeliveriesRoutes:
Routes =
[
    {
        path:'',
        redirectTo:'list',
        pathMatch:'full'
    },
    {
        path:'list',
        data:{ breadcrumb:'Bike Deliveries' },
        loadComponent:() =>
            import('../pages/bike-deliveries/list/bike-deliveries-list')
                .then(m => m.BikeDeliveriesList)
    },
    {
        path:'deliver/:lineId',
        data:{ breadcrumb:'Deliver Bike' },
        loadComponent:() =>
            import('../pages/bike-deliveries/form/bike-deliveries-form')
                .then(m => m.BikeDeliveriesForm)
    },
    {
        path:'view/:id',
        data:{ breadcrumb:'View Bike Delivery' },
        loadComponent:() =>
            import('../pages/bike-deliveries/form/bike-deliveries-form')
                .then(m => m.BikeDeliveriesForm)
    }
];
