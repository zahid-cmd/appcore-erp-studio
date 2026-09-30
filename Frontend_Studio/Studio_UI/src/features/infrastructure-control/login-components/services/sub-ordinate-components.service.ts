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
    Observable
}
from 'rxjs';

import
{
    environment
}
from '../../../../environments/environment';

import
{
    SubOrdinateComponents,

    CreateSubOrdinateComponents,

    UpdateSubOrdinateComponents,

    SubOrdinateComponentsDefaults
}
from '../models/sub-ordinate-components.model';


//===============================================================
// Sub Ordinate Components Service
//===============================================================

@Injectable
({
    providedIn:
        'root'
})


//===============================================================
// Service
//===============================================================

export class SubOrdinateComponentsService
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
        `${environment.apiUrl}/infrastructure-control/login-components/sub-ordinate-components`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<SubOrdinateComponents[]>
    {
        return this.http.get<SubOrdinateComponents[]>(
            this.apiUrl
        );
    }



    //===========================================================
    // Get By Id
    //===========================================================

    getById
    (
        id:
            number
    ):
        Observable<SubOrdinateComponents>
    {
        return this.http.get<SubOrdinateComponents>(
            `${this.apiUrl}/${id}`
        );
    }



    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<SubOrdinateComponentsDefaults>
    {
        return this.http.get<SubOrdinateComponentsDefaults>(
            `${this.apiUrl}/defaults`
        );
    }



    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateSubOrdinateComponents
    ):
        Observable<number>
    {
        const formData =
            this.buildCreateFormData(
                model
            );

        return this.http.post<number>(
            this.apiUrl,

            formData
        );
    }



    //===========================================================
    // Update
    //===========================================================

    update
    (
        model:
            UpdateSubOrdinateComponents
    ):
        Observable<void>
    {
        const formData =
            this.buildUpdateFormData(
                model
            );

        return this.http.put<void>(
            `${this.apiUrl}/${model.id}`,

            formData
        );
    }



    //===========================================================
    // Delete
    //===========================================================

    delete
    (
        id:
            number
    ):
        Observable<void>
    {
        return this.http.delete<void>(
            `${this.apiUrl}/${id}`
        );
    }



    //===========================================================
    // Restore
    //===========================================================

    restore():
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/restore`,

            {}
        );
    }



    //===========================================================
    // Get History
    //===========================================================

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/history`
        );
    }



    //===========================================================
    // Get Entity History
    //===========================================================

    getEntityHistory
    (
        id:
            number
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/${id}/history`
        );
    }



    //===========================================================
    // Build Create Form Data
    //===========================================================

    private buildCreateFormData
    (
        model:
            CreateSubOrdinateComponents
    ):
        FormData
    {
        const formData =
            new FormData();


        //=======================================================
        // Section 1 - General Information
        //=======================================================

        formData.append(
            'name',
            model.name ?? ''
        );

        formData.append(
            'tabName',
            model.tabName ?? ''
        );

        formData.append(
            'icon',
            model.icon ?? ''
        );


        //=======================================================
        // Section 2 - Component Information
        //=======================================================

        formData.append(
            'folderName',
            model.folderName ?? ''
        );

        formData.append(
            'featureFolder',
            model.featureFolder ?? ''
        );

        formData.append(
            'featureSubFolder',
            model.featureSubFolder ?? ''
        );

        formData.append(
            'componentPath',
            model.componentPath ?? ''
        );


        //=======================================================
        // Section 3 - File & Registration Information
        //=======================================================

        formData.append(
            'registrationFilePath',
            model.registrationFilePath ?? ''
        );

        formData.append(
            'htmlFilePath',
            model.htmlFilePath ?? ''
        );

        formData.append(
            'tsFilePath',
            model.tsFilePath ?? ''
        );

        formData.append(
            'cssFilePath',
            model.cssFilePath ?? ''
        );


        //=======================================================
        // Section 4 - Status & Additional Information
        //=======================================================

        formData.append(
            'displayOrder',
            String(
                model.displayOrder
            )
        );

        formData.append(
            'status',
            String(
                model.status
            )
        );

        formData.append(
            'remarks',
            model.remarks ?? ''
        );


        //=======================================================
        // Section 5 - Background Image Configuration
        //=======================================================

        if
        (
            model.lightBackgroundImage
        )
        {
            formData.append(
                'lightBackgroundImage',

                model.lightBackgroundImage,

                model.lightBackgroundImage.name
            );
        }


        if
        (
            model.deepBackgroundImage
        )
        {
            formData.append(
                'deepBackgroundImage',

                model.deepBackgroundImage,

                model.deepBackgroundImage.name
            );
        }


        return formData;
    }



    //===========================================================
    // Build Update Form Data
    //===========================================================

    private buildUpdateFormData
    (
        model:
            UpdateSubOrdinateComponents
    ):
        FormData
    {
        const formData =
            new FormData();


        //=======================================================
        // ID
        //=======================================================

        formData.append(
            'id',

            String(
                model.id
            )
        );


        //=======================================================
        // Section 1 - General Information
        //=======================================================

        formData.append(
            'name',
            model.name ?? ''
        );

        formData.append(
            'tabName',
            model.tabName ?? ''
        );

        formData.append(
            'icon',
            model.icon ?? ''
        );


        //=======================================================
        // Section 2 - Component Information
        //=======================================================

        formData.append(
            'folderName',
            model.folderName ?? ''
        );

        formData.append(
            'featureFolder',
            model.featureFolder ?? ''
        );

        formData.append(
            'featureSubFolder',
            model.featureSubFolder ?? ''
        );

        formData.append(
            'componentPath',
            model.componentPath ?? ''
        );


        //=======================================================
        // Section 3 - File & Registration Information
        //=======================================================

        formData.append(
            'registrationFilePath',
            model.registrationFilePath ?? ''
        );

        formData.append(
            'htmlFilePath',
            model.htmlFilePath ?? ''
        );

        formData.append(
            'tsFilePath',
            model.tsFilePath ?? ''
        );

        formData.append(
            'cssFilePath',
            model.cssFilePath ?? ''
        );


        //=======================================================
        // Section 4 - Status & Additional Information
        //=======================================================

        formData.append(
            'displayOrder',
            String(
                model.displayOrder
            )
        );

        formData.append(
            'status',
            String(
                model.status
            )
        );

        formData.append(
            'remarks',
            model.remarks ?? ''
        );


        //=======================================================
        // Section 5 - Background Image Configuration
        //=======================================================

        if
        (
            model.lightBackgroundImage
        )
        {
            formData.append(
                'lightBackgroundImage',

                model.lightBackgroundImage,

                model.lightBackgroundImage.name
            );
        }


        if
        (
            model.deepBackgroundImage
        )
        {
            formData.append(
                'deepBackgroundImage',

                model.deepBackgroundImage,

                model.deepBackgroundImage.name
            );
        }


        //=======================================================
        // Image Removal Flags
        //=======================================================

        formData.append(
            'removeLightBackgroundImage',

            String(
                model.removeLightBackgroundImage
            )
        );

        formData.append(
            'removeDeepBackgroundImage',

            String(
                model.removeDeepBackgroundImage
            )
        );


        return formData;
    }

}