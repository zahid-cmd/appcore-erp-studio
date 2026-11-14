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
from '../../../environments/environment';

import
{
    FaAcquisition,
    FaAsset,
    FaCategory,
    FaConfiguration,
    FaDisposal,
    FaLocation,
    FaLookups,
    FaRun,
    FaRunBranch,
    FaSchedule,
    FaScheduleReport,
    FaVerification,
    SaveFaAsset
}
from './fa.models';


//===============================================================
// Fixed Assets Management : the one service of the module
// (api/fixed-assets-management). The API answers in camelCase :
// everything is turned into the PascalCase of fa.models.ts, to
// any depth. Bodies are sent as the models are.
//
// Errors : error?.error?.message holds the reason.
//===============================================================

// camelCase -> PascalCase, to any depth
function pascal(value: any): any
{
    if (Array.isArray(value))
    {
        return value.map(pascal);
    }

    if (value !== null && typeof value === 'object')
    {
        const row: Record<string, any> = {};

        for (const key of Object.keys(value))
        {
            row[key.charAt(0).toUpperCase() + key.slice(1)] = pascal(value[key]);
        }

        return row;
    }

    return value;
}

export interface FaHistoryItem
{
    title: string;
    description: string;
    user: string;
    dateTime: string;
    badge: string;
}

@Injectable(
{
    providedIn:'root'
})
export class FaService
{
    private readonly http =
        inject(HttpClient);

    private readonly base =
        `${environment.apiUrl}/fixed-assets-management`;

    private get<T>(path: string, params?: HttpParams): Observable<T>
    {
        return this.http.get<any>(`${this.base}/${path}`, { params }).pipe(map(x => pascal(x) as T));
    }

    private post<T>(path: string, body: any): Observable<T>
    {
        return this.http.post<any>(`${this.base}/${path}`, body).pipe(map(x => pascal(x) as T));
    }

    private put<T>(path: string, body: any): Observable<T>
    {
        return this.http.put<any>(`${this.base}/${path}`, body ?? {}).pipe(map(x => pascal(x) as T));
    }

    private remove(path: string): Observable<void>
    {
        return this.http.delete<void>(`${this.base}/${path}`);
    }

    // The activity history of a page, as the history drawer wants it.
    // page : 'asset-setup/asset-groups' ...
    getHistory(page: string): Observable<FaHistoryItem[]>
    {
        return this.http
            .get<any[]>(`${this.base}/${page}/history`)
            .pipe(
                map(items =>
                    (Array.isArray(items) ? items : []).map(h => ({
                        title:h.ActivityTitle ?? h.activityTitle ?? '',
                        description:h.ActivityDescription ?? h.activityDescription ?? '',
                        user:h.PerformedByName ?? h.performedByName ?? 'System',
                        dateTime:new Date(h.PerformedDate ?? h.performedDate).toLocaleString(),
                        badge:h.ActivityType ?? h.activityType ?? ''
                    }))));
    }

    //===========================================================
    // Lookups (every page)
    //===========================================================

    getLookups(): Observable<FaLookups>
    {
        return this.get<FaLookups>('lookups');
    }

    //===========================================================
    // Asset Setup
    //===========================================================

    getCategories(): Observable<FaCategory[]>
    {
        return this.get<FaCategory[]>('asset-setup/asset-groups');
    }

    getCategory(publicId: string): Observable<FaCategory>
    {
        return this.get<FaCategory>(`asset-setup/asset-groups/${publicId}`);
    }

    // publicId '' : a new one
    saveCategory(publicId: string, body: Partial<FaCategory>): Observable<FaCategory>
    {
        return publicId
            ? this.put<FaCategory>(`asset-setup/asset-groups/${publicId}`, body)
            : this.post<FaCategory>('asset-setup/asset-groups', body);
    }

    deleteCategory(publicId: string): Observable<void>
    {
        return this.remove(`asset-setup/asset-groups/${publicId}`);
    }

    // { Message } : "FAC-0003 restored."
    restoreCategory(): Observable<{ Code: string; Message: string }>
    {
        return this.put<{ Code: string; Message: string }>('asset-setup/asset-groups/restore', {});
    }

    // Depreciation of Fixed Assets : every asset group with its rule
    getDepreciationRules(): Observable<FaCategory[]>
    {
        return this.get<FaCategory[]>('asset-setup/depreciation-of-fixed-assets');
    }

    getDepreciationRule(publicId: string): Observable<FaCategory>
    {
        return this.get<FaCategory>(`asset-setup/depreciation-of-fixed-assets/${publicId}`);
    }

