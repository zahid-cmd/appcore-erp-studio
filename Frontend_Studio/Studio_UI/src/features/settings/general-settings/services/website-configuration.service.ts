//===============================================================
// Website Configuration Service
//
//   get()            the configuration (defaults when never saved)
//   save(model)      saves everything in one go
//   uploadImage(f)   a website photo → its path
//   mapPin(link)     a Google Maps link → its pin
//   history()        changes, newest first
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
    WebsiteConfiguration
}
from '../models/website-configuration.model';


@Injectable(
{
    providedIn:'root'
})
export class WebsiteConfigurationService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/settings/general-settings/website-configuration`;

    // Uploaded files are served by the API host
    readonly fileRoot =
        environment.apiUrl.replace(/\/api\/?$/, '');


    get():
        Observable<WebsiteConfiguration>
    {
        return this.http
            .get<WebsiteConfiguration>(this.apiUrl)
            .pipe(
                map(x => normalize(x))
            );
    }


    save
    (
        model:
            WebsiteConfiguration
    ):
        Observable<void>
    {
        return this.http.put<void>(this.apiUrl, model);
    }


    uploadImage
    (
        file:
            File
    ):
        Observable<string>
    {
        const form =
            new FormData();

        form.append('file', file);

        return this.http
            .post<{ path:string }>(`${this.apiUrl}/image`, form)
            .pipe(
                map(x => x?.path ?? '')
            );
    }


    // Google Maps link → { query : "lat,lng" or place name, name }
    mapPin
    (
        link:
            string
    ):
        Observable<{ link:string; query:string; name:string }>
    {
        return this.http.post<{ link:string; query:string; name:string }>(`${this.apiUrl}/map-pin`, { link });
    }


    history():
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/history`);
    }


    // "/uploads/…" → full address on the API host
    fileUrl
    (
        path:
            string
    ):
        string
    {
        if
        (
            !path
        )
        {
            return '';
        }

        return /^(https?:)?\/\//i.test(path)
            ? path
            : `${this.fileRoot}${path.startsWith('/') ? '' : '/'}${path}`;
    }
}


// Fills anything the API left out, so the page never sees undefined
function normalize
(
    x:
        any
):
    WebsiteConfiguration
{
    const list =
        (v:any) =>
            Array.isArray(v) ? v : [];

    const text =
        (v:any) =>
            v === null || v === undefined ? '' : String(v);

    return {
        exists:x?.exists === true,
        isEnabled:x?.isEnabled !== false,
        defaultTheme:['auto', 'light', 'deep'].includes(x?.defaultTheme) ? x.defaultTheme : 'auto',
        template:text(x?.template) || 'website-page-1',
        currencySymbol:text(x?.currencySymbol) || '৳',
        offerTitle:text(x?.offerTitle),
        offerText:text(x?.offerText),
        offerEndsOn:x?.offerEndsOn ? String(x.offerEndsOn).slice(0, 10) : null,
        tagline:text(x?.tagline),
        about:text(x?.about),
        hotline:text(x?.hotline),
        whatsApp:text(x?.whatsApp),
        email:text(x?.email),
        mapQuery:text(x?.mapQuery),
        mapLink:text(x?.mapLink),
        facebookUrl:text(x?.facebookUrl),
        youtubeUrl:text(x?.youtubeUrl),
        instagramUrl:text(x?.instagramUrl),
        tiktokUrl:text(x?.tiktokUrl),
        showBrandsMenu:x?.showBrandsMenu !== false,
        showOfferRibbon:x?.showOfferRibbon !== false,
        showMovingStrip:x?.showMovingStrip !== false,
        heroPhotoPath:text(x?.heroPhotoPath),
        heroWelcome:x?.heroWelcome !== false,
        heroBackground:x?.heroBackground !== false,
        heroStrength:Number.isInteger(Number(x?.heroStrength)) && Number(x?.heroStrength) >= 1 && Number(x?.heroStrength) <= 5 ? Number(x.heroStrength) : 2,
        heroTitle:text(x?.heroTitle),
        heroText:text(x?.heroText),
        heroShowAddress:x?.heroShowAddress !== false,
        heroRoundOn:x?.heroRoundOn !== false,
        heroRoundPath:text(x?.heroRoundPath),
        heroRoundStrength:Number.isInteger(Number(x?.heroRoundStrength)) && Number(x?.heroRoundStrength) >= 1 && Number(x?.heroRoundStrength) <= 5 ? Number(x.heroRoundStrength) : 2,
        stripSpeed:Number.isInteger(Number(x?.stripSpeed)) && Number(x?.stripSpeed) >= 1 && Number(x?.stripSpeed) <= 10 ? Number(x.stripSpeed) : 5,
        showWhyUs:x?.showWhyUs !== false,
        showEmi:x?.showEmi !== false,
        showService:x?.showService !== false,
        showBranches:x?.showBranches !== false,
        showFaq:x?.showFaq !== false,
        whyPhotoPath:text(x?.whyPhotoPath),
        emiExamplePrice:Number(x?.emiExamplePrice) || 0,
        emiDownPercents:list(x?.emiDownPercents).map(Number).filter((n:number) => isFinite(n)),
        emiMonths:list(x?.emiMonths).map(Number).filter((n:number) => isFinite(n)),
        emiNote:text(x?.emiNote),
        openingHours:list(x?.openingHours).map((h:any) => ({ days:text(h?.days), opensAt:text(h?.opensAt), closesAt:text(h?.closesAt), isClosed:h?.isClosed === true })),
        items:list(x?.items).map((i:any) => ({ kind:i?.kind, title:text(i?.title), text:text(i?.text), photoPath:text(i?.photoPath) })),
        brands:list(x?.brands).map((b:any) => ({ brandManagementId:Number(b?.brandManagementId) || 0, brandCode:text(b?.brandCode), brandName:text(b?.brandName), logoPath:text(b?.logoPath), bikeModels:Number(b?.bikeModels) || 0, showOnWebsite:b?.showOnWebsite !== false, showBrandPage:b?.showBrandPage !== false, about:text(b?.about) })),
        branches:list(x?.branches).map((b:any) => ({ branchId:Number(b?.branchId) || 0, branchName:text(b?.branchName), wingName:text(b?.wingName), brandIds:list(b?.brandIds).map(Number) })),
        policies:list(x?.policies).map((p:any) => ({ policyKey:p?.policyKey, brandManagementId:Number(p?.brandManagementId) || 0, brandName:text(p?.brandName), title:text(p?.title), updatedOn:p?.updatedOn ? String(p.updatedOn).slice(0, 10) : null, sections:list(p?.sections).map((s:any) => ({ heading:text(s?.heading), text:text(s?.text) })) })),
        company:
        {
            name:text(x?.company?.name),
            logoPath:text(x?.company?.logoPath),
            phone:text(x?.company?.phone),
            mobile:text(x?.company?.mobile),
            email:text(x?.company?.email),
            address:text(x?.company?.address)
        },
        modifiedDate:x?.modifiedDate ?? null
    };
}
