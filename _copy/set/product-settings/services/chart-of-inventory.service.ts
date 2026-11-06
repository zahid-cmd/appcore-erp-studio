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
    CoiTypeNode,
    CoiCategoryNode,
    CoiSubCategoryNode,
    CoiProductRow,
    CoiIssue
}
from '../models/chart-of-inventory.model';


//===============================================================
// Case-Insensitive Field Reader
//===============================================================

function readField
(
    item:
        any,
    name:
        string
):
    any
{
    if
    (
        item == null
        ||
        typeof item !== 'object'
    )
    {
        return undefined;
    }

    if
    (
        name in item
    )
    {
        return item[name];
    }

    const target =
        name.toLowerCase();

    const key =
        Object.keys(item).find
        (
            k =>
                k.toLowerCase() ===
                target
        );

    return key !== undefined
        ? item[key]
        : undefined;
}

function text
(
    item:
        any,
    name:
        string
):
    string
{
    return String(
        readField(item, name)
        ??
        ''
    ).trim();
}

function num
(
    item:
        any,
    name:
        string
):
    number
{
    const value =
        Number(
            readField(item, name)
            ??
            0
        );

    return Number.isFinite(value)
        ? value
        : 0;
}

function bool
(
    item:
        any,
    name:
        string,
    fallback:
        boolean
):
    boolean
{
    const value =
        readField(item, name);

    return value == null
        ? fallback
        : Boolean(value);
}

function list
(
    item:
        any,
    name:
        string
):
    any[]
{
    const value =
        readField(item, name);

    return Array.isArray(value)
        ? value
        : [];
}


//===============================================================
// Normalizers (API → Model)
//===============================================================

function normalizeSubCategory
(
    item:
        any
):
    CoiSubCategoryNode
{
    return {
        Id:
            num(item, 'Id'),

        Code:
            text(item, 'Code'),

        Name:
            text(item, 'Name'),

        Status:
            bool(item, 'Status', true),

        ProductCount:
            num(item, 'ProductCount'),

        ActiveProductCount:
            num(item, 'ActiveProductCount')
    };
}

function normalizeCategory
(
    item:
        any
):
    CoiCategoryNode
{
    return {
        Id:
            num(item, 'Id'),

        Code:
            text(item, 'Code'),

        Name:
            text(item, 'Name'),

        Status:
            bool(item, 'Status', true),

        SubCategories:
            list(item, 'SubCategories').map(normalizeSubCategory)
    };
}

export function normalizeType
(
    item:
        any
):
    CoiTypeNode
{
    return {
        Id:
            num(item, 'Id'),

        Code:
            text(item, 'Code'),

        Name:
            text(item, 'Name'),

        CategoryType:
            text(item, 'CategoryType'),

        Status:
            bool(item, 'Status', true),

        Categories:
            list(item, 'Categories').map(normalizeCategory)
    };
}

export function normalizeProduct
(
    item:
        any
):
    CoiProductRow
{
    return {
        Id:
            num(item, 'Id'),

        SubCategoryId:
            num(item, 'SubCategoryId'),

        Code:
            text(item, 'Code'),

        Name:
            text(item, 'Name'),

        // Motor Bike / Spare Part / Accessory
        ItemType:
            text(item, 'ItemType'),

        // Pcs, Set, Pair … (bikes : Pcs)
        Unit:
            text(item, 'Unit'),

        InventoryLedger:
            text(item, 'InventoryLedger'),

        Status:
            bool(item, 'Status', true)
    };
}


//===============================================================
// Chart of Inventory Service (read-only)
//
// Every call goes to the server; nothing is cached here, so
// the page always reflects the product setting pages.
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class ChartOfInventoryService
{
    //===========================================================
    // Injection
    //===========================================================

    private readonly http =
        inject(HttpClient);


    //===========================================================
    // API
    //===========================================================

    private readonly apiUrl =
        `${environment.apiUrl}/settings/product-settings/chart-of-inventory`;


    //===========================================================
    // Get Tree (Type → Category → Sub Category, with counts)
    //===========================================================

    getTree():
        Observable<CoiTypeNode[]>
    {
        return this.http
            .get<any[]>(
                `${this.apiUrl}/tree`
            )
            .pipe(
                map(
                    response =>
                        (Array.isArray(response) ? response : [])
                            .map(normalizeType)
                )
            );
    }


    //===========================================================
    // Get Products Of One Sub Category
    //===========================================================

    getSubCategoryProducts
    (
        subCategoryId:
            number
    ):
        Observable<CoiProductRow[]>
    {
        return this.http
            .get<any[]>(
                `${this.apiUrl}/sub-categories/${subCategoryId}/products`
            )
            .pipe(
                map(
                    response =>
                        (Array.isArray(response) ? response : [])
                            .map(normalizeProduct)
                )
            );
    }


    //===========================================================
    // Get Link Issues (broken / inconsistent links)
    //===========================================================

    getIssues():
        Observable<CoiIssue[]>
    {
        return this.http
            .get<any[]>(
                `${this.apiUrl}/issues`
            )
            .pipe(
                map(
                    response =>
                        (Array.isArray(response) ? response : [])
                            .map
                            (
                                item =>
                                ({
                                    Level:
                                        text(item, 'Level'),

                                    Id:
                                        num(item, 'Id'),

                                    Code:
                                        text(item, 'Code'),

                                    Name:
                                        text(item, 'Name'),

                                    Problem:
                                        text(item, 'Problem')
                                })
                            )
                )
            );
    }


    //===========================================================
    // Get All Products (used for printing)
    //===========================================================

    getAllProducts():
        Observable<CoiProductRow[]>
    {
        return this.http
            .get<any[]>(
                `${this.apiUrl}/products`
            )
            .pipe(
                map(
                    response =>
                        (Array.isArray(response) ? response : [])
                            .map(normalizeProduct)
                )
            );
    }
}