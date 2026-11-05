/* ============================================================
   Server-side pagination (shared by every list page)
   ------------------------------------------------------------
   The API's "paged" call answers one page plus the totals :

       { Items, TotalCount, Page, PageSize, Counts }

   Counts : optional numbers, e.g. one per list tab.

   Usage in a service :

       getPaged(query: PagedQuery & { type: string })
       {
           return this.http
               .get<any>(`${this.apiUrl}/paged`,
                         { params: toPagedParams(query) })
               .pipe(map(raw => toPagedResult(raw, x => this.normalize(x))));
       }
============================================================ */

import
{
    HttpParams
}
from '@angular/common/http';


export interface PagedQuery
{
    // 1-based
    page:number;

    pageSize:number;

    search?:string;

    // Column field, e.g. CustomerCode ('' = the page's default)
    sort?:string;

    dir?:'asc' | 'desc';
}


export interface PagedResult<T>
{
    items:T[];

    totalCount:number;

    page:number;

    pageSize:number;

    counts:Record<string, number>;
}


/* ============================================================
   Query object -> HttpParams (empty / null values left out)
============================================================ */

export function toPagedParams
(
    query:Record<string, unknown>
):
    HttpParams
{
    let params =
        new HttpParams();

    for (const [key, value] of Object.entries(query))
    {
        if
        (
            value === null ||
            value === undefined ||
            (typeof value === 'string' && value.trim() === '')
        )
        {
            continue;
        }

        params =
            params.set(
                key,
                typeof value === 'string'
                    ? value.trim()
                    : String(value));
    }

    return params;
}


/* ============================================================
   API answer (PascalCase or camelCase) -> PagedResult<T>
============================================================ */

export function toPagedResult<T>
(
    raw:any,
    normalize:(item:any) => T
):
    PagedResult<T>
{
    const pick =
        (name:string):any =>
            raw?.[name] ?? raw?.[name.charAt(0).toLowerCase() + name.slice(1)];

    const items:any[] =
        Array.isArray(pick('Items'))
            ? pick('Items')
            : [];

    const counts:Record<string, number> =
        {};

    const rawCounts =
        pick('Counts') ?? {};

    for (const key of Object.keys(rawCounts))
    {
        counts[key] =
            Number(rawCounts[key] ?? 0);
    }

    return {
        items:
            items.map(normalize),

        totalCount:
            Number(pick('TotalCount') ?? items.length),

        page:
            Number(pick('Page') ?? 1),

        pageSize:
            Number(pick('PageSize') ?? items.length),

        counts
    };
}
