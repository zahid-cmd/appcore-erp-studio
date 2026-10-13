import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';

import { ModuleService } from '../../navigation-management/services/module.service';
import { NavigationMenuService } from '../../navigation-management/services/menu.service';
import { NavigationSubmenuService } from '../../navigation-management/services/submenu.service';

export interface SubmenuOption
{
    label: string;
    value: number;
    code: string;
    name: string;
}

export type FieldAction = 'Keep' | 'Modify' | 'Add' | 'Exclude';
export type ParentMode = 'Keep' | 'Change' | 'Exclude';

// How the field is shown on the generated form
export type ControlType =
    'Textbox' | 'Textarea' | 'Number' | 'Date' |
    'YesNo' | 'Status' | 'Checkbox' | 'Dropdown' | 'SearchDropdown';

export interface CloneFieldRow
{
    sourceName: string;
    action: FieldAction;
    name: string;
    type: string;
    maxLength: number | null;
    required: boolean;
    unique: boolean;
    control: ControlType;
    defaultValue: string;

    // original source values (used by Keep and Reset)
    srcType: string;
    srcMaxLength: number | null;
    srcRequired: boolean;
    srcUnique: boolean;
    srcControl: ControlType;
    srcDefault: string;
}

export interface CodeSegmentSetup
{
    name: string;
    pad: number;
}

export interface CloneSetup
{
    parentMode: ParentMode;
    parentEntity: string;
    parentFk: string;
    cascade: string[];

    codeEnabled: boolean;
    codePrefix: string;
    codeSegments: CodeSegmentSetup[];
    codeSequencePad: number;

    softDelete: boolean;
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

    fields: CloneFieldRow[];
    fieldsForSourceId: number;
    setup: CloneSetup;
    setupForSourceId: number;
}

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

@Injectable({ providedIn: 'root' })
export class PageCloningWorkflowService
{
    private readonly moduleService = inject(ModuleService);
    private readonly menuService = inject(NavigationMenuService);
    private readonly submenuService = inject(NavigationSubmenuService);

    state: CloneWorkflowState = this.emptyState();

    emptySetup(): CloneSetup
    {
        return {
            parentMode: 'Exclude', parentEntity: '', parentFk: '', cascade: [],
            codeEnabled: false, codePrefix: '', codeSegments: [], codeSequencePad: 4,
            softDelete: true
        };
    }

    emptyState(): CloneWorkflowState
    {
        return {
            cloneFromModuleId: 0, cloneFromMenuId: 0,
            cloneFromId: 0, cloneFromCode: '', cloneFromName: '',
            cloneToModuleId: 0, cloneToMenuId: 0,
            cloneToId: 0, cloneToCode: '', cloneToName: '',
            entityName: '', displayName: '',
            fields: [], fieldsForSourceId: 0,
            setup: this.emptySetup(), setupForSourceId: 0
        };
    }

    reset(): void
    {
        this.state = this.emptyState();
    }

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