    // Body : Method (None / StraightLine / ReducingBalance),
    // RatePercent, LifeYears, ResidualPercent, ExpenseLedgerCode,
    // GainLedgerCode, LossLedgerCode
    saveDepreciationRule(publicId: string, body: Partial<FaCategory>): Observable<FaCategory>
    {
        return this.put<FaCategory>(`asset-setup/depreciation-of-fixed-assets/${publicId}`, body);
    }

    getLocations(): Observable<FaLocation[]>
    {
        return this.get<FaLocation[]>('asset-setup/asset-locations');
    }

    getLocation(publicId: string): Observable<FaLocation>
    {
        return this.get<FaLocation>(`asset-setup/asset-locations/${publicId}`);
    }

    saveLocation(publicId: string, body: Partial<FaLocation>): Observable<FaLocation>
    {
        return publicId
            ? this.put<FaLocation>(`asset-setup/asset-locations/${publicId}`, body)
            : this.post<FaLocation>('asset-setup/asset-locations', body);
    }

    deleteLocation(publicId: string): Observable<void>
    {
        return this.remove(`asset-setup/asset-locations/${publicId}`);
    }

    restoreLocation(): Observable<{ Code: string; Message: string }>
    {
        return this.put<{ Code: string; Message: string }>('asset-setup/asset-locations/restore', {});
    }

    getConfiguration(): Observable<FaConfiguration>
    {
        return this.get<FaConfiguration>('asset-setup/asset-configuration');
    }

    saveConfiguration(body: FaConfiguration): Observable<void>
    {
        return this.put<void>('asset-setup/asset-configuration', body);
    }

    //===========================================================
    // Asset Register
    //===========================================================

    // Without the lines
    getAcquisitions(): Observable<FaAcquisition[]>
    {
        return this.get<FaAcquisition[]>('asset-register/asset-acquisitions');
    }

    getAcquisition(publicId: string): Observable<FaAcquisition>
    {
        return this.get<FaAcquisition>(`asset-register/asset-acquisitions/${publicId}`);
    }

    // Draft. publicId '' : a new one
    saveAcquisition(publicId: string, body: Partial<FaAcquisition>): Observable<FaAcquisition>
    {
        return publicId
            ? this.put<FaAcquisition>(`asset-register/asset-acquisitions/${publicId}`, body)
            : this.post<FaAcquisition>('asset-register/asset-acquisitions', body);
    }

    // Draft -> Posted : the Journal Voucher and the asset cards
    postAcquisition(publicId: string): Observable<void>
    {
        return this.put<void>(`asset-register/asset-acquisitions/${publicId}/post`, {});
    }

    // Posted -> Draft
    unpostAcquisition(publicId: string, reason: string): Observable<void>
    {
        return this.put<void>(`asset-register/asset-acquisitions/${publicId}/unpost`, { Reason:reason });
    }

    deleteAcquisition(publicId: string): Observable<void>
    {
        return this.remove(`asset-register/asset-acquisitions/${publicId}`);
    }

    // Every card (without History)
    getAssets(): Observable<FaAsset[]>
    {
        return this.get<FaAsset[]>('asset-register/fixed-asset-register');
    }

    // One card, with its History
    getAsset(publicId: string): Observable<FaAsset>
    {
        return this.get<FaAsset>(`asset-register/fixed-asset-register/${publicId}`);
    }

    updateAsset(publicId: string, body: SaveFaAsset): Observable<void>
    {
        return this.put<void>(`asset-register/fixed-asset-register/${publicId}`, body);
    }

    // The cards made on Opening Assets
    getOpeningAssets(): Observable<FaAsset[]>
    {
        return this.get<FaAsset[]>('asset-register/opening-assets');
    }

    getOpeningAsset(publicId: string): Observable<FaAsset>
    {
        return this.get<FaAsset>(`asset-register/opening-assets/${publicId}`);
    }

    // The asset no the next card of this branch and asset group gets
    getNextAssetNo(branchId: number, categoryId: number): Observable<{ AssetNo: string }>
    {
        return this.get<{ AssetNo: string }>(`asset-register/opening-assets/next-no?branchId=${branchId}&categoryId=${categoryId}`);
    }

    createOpeningAsset(body: SaveFaAsset): Observable<FaAsset>
    {
        return this.post<FaAsset>('asset-register/opening-assets', body);
    }

    updateOpeningAsset(publicId: string, body: SaveFaAsset): Observable<void>
    {
        return this.put<void>(`asset-register/opening-assets/${publicId}`, body);
    }

