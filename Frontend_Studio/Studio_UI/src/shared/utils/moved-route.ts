//===============================================================
// Imports
//===============================================================

import
{
    inject
}
from '@angular/core';

import
{
    Route,
    Router
}
from '@angular/router';


//===============================================================
// A page moved to another menu or module (2026-11-15 operations
// restructure) : the old address opens the new one, with the rest
// of the address (list / view / edit / id) and the query kept.
//
//   moved('labor-chart', '/service-operations/service-setup/labor-chart')
//
//   /settings/service-settings/labor-chart/edit/5?tab=2
//     -> /service-operations/service-setup/labor-chart/edit/5?tab=2
//===============================================================

export function moved(path: string, target: string): Route
{
    return {
        path,
        children:
        [
            {
                path:'**',
                redirectTo:({ url, queryParams, fragment }) =>
                    inject(Router).createUrlTree(
                        [target, ...url.map(segment => segment.path)],
                        { queryParams, fragment:fragment ?? undefined })
            }
        ]
    };
}
