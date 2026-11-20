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
    HttpResponse
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


//===============================================================
// Brand Packs Service (AppCore only, 2026-11-20)
//===============================================================

export interface BrandPackBrandRow
{
    name: string;
    models: number;
    bikes: number;
}

export interface BrandPackReport
{
    success: boolean;
    brand: string;
    created: number;
    updated: number;
    kept: number;
    lines: string[];
    error: string;
}

export interface BrandPackFile
{
    blob: Blob;
    fileName: string;
    missingImages: number;
}

@Injectable(
{
    providedIn:'root'
})
export class BrandPacksService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/platform/brand-packs`;


    brands():
        Observable<BrandPackBrandRow[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/brands`)
            .pipe(
                map(
                    rows =>
                        (rows ?? []).map(
                            r =>
                            ({
                                name: String(r?.name ?? r?.Name ?? ''),
                                models: Number(r?.models ?? r?.Models ?? 0),
                                bikes: Number(r?.bikes ?? r?.Bikes ?? 0)
                            }))
                )
            );
    }


    export(brand: string):
        Observable<BrandPackFile>
    {
        return this.http.get(
                `${this.apiUrl}/export`,
                {
                    params: { brand },
                    responseType: 'blob',
                    observe: 'response'
                })
            .pipe(
                map(
                    (res: HttpResponse<Blob>) =>
                    {
                        const disposition =
                            res.headers.get('Content-Disposition') ?? '';

                        const match =
                            /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);

                        return {
                            blob: res.body ?? new Blob(),
                            fileName: match ? decodeURIComponent(match[1]) : `${brand}.acbrand`,
                            missingImages: Number(res.headers.get('X-Pack-Missing-Images') ?? 0)
                        };
                    })
            );
    }


    install(file: File):
        Observable<BrandPackReport>
    {
        const form =
            new FormData();

        form.append('file', file, file.name);

        return this.http.post<any>(`${this.apiUrl}/install`, form)
            .pipe(
                map(
                    r =>
                    ({
                        success: !!(r?.success ?? r?.Success),
                        brand: String(r?.brand ?? r?.Brand ?? ''),
                        created: Number(r?.created ?? r?.Created ?? 0),
                        updated: Number(r?.updated ?? r?.Updated ?? 0),
                        kept: Number(r?.kept ?? r?.Kept ?? 0),
                        lines: (r?.lines ?? r?.Lines ?? []).map((x: any) => String(x)),
                        error: String(r?.error ?? r?.Error ?? '')
                    })
                )
            );
    }
}
