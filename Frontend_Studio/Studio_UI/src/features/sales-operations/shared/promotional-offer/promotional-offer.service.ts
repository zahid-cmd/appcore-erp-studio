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
    HttpClient,
    HttpParams
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
    PagedResult,
    toPagedParams,
    toPagedResult
}
from '../../../../shared/paging/paged-result.model';

import
{
    PromotionalOffer,
    PromotionalOfferDefaults,
    PromotionalOfferListItem,
    PromotionalOfferOption,
    PromotionalOfferPageQuery,
    PromotionalOfferSaved,
    SavePromotionalOffer
}
from './promotional-offer.model';


//===============================================================
// Read helpers (PascalCase or camelCase from the API)
//===============================================================

const pick =
    (x: any, name: string): any =>
        x?.[name] ?? x?.[name.charAt(0).toLowerCase() + name.slice(1)];

const text =
    (x: any, name: string): string =>
        String(pick(x, name) ?? '');

const num =
    (x: any, name: string): number =>
        Number(pick(x, name) ?? 0) || 0;

const optNum =
    (x: any, name: string): number | null =>
    {
        const value = pick(x, name);

        return value == null || value === '' ? null : Number(value);
    };

const day =
    (x: any, name: string): string =>
        text(x, name).substring(0, 10);

const list =
    (x: any, name: string): any[] =>
        (pick(x, name) ?? []) as any[];


function toOption(x: any): PromotionalOfferOption
{
    return {
        Id:num(x, 'Id'),
        Name:text(x, 'Name'),
        ParentId:optNum(x, 'ParentId'),
        BrandId:optNum(x, 'BrandId'),
        Note:text(x, 'Note')
    };
}


function toListItem(x: any): PromotionalOfferListItem
{
    return {
        PromotionalOfferId:num(x, 'PromotionalOfferId'),
        PublicId:text(x, 'PublicId'),
        OfferNo:text(x, 'OfferNo'),
        OfferName:text(x, 'OfferName'),
        OfferType:text(x, 'OfferType'),
        BrandName:text(x, 'BrandName'),
        FundedBy:text(x, 'FundedBy'),
        StartDate:day(x, 'StartDate'),
        EndDate:day(x, 'EndDate'),
        BenefitText:text(x, 'BenefitText'),
        TargetsText:text(x, 'TargetsText'),
        BranchesText:text(x, 'BranchesText'),
        Status:text(x, 'Status'),
        Phase:text(x, 'Phase')
    };
}


function toOffer(x: any): PromotionalOffer
{
    return {
        PromotionalOfferId:num(x, 'PromotionalOfferId'),
        PublicId:text(x, 'PublicId'),
        Channel:text(x, 'Channel'),
        OfferNo:text(x, 'OfferNo'),
        OfferName:text(x, 'OfferName'),
        OfferType:text(x, 'OfferType'),
        BrandManagementId:optNum(x, 'BrandManagementId'),
        BrandName:text(x, 'BrandName'),
        FundedBy:text(x, 'FundedBy'),
        StartDate:day(x, 'StartDate'),
        EndDate:day(x, 'EndDate'),
        AllBranches:!!pick(x, 'AllBranches'),
        BranchIds:list(x, 'BranchIds').map(v => Number(v) || 0),
        DiscountType:text(x, 'DiscountType') || 'Percent',
        DiscountValue:num(x, 'DiscountValue'),
        FreeServiceCount:num(x, 'FreeServiceCount'),
        ClaimDays:num(x, 'ClaimDays'),
        Terms:text(x, 'Terms'),
        Status:text(x, 'Status'),
        Phase:text(x, 'Phase'),
        StatusReason:text(x, 'StatusReason'),
        LedgerCode:text(x, 'LedgerCode'),
        LedgerName:text(x, 'LedgerName'),
        CreatedByName:text(x, 'CreatedByName'),
        CreatedDate:text(x, 'CreatedDate'),
        Targets:
            list(x, 'Targets').map
            (
                t =>
                ({
                    TargetType:text(t, 'TargetType') as any,
                    TargetId:num(t, 'TargetId'),
                    TargetName:text(t, 'TargetName'),
                    DiscountType:text(t, 'DiscountType'),
                    DiscountValue:optNum(t, 'DiscountValue'),
                    IsExcluded:!!pick(t, 'IsExcluded')
                })
            ),
        Prizes:
            list(x, 'Prizes').map
            (
                p =>
                ({
                    PrizeName:text(p, 'PrizeName'),
                    PrizeKind:text(p, 'PrizeKind') || 'Cash',
                    PrizeValue:num(p, 'PrizeValue'),
                    Quantity:num(p, 'Quantity'),
                    GivenQuantity:num(p, 'GivenQuantity')
                })
            )
    };
}


