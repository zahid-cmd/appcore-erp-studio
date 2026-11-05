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
    PriceList,
    PriceListRow
}
from '../models/price-list.model';


//===============================================================
// Price List service (read only)
//
//   GET <api>?type=MB|SP|AC          every product of the type
//   GET <api>?type=&print=true       the same; needs "Print"
//
// The API answers in camelCase; mapped to PascalCase.
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class PriceListService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/inventory-management/pricing-labels/price-list`;

    get
    (
        type:
            string,
        print:
            boolean = false
    ):
        Observable<PriceList>
    {
        return this.http
            .get<any>(this.apiUrl, { params:print ? { type, print:'true' } : { type } })
            .pipe(
                map
                (
                    x =>
                    ({
                        PageType:text(pick(x, 'PageType')),
                        Today:text(pick(x, 'Today')),
                        ProfitOnSale:!!pick(x, 'ProfitOnSale'),
                        SalesVatApplicable:pick(x, 'SalesVatApplicable') !== false,
                        SalesVatRules:list(pick(x, 'SalesVatRules')).map
                        (
                            r =>
                            ({
                                VatType:text(pick(r, 'VatType')),
                                Rate:num(pick(r, 'Rate')),
                                EffectiveFrom:text(pick(r, 'EffectiveFrom')),
                                ValidTo:text(pick(r, 'ValidTo'))
                            })
                        ),
                        Rows:list(pick(x, 'Rows')).map(toRow)
                    })
                )
            );
    }
}


//===============================================================
// Mapping (camelCase or PascalCase in)
//===============================================================

function pick
(
    source:
        any,
    name:
        string
):
    any
{
    if
    (
        !source
    )
    {
        return undefined;
    }

    const camel =
        name.charAt(0).toLowerCase() + name.slice(1);

    return source[name] ?? source[camel];
}

function text
(
    value:
        any
):
    string
{
    return value === null || value === undefined
        ? ''
        : String(value);
}

function num
(
    value:
        any
):
    number
{
    return Number(value) || 0;
}

function list
(
    value:
        any
):
    any[]
{
    return Array.isArray(value)
        ? value
        : [];
}

function toRow
(
    x:
        any
):
    PriceListRow
{
    return {
        ProductId:num(pick(x, 'ProductId')),
        Code:text(pick(x, 'Code')),
        Name:text(pick(x, 'Name')),
        PartNumber:text(pick(x, 'PartNumber')),
        PartName:text(pick(x, 'PartName')),
        Unit:text(pick(x, 'Unit')),
        VatType:text(pick(x, 'VatType')),
        BrandId:num(pick(x, 'BrandId')),
        BrandName:text(pick(x, 'BrandName')),
        CategoryId:num(pick(x, 'CategoryId')),
        CategoryName:text(pick(x, 'CategoryName')),
        SubCategoryId:num(pick(x, 'SubCategoryId')),
        SubCategoryName:text(pick(x, 'SubCategoryName')),
        InStock:num(pick(x, 'InStock')),
        AvgCost:num(pick(x, 'AvgCost')),
        LastCost:num(pick(x, 'LastCost')),
        CurrentMrp:num(pick(x, 'CurrentMrp')),
        MrpDate:text(pick(x, 'MrpDate')),
        MrpSourceNo:text(pick(x, 'MrpSourceNo')),
        BatchCount:num(pick(x, 'BatchCount')),
        UnpricedBatches:num(pick(x, 'UnpricedBatches'))
    };
}
