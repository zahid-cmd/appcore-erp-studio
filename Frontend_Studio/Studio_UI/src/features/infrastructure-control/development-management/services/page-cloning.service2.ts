//===============================================================
// Imports
//===============================================================

import { Injectable, inject } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import {
    BehaviorSubject,
    Observable,
    map,
    switchMap,
    throwError
} from 'rxjs';

import { environment } from '../../../../environments/environment';

import {
    PageCloning,
    PageCloningModelField,
    PageCloningSourceAnalysis,
    PageCloningSourceFile,
    PageCloningTransformation
} from '../model/page-cloning2.model';


//===============================================================
// Workflow State Model
//===============================================================

export interface PageCloningWorkflowState {
    pageCloning: PageCloning | null;

    selectedCloneFromModuleId: number;
    selectedCloneFromMenuId: number;
    selectedCloneFromSubmenuId: number;

    pageCloningFiles: PageCloningSourceFile[];
    sourceModelFields: PageCloningModelField[];

    sourceAnalysis: PageCloningSourceAnalysis | null;
    sourceAnalysisReady: boolean;
    sourceAnalysisFileCount: number;
}


//===============================================================
// Generate Result
//===============================================================

export interface PageCloningGenerateResult {
    id: number;
    status: string;
    message: string;
}


//===============================================================
// Clone Request Configuration
//===============================================================

export interface PageCloningCloneRequest {
    cloneFromId: number;
    cloneToId: number;

    renameIdentifiers: boolean;
    updateRoutes: boolean;
    updateApiReferences: boolean;
    updateModelReferences: boolean;
    preserveTargetFilePaths: boolean;

    modelFields: PageCloningModelField[];
}


//===============================================================
// Service
//===============================================================

@Injectable({
    providedIn: 'root'
})
export class PageCloningService {

    //===========================================================
    // Dependencies
    //===========================================================

    private readonly http = inject(HttpClient);


    //===========================================================
    // API Configuration
    //===========================================================

    private readonly apiUrl =
        `${environment.apiUrl}/infrastructure-control/development-management/page-cloning`;


    //===========================================================
    // Workflow State
    //===========================================================

    private readonly workflowStateSubject =
        new BehaviorSubject<PageCloningWorkflowState | null>(null);

    readonly workflowState$ =
        this.workflowStateSubject.asObservable();


    //===========================================================
    // Get Workflow State
    //===========================================================

    getWorkflowState(): PageCloningWorkflowState | null {
        return this.workflowStateSubject.value;
    }


    //===========================================================
    // Set Workflow State
    //===========================================================

    setWorkflowState(state: PageCloningWorkflowState): void {
        this.workflowStateSubject.next(state);
    }


    //===========================================================
    // Clear Workflow State
    //===========================================================

