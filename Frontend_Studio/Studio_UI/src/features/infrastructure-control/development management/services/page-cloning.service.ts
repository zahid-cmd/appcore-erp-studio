//===============================================================
// Imports
//===============================================================

import { Injectable, inject } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import
{
    PageCloning,
    PageCloningSourceAnalysis
}
from '../model/page-cloning.model';


//===============================================================
// Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class PageCloningService
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly http =
        inject(HttpClient);


    private readonly apiUrl =
        `${environment.apiUrl}/infrastructure-control/development-management/page-cloning`;


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<PageCloning[]>
    {
        return this.http.get<PageCloning[]>
        (
            this.apiUrl
        );
    }


    //===========================================================
    // Get By Id
    //===========================================================

    getById
    (
        id:number
    ):
        Observable<PageCloning>
    {
        return this.http.get<PageCloning>
        (
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Get List History
    //===========================================================

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>
        (
            `${this.apiUrl}/history`
        );
    }


    //===========================================================
    // Get Entity History
    //===========================================================

    getEntityHistory
    (
        id:number
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>
        (
            `${this.apiUrl}/${id}/history`
        );
    }


    //===========================================================
    // Analyze Source
    //===========================================================

    analyzeSource
    (
        submenuId:number
    ):
        Observable<PageCloningSourceAnalysis>
    {
        return this.http.get<PageCloningSourceAnalysis>
        (
            `${this.apiUrl}/analyze-source/${submenuId}`
        );
    }


    //===========================================================
    // Create
    //===========================================================

    create
    (
        pageCloning:PageCloning
    ):
        Observable<number>
    {
        return this.http.post<number>
        (
            this.apiUrl,

            pageCloning
        );
    }


    //===========================================================
    // Update
    //===========================================================

    update
    (
        pageCloning:PageCloning
    ):
        Observable<void>
    {
        return this.http.put<void>
        (
            `${this.apiUrl}/${pageCloning.id}`,

            pageCloning
        );
    }


    //===========================================================
    // Clone
    //===========================================================

    clone
    (
        id:number
    ):
        Observable<void>
    {
        return this.http.post<void>
        (
            `${this.apiUrl}/${id}/clone`,

            {}
        );
    }


    //===========================================================
    // Generate CRUD Package
    //===========================================================

    generatePackage
    (
        id:number
    ):
        Observable<void>
    {
        return this.http.post<void>
        (
            `${this.apiUrl}/${id}/generate`,

            {}
        );
    }


    //===========================================================
    // Restore Generated Package
    //===========================================================

    restorePackage
    (
        id:number
    ):
        Observable<void>
    {
        return this.http.post<void>
        (
            `${this.apiUrl}/${id}/restore-package`,

            {}
        );
    }


    //===========================================================
    // Delete
    //===========================================================

    delete
    (
        id:number
    ):
        Observable<void>
    {
        return this.http.delete<void>
        (
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Restore
    //===========================================================

    restore():
        Observable<void>
    {
        return this.http.put<void>
        (
            `${this.apiUrl}/restore`,

            {}
        );
    }

}