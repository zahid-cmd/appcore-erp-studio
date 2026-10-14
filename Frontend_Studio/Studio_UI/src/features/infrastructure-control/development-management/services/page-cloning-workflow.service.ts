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
    moduleId?: number;
    menuId?: number;
}

export type CloneMode = 'add' | 'view' | 'edit';

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
    // add = new clone, view = read only, edit = update a saved clone
    mode: CloneMode;
    pageCloningId: number;

    // The saved blueprint of an opened record. The Clone Action page
    // applies it once, after it has read the source page, then clears it.
    blueprint: any | null;

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
            mode: 'add', pageCloningId: 0, blueprint: null,
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

    // Shown in the page header of the four pages
    get pageTitle(): string
    {
        switch (this.state.mode)
        {
            case 'view': return 'Page Cloning - View';
            case 'edit': return 'Page Cloning - Edit';
            default:     return 'Page Cloning';
        }
    }

    //===========================================================
    // Open a saved clone (from the list) in View or Edit mode.
    // Fills the whole wizard state from the saved record.
    // Returns false when the record has no usable blueprint.
    //===========================================================
    openRecord(record: any, mode: 'view' | 'edit'): Observable<boolean>
    {
        const pick = (o: any, key: string): any =>
            o?.[key] ?? o?.[key.charAt(0).toUpperCase() + key.slice(1)];

        let bp: any = null;

        try
        {
            bp = JSON.parse(String(pick(record, 'blueprintJson') ?? ''));
        }
        catch
        {
            bp = null;
        }

        if (!bp || typeof bp !== 'object')
        {
            return of(false);
        }

        return this.loadSubmenus().pipe(
            map(list =>
            {
                const fromId = Number(pick(record, 'cloneFromId')) || 0;
                const toId = Number(pick(record, 'cloneToId')) || 0;

                const from = list.find(o => o.value === fromId);
                const to = list.find(o => o.value === toId);

                this.state =
                {
                    ...this.emptyState(),

                    mode,
                    pageCloningId: Number(pick(record, 'pageCloningId')) || 0,
                    blueprint: bp,

                    cloneFromModuleId: from?.moduleId ?? 0,
                    cloneFromMenuId: from?.menuId ?? 0,
                    cloneFromId: fromId,
                    cloneFromCode: String(pick(record, 'cloneFromCode') ?? ''),
                    cloneFromName: String(pick(record, 'cloneFromName') ?? ''),

                    cloneToModuleId: to?.moduleId ?? 0,
                    cloneToMenuId: to?.menuId ?? 0,
                    cloneToId: toId,
                    cloneToCode: String(pick(record, 'cloneToCode') ?? ''),
                    cloneToName: String(pick(record, 'cloneToName') ?? ''),

                    entityName: String(pick(bp, 'entityName') ?? pick(record, 'entityName') ?? ''),
                    displayName: String(pick(bp, 'displayName') ?? '')
                };

                return true;
            })
        );
    }

    //===========================================================
    // All submenus, each with its menu and module
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
                            this.menuService.getByModule(Number(m.id)).pipe(
                                map((menus: any[]) => (menus ?? []).map(menu =>
                                    ({ moduleId: Number(m.id), menu }))),
                                catchError(() => of([] as any[])))))
                        : of([] as any[][])),
                map(groups => (groups as any[][]).flat()),
                switchMap((menus: any[]) =>
                    menus.length
                        ? forkJoin(menus.map(x =>
                            this.submenuService.getByMenu(Number(x.menu.id)).pipe(
                                map((subs: any[]) => (subs ?? []).map(s =>
                                    ({ s, moduleId: x.moduleId, menuId: Number(x.menu.id) }))),
                                catchError(() => of([] as any[])))))
                        : of([] as any[][])),
                map(groups =>
                {
                    const seen = new Set<number>();
                    const result: SubmenuOption[] = [];

                    for (const x of (groups as any[][]).flat())
                    {
                        const id = Number(x.s.id);
                        if (!id || seen.has(id)) { continue; }
                        seen.add(id);

                        const code = x.s.code ?? '';
                        const name = x.s.name ?? '';

                        result.push({
                            label: `${code} - ${name}`,
                            value: id,
                            code,
                            name,
                            moduleId: x.moduleId,
                            menuId: x.menuId
                        });
                    }

                    return result.sort((a, b) => a.label.localeCompare(b.label));
                }),
                shareReplay(1)
            );
        }

        return this.cache$;
    }
}