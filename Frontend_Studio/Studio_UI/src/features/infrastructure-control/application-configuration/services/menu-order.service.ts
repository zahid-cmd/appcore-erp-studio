//===============================================================
// Imports
//===============================================================

import
{
    Injectable,
    inject
}
from '@angular/core';

import
{
    HttpClient
}
from '@angular/common/http';

import
{
    Observable,
    map
}
from 'rxjs';

import
{
    environment
}
from '../../../../environments/environment';

import
{
    MenuOrderMenu,
    MenuOrderModule,
    MenuOrderPage,
    MenuOrderSaveItem,
    MenuOrderTree
}
from '../models/menu-order.model';


//===============================================================
// Menu Order Service
//
// Reads both spellings of the answer (camelCase from the API,
// PascalCase if the API's JSON settings ever change).
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class MenuOrderService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/settings/application-configuration/menu-order`;


    get():
        Observable<MenuOrderTree>
    {
        return this.http.get<any>(this.apiUrl)
            .pipe(
                map(
                    raw =>
                    ({
                        canUpdate:
                            !!(raw?.canUpdate ?? raw?.CanUpdate),

                        modules:
                            (raw?.modules ?? raw?.Modules ?? []).map(
                                (m: any): MenuOrderModule =>
                                ({
                                    ...MenuOrderService.node(m),

                                    menus:
                                        (m.menus ?? m.Menus ?? []).map(
                                            (x: any): MenuOrderMenu =>
                                            ({
                                                ...MenuOrderService.node(x),

                                                pages:
                                                    (x.pages ?? x.Pages ?? []).map(
                                                        (p: any) => MenuOrderService.node(p))
                                            }))
                                }))
                    })
                )
            );
    }


    save(items: MenuOrderSaveItem[]):
        Observable<{ changed: number; message: string }>
    {
        return this.http.put<any>(this.apiUrl, { Items: items })
            .pipe(
                map(
                    raw =>
                    ({
                        changed:
                            Number(raw?.changed ?? raw?.Changed ?? 0),

                        message:
                            String(raw?.message ?? raw?.Message ?? '')
                    })
                )
            );
    }


    private static node(raw: any): MenuOrderPage
    {
        return {
            id: Number(raw?.id ?? raw?.Id ?? 0),
            name: String(raw?.name ?? raw?.Name ?? ''),
            icon: String(raw?.icon ?? raw?.Icon ?? ''),
            displayOrder: Number(raw?.displayOrder ?? raw?.DisplayOrder ?? 0),
            isActive: !!(raw?.isActive ?? raw?.IsActive),
            locked: !!(raw?.locked ?? raw?.Locked)
        };
    }
}
