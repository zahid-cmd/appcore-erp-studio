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
    decodeBn,
    encodeBn
}
from '../../../../core/bangla/bangla-text';

import
{
    PdiItemType,
    PdiTemplate,
    PdiTemplateDefaults,
    PdiTemplateListItem
}
from '../models/pdi-templates.model';


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

const list =
    (x: any, name: string): any[] =>
    {
        const value = pick(x, name);
        return Array.isArray(value) ? value : [];
    };

export function normalizePdiTemplate
(
    x: any
):
    PdiTemplate
{
    return {
        PdiTemplateId:num(x, 'PdiTemplateId'),
        PublicId:text(x, 'PublicId'),
        Code:text(x, 'Code'),
        Name:text(x, 'Name'),
        NameBn:decodeBn(text(x, 'NameBn')),
        SheetTitle:text(x, 'SheetTitle'),
        SheetTitleBn:decodeBn(text(x, 'SheetTitleBn')),
        FooterNote:text(x, 'FooterNote'),
        FooterNoteBn:decodeBn(text(x, 'FooterNoteBn')),
        ServiceProviderName:text(x, 'ServiceProviderName'),
        BrandName:text(x, 'BrandName'),
        BrandImagePath:text(x, 'BrandImagePath'),
        Remarks:text(x, 'Remarks'),
        IsActive:pick(x, 'IsActive') !== false,
        Models:list(x, 'Models').map(m => ({
            BikeModelId:num(m, 'BikeModelId'),
            ModelName:text(m, 'ModelName'),
            BrandName:text(m, 'BrandName')
        })),
        Sections:list(x, 'Sections').map(s => ({
            Title:text(s, 'Title'),
            TitleBn:decodeBn(text(s, 'TitleBn')),
            HasComments:!!pick(s, 'HasComments'),
            Items:list(s, 'Items').map(i => ({
                Text:text(i, 'Text'),
                TextBn:decodeBn(text(i, 'TextBn')),
                ItemType:(text(i, 'ItemType') || 'Check') as PdiItemType,
                Unit:text(i, 'Unit'),
                IsRequired:pick(i, 'IsRequired') !== false
            }))
        }))
    };
}


//===============================================================
// PDI Templates Service : api/settings/service-settings/pdi-templates
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class PdiTemplatesService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/settings/service-settings/pdi-templates`;

    getAll():
        Observable<PdiTemplateListItem[]>
    {
        return this.http
            .get<any[]>(this.apiUrl)
            .pipe(
                map(rows =>
                    (Array.isArray(rows) ? rows : []).map(x => ({
                        PublicId:text(x, 'PublicId'),
                        Code:text(x, 'Code'),
                        Name:text(x, 'Name'),
                        ModelsText:text(x, 'ModelsText'),
                        ModelCount:num(x, 'ModelCount'),
                        SectionCount:num(x, 'SectionCount'),
                        ItemCount:num(x, 'ItemCount'),
                        IsActive:pick(x, 'IsActive') !== false
                    }))));
    }

    getById(publicId: string):
        Observable<PdiTemplate>
    {
        return this.http
            .get<any>(`${this.apiUrl}/${publicId}`)
            .pipe(map(normalizePdiTemplate));
    }

    getDefaults():
        Observable<PdiTemplateDefaults>
    {
        return this.http
            .get<any>(`${this.apiUrl}/defaults`)
            .pipe(
                map(x => ({
                    NextCode:text(x, 'NextCode'),
                    Models:list(x, 'Models').map(m => ({
                        BikeModelId:num(m, 'BikeModelId'),
                        ModelName:text(m, 'ModelName'),
                        BrandName:text(m, 'BrandName'),
                        BikeType:text(m, 'BikeType'),
                        TemplateCode:text(m, 'TemplateCode'),
                        TemplatePublicId:text(m, 'TemplatePublicId')
                    }))
                })));
    }

    // The form's template -> the API body (Bangla encoded)
    private body(t: PdiTemplate): any
    {
        return {
            Name:t.Name,
            NameBn:encodeBn(t.NameBn),
            SheetTitle:t.SheetTitle,
            SheetTitleBn:encodeBn(t.SheetTitleBn),
            FooterNote:t.FooterNote,
            FooterNoteBn:encodeBn(t.FooterNoteBn),
            ServiceProviderName:t.ServiceProviderName,
            Remarks:t.Remarks,
            IsActive:t.IsActive,
            ModelIds:t.Models.map(m => m.BikeModelId),
            Sections:t.Sections.map(s => ({
                Title:s.Title,
                TitleBn:encodeBn(s.TitleBn),
                HasComments:s.HasComments,
                Items:s.Items.map(i => ({
                    Text:i.Text,
                    TextBn:encodeBn(i.TextBn),
                    ItemType:i.ItemType,
                    Unit:i.ItemType === 'Reading' ? i.Unit : '',
                    IsRequired:i.IsRequired
                }))
            }))
        };
    }

    create(t: PdiTemplate):
        Observable<PdiTemplate>
    {
        return this.http
            .post<any>(this.apiUrl, this.body(t))
            .pipe(map(normalizePdiTemplate));
    }

    update(publicId: string, t: PdiTemplate):
        Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/${publicId}`, this.body(t));
    }

    delete(publicId: string):
        Observable<void>
    {
        return this.http.delete<void>(`${this.apiUrl}/${publicId}`);
    }

    restore():
        Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/restore`, {});
    }

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/history`);
    }
}