function toSaved(x: any): PromotionalOfferSaved
{
    return {
        PublicId:text(x, 'PublicId'),
        OfferNo:text(x, 'OfferNo'),
        Status:text(x, 'Status')
    };
}


//===============================================================
// Promotional Offers : the API of a page (config apiPath)
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class PromotionalOfferService
{
    private readonly http =
        inject(HttpClient);

    private url(apiPath: string): string
    {
        return `${environment.apiUrl}/${apiPath}`;
    }


    getAll(apiPath: string): Observable<PromotionalOfferListItem[]>
    {
        return this.http
            .get<any[]>(this.url(apiPath))
            .pipe(map(rows => (rows ?? []).map(toListItem)));
    }


    // One list page (tab, brand, search, sort) + summary counts
    getPaged(apiPath: string, query: PromotionalOfferPageQuery): Observable<PagedResult<PromotionalOfferListItem>>
    {
        return this.http
            .get<any>(`${this.url(apiPath)}/paged`, { params:toPagedParams(query as any) })
            .pipe(map(raw => toPagedResult(raw, toListItem)));
    }


    // The most recently deleted offer of the page
    restore(apiPath: string): Observable<any>
    {
        return this.http.put(`${this.url(apiPath)}/restore`, {});
    }


    // The page's history (list) / one offer's history
    getListHistory(apiPath: string): Observable<any[]>
    {
        return this.http.get<any[]>(`${this.url(apiPath)}/history`);
    }

    getOfferHistory(apiPath: string, publicId: string): Observable<any[]>
    {
        return this.http.get<any[]>(`${this.url(apiPath)}/${publicId}/history`);
    }


    get(apiPath: string, publicId: string): Observable<PromotionalOffer>
    {
        return this.http
            .get<any>(`${this.url(apiPath)}/${publicId}`)
            .pipe(map(toOffer));
    }


    getDefaults(apiPath: string): Observable<PromotionalOfferDefaults>
    {
        return this.http
            .get<any>(`${this.url(apiPath)}/defaults`)
            .pipe(
                map
                (
                    x =>
                    ({
                        Channel:text(x, 'Channel'),
                        NextOfferNo:text(x, 'NextOfferNo'),
                        Today:day(x, 'Today'),
                        BusinessLine:text(x, 'BusinessLine'),
                        OfferTypes:list(x, 'OfferTypes').map(v => String(v)),
                        Brands:list(x, 'Brands').map(toOption),
                        Branches:list(x, 'Branches').map(toOption),
                        Categories:list(x, 'Categories').map(toOption),
                        SubCategories:list(x, 'SubCategories').map(toOption),
                        Products:list(x, 'Products').map(toOption),
                        BikeModels:list(x, 'BikeModels').map(toOption)
                    })
                )
            );
    }


    searchProducts(apiPath: string, search: string): Observable<PromotionalOfferOption[]>
    {
        const params =
            new HttpParams().set('search', search ?? '');

        return this.http
            .get<any[]>(`${this.url(apiPath)}/products`, { params })
            .pipe(map(rows => (rows ?? []).map(toOption)));
    }


    create(apiPath: string, dto: SavePromotionalOffer): Observable<PromotionalOfferSaved>
    {
        return this.http
            .post<any>(this.url(apiPath), dto)
            .pipe(map(toSaved));
    }


    update(apiPath: string, publicId: string, dto: SavePromotionalOffer): Observable<PromotionalOfferSaved>
    {
        return this.http
            .put<any>(`${this.url(apiPath)}/${publicId}`, dto)
            .pipe(map(toSaved));
    }


    activate(apiPath: string, publicId: string): Observable<any>
    {
        return this.http.put(`${this.url(apiPath)}/${publicId}/activate`, {});
    }


    close(apiPath: string, publicId: string, reason: string): Observable<any>
    {
        return this.http.put(`${this.url(apiPath)}/${publicId}/close`, { Reason:reason });
    }


    cancel(apiPath: string, publicId: string, reason: string): Observable<any>
    {
        return this.http.put(`${this.url(apiPath)}/${publicId}/cancel`, { Reason:reason });
    }


    remove(apiPath: string, publicId: string): Observable<any>
    {
        return this.http.delete(`${this.url(apiPath)}/${publicId}`);
    }


    getHistory(apiPath: string, id: number): Observable<any[]>
    {
        return this.http.get<any[]>(`${this.url(apiPath)}/history/${id}`);
    }
}