    clearWorkflowState(): void {
        this.workflowStateSubject.next(null);
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll(): Observable<PageCloning[]> {
        return this.http.get<PageCloning[]>(this.apiUrl);
    }


    //===========================================================
    // Get By Id
    //===========================================================

    getById(id: number): Observable<PageCloning> {
        this.validateId(id);

        return this.http.get<PageCloning>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Get List History
    //===========================================================

    getHistory(): Observable<any[]> {
        return this.http.get<any[]>(
            `${this.apiUrl}/history`
        );
    }


    //===========================================================
    // Get Entity History
    //===========================================================

    getEntityHistory(id: number): Observable<any[]> {
        this.validateId(id);

        return this.http.get<any[]>(
            `${this.apiUrl}/${id}/history`
        );
    }


    //===========================================================
    // Analyze Source
    //===========================================================

    analyzeSource(
        submenuId: number
    ): Observable<PageCloningSourceAnalysis> {
        this.validateId(submenuId);

        return this.http.get<PageCloningSourceAnalysis>(
            `${this.apiUrl}/analyze-source/${submenuId}`
        );
    }


    //===========================================================
    // Analyze Target
    //===========================================================

    analyzeTarget(
        submenuId: number
    ): Observable<PageCloningSourceAnalysis> {
        this.validateId(submenuId);

        return this.http.get<PageCloningSourceAnalysis>(
            `${this.apiUrl}/analyze-target/${submenuId}`
        );
    }


    //===========================================================
    // Create
    //===========================================================

    create(pageCloning: PageCloning): Observable<number> {
        this.validatePageCloning(pageCloning);

        return this.http.post<number>(
            this.apiUrl,
            pageCloning
        );
    }


    //===========================================================
    // Update
    //===========================================================

    update(pageCloning: PageCloning): Observable<void> {
        this.validatePageCloning(pageCloning);
        this.validateId(pageCloning.id);

        return this.http.put<void>(
            `${this.apiUrl}/${pageCloning.id}`,
            pageCloning
        );
    }


    //===========================================================
    // Build Clone Request
    //===========================================================

    private buildCloneRequest(
        pageCloning: PageCloning,
        transformation?: PageCloningTransformation
    ): PageCloningCloneRequest {

        const cloneFromId =
            transformation?.sourceSubmenuId ??
            pageCloning.cloneFromId;

        const cloneToId =
            transformation?.targetSubmenuId ??
            pageCloning.cloneToId;

        this.validateId(cloneFromId);
        this.validateId(cloneToId);

        if (cloneFromId === cloneToId) {
            throw new Error(
                'Source and target submenus must be different.'
            );
        }

        if (
            cloneFromId !== pageCloning.cloneFromId ||
            cloneToId !== pageCloning.cloneToId
        ) {
            throw new Error(
                'Transformation source and target must match the saved configuration.'
            );
        }

        const modelFields: PageCloningModelField[] =
            transformation?.modelFields ?? [];

        this.validateModelFields(modelFields);

        return {
            cloneFromId,
            cloneToId,

            renameIdentifiers:
                transformation?.renameIdentifiers ?? true,

            updateRoutes:
                transformation?.updateRoutes ?? true,

            updateApiReferences:
                transformation?.updateApiReferences ?? true,

            updateModelReferences:
                transformation?.updateModelReferences ?? true,

            preserveTargetFilePaths:
                transformation?.preserveTargetFilePaths ?? true,

            modelFields: [...modelFields]
        };
    }


    //===========================================================
    // Save Transformation Configuration
    //===========================================================

    saveTransformation(
        id: number,
        transformation: PageCloningTransformation
    ): Observable<void> {
        this.validateId(id);

        if (!transformation) {
            return throwError(
                () => new Error(
                    'Transformation configuration is required.'
                )
            );
        }

        return throwError(
            () => new Error(
                'Saving transformation separately is not supported by the current backend. ' +
                'Pass the transformation directly to clone() or generate().'
            )
        );
    }


    //===========================================================
    // Clone
    //===========================================================

    clone(
        id: number,
        pageCloning?: PageCloning,
        transformation?: PageCloningTransformation
    ): Observable<PageCloningGenerateResult> {
        this.validateId(id);

        if (!pageCloning) {
            return this.http.post<{
                id?: number;
                Id?: number;
                status?: string;
                Status?: string;
                message?: string;
                Message?: string;
            } | null>(
                `${this.apiUrl}/${id}/clone`,
                null
            ).pipe(
                map(result => ({
                    id: result?.id ?? result?.Id ?? id,
                    status:
                        result?.status ??
                        result?.Status ??
                        'Unknown',
                    message:
                        result?.message ??
                        result?.Message ??
                        'The backend returned a clone response.'
                }))
            );
        }

        const request =
            this.buildCloneRequest(
                pageCloning,
                transformation
            );

        return this.http.post<{
            id?: number;
            Id?: number;
            status?: string;
            Status?: string;
            message?: string;
            Message?: string;
        }>(
            `${this.apiUrl}/${id}/clone`,
            request
        ).pipe(
            map(result => ({
                id: result.id ?? result.Id ?? id,
                status:
                    result.status ??
                    result.Status ??
                    'Unknown',
                message:
                    result.message ??
                    result.Message ??
                    'The backend returned a clone response.'
            }))
        );
    }


    //===========================================================
    // Generate
    // Save Configuration, Then Clone
    //===========================================================

    generate(
        pageCloning: PageCloning,
        transformation?: PageCloningTransformation
    ): Observable<PageCloningGenerateResult> {
        this.validatePageCloning(pageCloning);

        const saveConfiguration$ =
            !pageCloning.id || pageCloning.id <= 0
                ? this.create(pageCloning)
                : this.update(pageCloning).pipe(
                    map(() => pageCloning.id)
                );

        return saveConfiguration$.pipe(
            switchMap(id =>
                this.clone(
                    id,
                    pageCloning,
                    transformation
                )
            )
        );
    }


    //===========================================================
    // Generate CRUD Package
    //===========================================================

    generatePackage(id: number): Observable<void> {
        this.validateId(id);

        return this.http.post<void>(
            `${this.apiUrl}/${id}/generate`,
            {}
        );
    }


    //===========================================================
    // Restore Generated Package
    //===========================================================

    restorePackage(id: number): Observable<void> {
        this.validateId(id);

        return this.http.post<void>(
            `${this.apiUrl}/${id}/restore-package`,
            {}
        );
    }


    //===========================================================
    // Delete
    //===========================================================

    delete(id: number): Observable<void> {
        this.validateId(id);

        return this.http.delete<void>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Restore Deleted Records
    //===========================================================

    restore(): Observable<void> {
        return this.http.put<void>(
            `${this.apiUrl}/restore`,
            {}
        );
    }


    //===========================================================
    // Validate Page Cloning
    //===========================================================

    private validatePageCloning(
        pageCloning: PageCloning
    ): void {
        if (!pageCloning) {
            throw new Error(
                'Page Cloning configuration is required.'
            );
        }

        this.validateId(pageCloning.cloneFromId);
        this.validateId(pageCloning.cloneToId);

        if (
            pageCloning.cloneFromId ===
            pageCloning.cloneToId
        ) {
            throw new Error(
                'Source and target pages must be different.'
            );
        }
    }


    //===========================================================
    // Validate Model Fields
    //===========================================================

    private validateModelFields(
        modelFields: PageCloningModelField[]
    ): void {
        if (!Array.isArray(modelFields)) {
            throw new Error(
                'Model field configuration must be an array.'
            );
        }

        const allowedOperations =
            new Set([
                'Keep',
                'Modify',
                'Add',
                'Exclude'
            ]);

        const sourceKeys = new Set<string>();
        const outputNames = new Set<string>();

        for (const field of modelFields) {
            if (!field) {
                throw new Error(
                    'Model field configuration contains an empty entry.'
                );
            }

            const operation =
                String(field.operation ?? 'Keep').trim();

            if (!allowedOperations.has(operation)) {
                throw new Error(
                    `Unsupported model field operation: ${operation}`
                );
            }

            const outputName =
                String(field.name ?? '').trim();

            if (!outputName) {
                throw new Error(
                    'Every configured model field requires a name.'
                );
            }

            if (
                operation === 'Add' &&
                !String(field.type ?? '').trim()
            ) {
                throw new Error(
                    `A TypeScript type is required for added field "${outputName}".`
                );
            }

            const inputModel =
                String(field.inputModel ?? '').trim();

            const sourceField =
                String(field.sourceField ?? '').trim();

            if (
                operation !== 'Add' &&
                (!inputModel || !sourceField)
            ) {
                throw new Error(
                    `Input model and source field are required for "${outputName}".`
                );
            }

            if (operation !== 'Add') {
                const sourceKey =
                    `${inputModel.toLowerCase()}|${sourceField.toLowerCase()}`;

                if (sourceKeys.has(sourceKey)) {
                    throw new Error(
                        `Duplicate source field configuration: ${inputModel}.${sourceField}`
                    );
                }

                sourceKeys.add(sourceKey);
            }

            if (operation !== 'Exclude') {
                const normalizedOutputName =
                    outputName.toLowerCase();

                if (outputNames.has(normalizedOutputName)) {
                    throw new Error(
                        `Duplicate output field name: ${outputName}`
                    );
                }

                outputNames.add(normalizedOutputName);
            }
        }
    }


    //===========================================================
    // Validate ID
    //===========================================================

    private validateId(id: number): void {
        if (!Number.isInteger(id) || id <= 0) {
            throw new Error(
                'A valid positive ID is required.'
            );
        }
    }
}