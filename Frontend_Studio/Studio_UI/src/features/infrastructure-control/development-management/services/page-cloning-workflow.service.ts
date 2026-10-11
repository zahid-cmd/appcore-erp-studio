import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';

import { ModuleService } from '../../navigation-management/services/module.service';
import { NavigationMenuService } from '../../navigation-management/services/menu.service';
import { NavigationSubmenuService } from '../../navigation-management/services/submenu.service';

//===============================================================
// Types
//===============================================================
export interface SubmenuOption
{
    label: string;
    value: number;
    code: string;
    name: string;
}

export interface CloneWorkflowState
{
    cloneFromModuleId: number;
    cloneFromMenuId: number;
    cloneFromId: number;
    cloneFromCode: string;
    cloneFromName: string;

    cloneToModuleId: number;
    cloneToMenuId: number;
    cloneToId: number;
    cloneToCode: string;
    cloneToName: string;

    entityName: string;
    displayName: string;
}

//===============================================================
// The 15 files every page is made of
//===============================================================
export const CLONE_FILE_KINDS: { group: string; label: string; pattern: string }[] =
[
    { group: 'Backend',  label: 'Entity',               pattern: '{E}.cs' },
    { group: 'Backend',  label: 'Configuration',        pattern: '{E}Configuration.cs' },
    { group: 'Backend',  label: 'Repository',           pattern: '{E}Repository.cs' },
    { group: 'Backend',  label: 'Repository Interface', pattern: 'I{E}Repository.cs' },
    { group: 'Backend',  label: 'DTO',                  pattern: '{E}Dto.cs' },
    { group: 'Backend',  label: 'Create DTO',           pattern: 'Create{E}Dto.cs' },
    { group: 'Backend',  label: 'Update DTO',           pattern: 'Update{E}Dto.cs' },
    { group: 'Backend',  label: 'Defaults DTO',         pattern: '{E}DefaultsDto.cs' },
    { group: 'Backend',  label: 'Controller',           pattern: '{E}Controller.cs' },
    { group: 'Frontend', label: 'Model',                pattern: '{K}.model.ts' },
    { group: 'Frontend', label: 'Service',              pattern: '{K}.service.ts' },
    { group: 'Frontend', label: 'Form (ts)',            pattern: '{K}-form.ts' },
    { group: 'Frontend', label: 'Form (html)',          pattern: '{K}-form.html' },
    { group: 'Frontend', label: 'List (ts)',            pattern: '{K}-list.ts' },
    { group: 'Frontend', label: 'List (html)',          pattern: '{K}-list.html' }
];

//===============================================================
// Service
//===============================================================
@Injectable({ providedIn: 'root' })
export class PageCloningWorkflowService
{
    private readonly moduleService = inject(ModuleService);
    private readonly menuService = inject(NavigationMenuService);
    private readonly submenuService = inject(NavigationSubmenuService);

    //===========================================================
    // Choices made on the three pages
    //===========================================================
    state: CloneWorkflowState = this.emptyState();

    emptyState(): CloneWorkflowState
    {
        return {
            cloneFromModuleId: 0, cloneFromMenuId: 0,
            cloneFromId: 0, cloneFromCode: '', cloneFromName: '',
            cloneToModuleId: 0, cloneToMenuId: 0,
            cloneToId: 0, cloneToCode: '', cloneToName: '',
            entityName: '', displayName: ''
        };
    }

    reset(): void
    {
        this.state = this.emptyState();
    }

    //===========================================================
    // Every submenu in the system (module -> menu -> submenu), loaded once
    //===========================================================
    private cache$?: Observable<SubmenuOption[]>;

    loadSubmenus(): Observable<SubmenuOption[]>
    {
        if (!this.cache$)
        {
            this.cache$ = this.moduleService.getAll().pipe(
                switchMap((modules: any[]) =>
                    modules?.length
                        ? forkJoin(modules.map(m =>
                            this.menuService.getByModule(Number(m.id))
                                .pipe(catchError(() => of([] as any[])))))
                        : of([] as any[][])),
                map(groups => (groups as any[][]).flat()),
                switchMap((menus: any[]) =>
                    menus.length
                        ? forkJoin(menus.map(m =>
                            this.submenuService.getByMenu(Number(m.id))
                                .pipe(catchError(() => of([] as any[])))))
                        : of([] as any[][])),
                map(groups =>
                {
                    const seen = new Set<number>();
                    const result: SubmenuOption[] = [];

                    for (const s of (groups as any[][]).flat())
                    {
                        const id = Number(s.id);
                        if (!id || seen.has(id)) { continue; }
                        seen.add(id);

                        const code = s.code ?? '';
                        const name = s.name ?? '';
                        result.push({ label: `${code} - ${name}`, value: id, code, name });
                    }

                    return result.sort((a, b) => a.label.localeCompare(b.label));
                }),
                shareReplay(1)
            );
        }

        return this.cache$;
    }
}