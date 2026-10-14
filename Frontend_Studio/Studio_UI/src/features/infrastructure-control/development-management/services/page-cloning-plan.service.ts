import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface PlanFileChange
{
    logicalKey: string;
    path: string;
    before: string;
    after: string;
    editedSinceBaseline: boolean;
}

export interface PlanPreviewResult
{
    pageCloningId: number;
    files: PlanFileChange[];
    warnings: string[];
}

export interface PlanActionResult
{
    success: boolean;
    messages: string[];
    buildOutput: string;
    runStatus: string;
    pageCloningId: number;
}

@Injectable({ providedIn: 'root' })
export class PageCloningPlanService
{
    private readonly http = inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/infrastructure-control/development-management/page-cloning`;

    previewPlan(plan: unknown): Observable<PlanPreviewResult>
    {
        return this.http.post<PlanPreviewResult>(`${this.apiUrl}/preview-plan`, plan);
    }

    savePlan(plan: unknown, overwriteEdited: boolean): Observable<PlanActionResult>
    {
        return this.http.post<PlanActionResult>(
            `${this.apiUrl}/save-plan`,
            plan,
            { params: { overwriteEdited } });
    }

    restore(id: number): Observable<PlanActionResult>
    {
        return this.http.post<PlanActionResult>(`${this.apiUrl}/${id}/restore-baseline`, {});
    }
}