    deleteOpeningAsset(publicId: string): Observable<void>
    {
        return this.remove(`asset-register/opening-assets/${publicId}`);
    }

    //===========================================================
    // Depreciation
    //===========================================================

    // The branches with assets : the last run and the next month
    getRunBranches(): Observable<FaRunBranch[]>
    {
        return this.get<FaRunBranch[]>('depreciation/depreciation-runs/branches');
    }

    // Without the lines
    getRuns(): Observable<FaRun[]>
    {
        return this.get<FaRun[]>('depreciation/depreciation-runs');
    }

    getRun(publicId: string): Observable<FaRun>
    {
        return this.get<FaRun>(`depreciation/depreciation-runs/${publicId}`);
    }

    // What a run of the month would charge (nothing is saved).
    // The server refuses a month that is not the next one.
    previewRun(branchId: number, period: number): Observable<FaRun>
    {
        return this.get<FaRun>(
            'depreciation/depreciation-runs/preview',
            new HttpParams().set('branchId', String(branchId)).set('period', String(period)));
    }

    postRun(branchId: number, period: number, remarks: string): Observable<FaRun>
    {
        return this.post<FaRun>('depreciation/depreciation-runs', { BranchId:branchId, Period:period, Remarks:remarks });
    }

    // The last run of the branch only
    undoRun(publicId: string, reason: string): Observable<void>
    {
        return this.put<void>(`depreciation/depreciation-runs/${publicId}/undo`, { Reason:reason });
    }

    // The cards to pick from on Depreciation Schedule
    getScheduleAssets(): Observable<FaAsset[]>
    {
        return this.get<FaAsset[]>('depreciation/depreciation-schedule');
    }

    getSchedule(assetPublicId: string): Observable<FaSchedule>
    {
        return this.get<FaSchedule>(`depreciation/depreciation-schedule/${assetPublicId}`);
    }

    //===========================================================
    // Asset Disposal
    //===========================================================

    getDisposals(): Observable<FaDisposal[]>
    {
        return this.get<FaDisposal[]>('asset-disposal/asset-disposals');
    }

    // Body : DisposalDate, FaAssetId, Kind, BuyerName, SalePrice,
    // DebitLedgerCode, Remarks
    createDisposal(body: Partial<FaDisposal>): Observable<FaDisposal>
    {
        return this.post<FaDisposal>('asset-disposal/asset-disposals', body);
    }

    deleteDisposal(publicId: string): Observable<void>
    {
        return this.remove(`asset-disposal/asset-disposals/${publicId}`);
    }

    //===========================================================
    // Asset Reports
    //===========================================================

    // from / to '' : the financial year of today, to today.
    // branchId 0 : all branches
    getScheduleReport(from: string, to: string, branchId: number): Observable<FaScheduleReport>
    {
        let params = new HttpParams().set('branchId', String(branchId || 0));

        if (from)
        {
            params = params.set('from', from);
        }

        if (to)
        {
            params = params.set('to', to);
        }

        return this.get<FaScheduleReport>('asset-reports/fixed-asset-schedule', params);
    }

    // The cards, for the tags
    getTagAssets(): Observable<FaAsset[]>
    {
        return this.get<FaAsset[]>('asset-reports/asset-tags');
    }

    // Without the lines
    getVerifications(): Observable<FaVerification[]>
    {
        return this.get<FaVerification[]>('asset-reports/asset-verification');
    }

    getVerification(publicId: string): Observable<FaVerification>
    {
        return this.get<FaVerification>(`asset-reports/asset-verification/${publicId}`);
    }

    // Body : VerificationDate, BranchId, FaLocationId (0 : all),
    // Remarks. Makes the count sheet.
    createVerification(body: Partial<FaVerification>): Observable<FaVerification>
    {
        return this.post<FaVerification>('asset-reports/asset-verification', body);
    }

    // Draft : Lines (FaAssetId, Result, Note), ExtraItems, Remarks
    saveVerification(publicId: string, body: Partial<FaVerification>): Observable<void>
    {
        return this.put<void>(`asset-reports/asset-verification/${publicId}`, body);
    }

    // Refused while a line is Pending
    closeVerification(publicId: string): Observable<void>
    {
        return this.put<void>(`asset-reports/asset-verification/${publicId}/close`, {});
    }

    deleteVerification(publicId: string): Observable<void>
    {
        return this.remove(`asset-reports/asset-verification/${publicId}`);
    }
}
