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
    CosTypeNode,
    CosCategoryNode,
    CosSubCategoryNode,
    CosServiceRow,
    CosIssue
}
from '../models/chart-of-services.model';


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
    CosSubCategoryNode
{
    return {
        Id:
            num(item, 'Id'),

        Code:
            text(item, 'Code'),

        Name:
            text(item, 'Name'),

        SubCategoryType:
            text(item, 'SubCategoryType'),

        Status:
            bool(item, 'Status', true),

        ServiceCount:
            num(item, 'ServiceCount'),

        ActiveServiceCount:
            num(item, 'ActiveServiceCount')
    };
}

function normalizeCategory
(
    item:
        any
):
    CosCategoryNode
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
    CosTypeNode
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

export function normalizeService
(
    item:
        any
):
    CosServiceRow
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

        // Scheduled Service / Labor Chart / Customized Service /
        // Membership Service
        ItemType:
            text(item, 'ItemType'),

        Charge:
            num(item, 'Charge'),

        StandardMinutes:
            num(item, 'StandardMinutes'),

        IncomeLedger:
            text(item, 'IncomeLedger'),

        ExpenseLedger:
            text(item, 'ExpenseLedger'),

        IsConfigured:
            bool(item, 'IsConfigured', true),

        Status:
            bool(item, 'Status', true)
    };
}


//===============================================================
// Chart of Services Service (read-only)
//
// Every call goes to the server; nothing is cached here, so
// the page always reflects the service setting pages.
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class ChartOfServicesService
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
        `${environment.apiUrl}/settings/service-settings/chart-of-services`;


    //===========================================================
    // Get Tree (Type → Category → Sub Category, with counts)
    //===========================================================

    getTree():
        Observable<CosTypeNode[]>
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
    // Get Services Of One Sub Category
    //===========================================================

    getSubCategoryServices
    (
        subCategoryId:
            number
    ):
        Observable<CosServiceRow[]>
    {
        return this.http
            .get<any[]>(
                `${this.apiUrl}/sub-categories/${subCategoryId}/services`
            )
            .pipe(
                map(
                    response =>
                        (Array.isArray(response) ? response : [])
                            .map(normalizeService)
                )
            );
    }


    //===========================================================
    // Get Link Issues (broken / inconsistent links)
    //===========================================================

    getIssues():
        Observable<CosIssue[]>
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
    // Get All Services (used for printing)
    //===========================================================

    getAllServices():
        Observable<CosServiceRow[]>
    {
        return this.http
            .get<any[]>(
                `${this.apiUrl}/services`
            )
            .pipe(
                map(
                    response =>
                        (Array.isArray(response) ? response : [])
                            .map(normalizeService)
                )
            );
    }
}