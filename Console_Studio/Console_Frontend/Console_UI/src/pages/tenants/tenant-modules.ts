//===============================================================
// Tenant : package, modules and users (2026-11-20)
// --------------------------------------------------------------
// Choose a package (ticks its modules), then tick extras or untick
// what the client does not buy. Core modules (Security &
// Permission, Settings) are always on. Max users : empty = no
// limit. The ERP picks a change up within a minute; data of a
// module switched off is kept and comes back when it is on again.
//===============================================================

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ConsoleApi } from '../../core/console-api.service';
import { apiMessage } from '../../core/auth.interceptor';
import { TenantModules } from '../../core/models';
import { SelectBox, SelectOption } from '../../ui/select-box';
import { ToastService } from '../../ui/toast';

@Component({
    selector: 'ac-tenant-modules',
    imports: [FormsModule, SelectBox],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        :host { display: flex; flex-direction: column; }
        :host > .ac-card { flex: 1; display: flex; flex-direction: column; }
        .tm { display: flex; flex: 1; flex-direction: column; gap: 14px; padding: 14px 18px 16px; }
        .tm-row { display: grid; grid-template-columns: minmax(0, 1fr) 160px; gap: 10px; align-items: end; }
        .tm-label { display: block; margin-bottom: 6px; color: var(--ac-muted); font-size: 10.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
        .tm-desc { color: var(--ac-muted); font-size: 12.5px; }
        .tm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 6px; }
        .tm-mod { display: flex; align-items: center; gap: 8px; padding: 6px 9px; border: 1px solid var(--ac-border-2); border-radius: 9px; background: var(--ac-card-2); font-size: 12.5px; cursor: pointer; }
        .tm-mod.off { opacity: 0.55; }
        .tm-mod.extra { border-color: var(--ac-accent); }
        .tm-mod input { accent-color: var(--ac-accent); }
        .tm-mod small { margin-left: auto; color: var(--ac-muted); font-size: 11px; }
        .tm-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .tm-summary { color: var(--ac-text-2); font-size: 12.5px; }
        .tm-loading { display: flex; align-items: center; gap: 8px; padding: 14px 18px; color: var(--ac-muted); }
    `],
    template: `
        <div class="ac-card">
            <div class="ac-card-title"><i class="fas fa-cubes"></i> Package, modules and users</div>

            @if (data(); as d)
            {
                <div class="tm">
                    <div class="tm-row">
                        <div>
                            <span class="tm-label">Package</span>
                            <ac-select-box [options]="packageOptions()" [value]="pkg()" (valueChange)="choosePackage($any($event))" [disabled]="!canManage()" />
                        </div>
                        <div>
                            <span class="tm-label">Users allowed</span>
                            <input class="ac-input" type="number" min="1" placeholder="No limit" [disabled]="!canManage()"
                                   [ngModel]="maxUsers()" (ngModelChange)="maxUsers.set($event === '' || $event == null ? null : +$event); dirty.set(true)">
                        </div>
                    </div>

                    @if (packageDesc()) { <div class="tm-desc">{{ packageDesc() }}</div> }

                    <div>
                        <span class="tm-label">Modules</span>
                        <div class="tm-grid">
                            @for (m of d.Modules; track m.ModuleCode)
                            {
                                <label class="tm-mod" [class.off]="!on().has(m.ModuleCode)" [class.extra]="isExtra(m.ModuleCode)">
                                    <input type="checkbox" [checked]="on().has(m.ModuleCode)" [disabled]="m.IsCore || !canManage()" (change)="toggle(m.ModuleCode)">
                                    <span>{{ m.ModuleName }}</span>
                                    @if (m.IsCore) { <small>always</small> }
                                    @else if (isExtra(m.ModuleCode)) { <small>extra</small> }
                                    @else if (isRemoved(m.ModuleCode)) { <small>removed</small> }
                                </label>
                            }
                        </div>
                    </div>

                    <div class="tm-foot">
                        <span class="tm-summary">{{ on().size }} of {{ d.Modules.length }} modules on · {{ maxUsers() ? maxUsers() + ' users' : 'no user limit' }}</span>
                        @if (canManage())
                        {
                            <button class="ac-btn ac-btn-primary" type="button" [disabled]="saving() || !dirty()" (click)="save()">
                                <i [class]="saving() ? 'fas fa-spinner fa-spin' : 'fas fa-floppy-disk'"></i> Save
                            </button>
                        }
                    </div>

                    @if (askAllOff()) { <div class="ac-error">No optional module is ticked : this switches every optional module off for the client. Press Save again to confirm.</div> }
                    @if (error()) { <div class="ac-error">{{ error() }}</div> }
                </div>
            }
            @else if (error())
            {
                <div class="tm"><div class="ac-error">{{ error() }}</div></div>
            }
            @else
            {
                <div class="tm-loading"><i class="fas fa-spinner fa-spin"></i> Loading modules...</div>
            }
        </div>
    `
})
export class TenantModulesCard implements OnInit
{
    private readonly api = inject(ConsoleApi);
    private readonly toast = inject(ToastService);

    readonly publicId = input.required<string>();
    readonly canManage = input(false);

    readonly data = signal<TenantModules | null>(null);
    readonly pkg = signal<string>('');
    readonly on = signal<Set<string>>(new Set());
    readonly maxUsers = signal<number | null>(null);
    readonly dirty = signal(false);
    readonly saving = signal(false);
    readonly error = signal('');

    // Save was pressed with no optional module ticked : the next
    // Save confirms it (2026-11-20, review B4)
    readonly askAllOff = signal(false);

    readonly packageOptions = computed<SelectOption[]>(() =>
    [
        { value: '', label: 'No package (tick modules)' },
        ...(this.data()?.Packages ?? []).map(p => ({ value: p.PackageCode, label: p.PackageName }))
    ]);

    private readonly packageModules = computed(() =>
        new Set((this.data()?.Packages ?? []).find(p => p.PackageCode === this.pkg())?.Modules ?? []));

    readonly packageDesc = computed(() =>
        (this.data()?.Packages ?? []).find(p => p.PackageCode === this.pkg())?.Description ?? '');

    ngOnInit(): void
    {
        void this.load();
    }

    async load(): Promise<void>
    {
        this.error.set('');

        try
        {
            const d = await this.api.tenantModules(this.publicId());

            this.data.set(d);
            this.pkg.set(d.PackageCode ?? '');
            this.on.set(new Set(d.Modules.filter(m => m.Enabled).map(m => m.ModuleCode)));
            this.maxUsers.set(d.MaxUsers);
            this.dirty.set(false);
            this.askAllOff.set(false);
        }
        catch (e)
        {
            this.error.set(apiMessage(e));
        }
    }

    // a package ticks exactly its modules (core stay on)
    choosePackage(code: string): void
    {
        this.pkg.set(code ?? '');
        this.askAllOff.set(false);

        const d = this.data();

        if (d && code)
        {
            const modules = this.packageModules();

            this.on.set(new Set(d.Modules.filter(m => m.IsCore || modules.has(m.ModuleCode)).map(m => m.ModuleCode)));
        }

        this.dirty.set(true);
    }

    toggle(code: string): void
    {
        const next = new Set(this.on());

        if (next.has(code)) { next.delete(code); } else { next.add(code); }

        this.on.set(next);
        this.dirty.set(true);
        this.askAllOff.set(false);
    }

    // no optional module is ticked (there are some to tick)
    private allOff(): boolean
    {
        const optional = (this.data()?.Modules ?? []).filter(m => !m.IsCore);

        return optional.length > 0 && optional.every(m => !this.on().has(m.ModuleCode));
    }

    isExtra(code: string): boolean
    {
        return !!this.pkg() && this.on().has(code) && !this.packageModules().has(code) && !this.isCore(code);
    }

    isRemoved(code: string): boolean
    {
        return !!this.pkg() && !this.on().has(code) && this.packageModules().has(code);
    }

    private isCore(code: string): boolean
    {
        return !!this.data()?.Modules.find(m => m.ModuleCode === code)?.IsCore;
    }

    async save(): Promise<void>
    {
        const users = this.maxUsers();

        if (users != null && (!Number.isInteger(users) || users < 1))
        {
            this.error.set('Users allowed : 1 or more, or leave it empty for no limit.');
            return;
        }

        // everything off : asked once, the next Save confirms
        const allOff = this.allOff();

        if (allOff && !this.askAllOff())
        {
            this.error.set('');
            this.askAllOff.set(true);
            return;
        }

        this.saving.set(true);
        this.error.set('');

        try
        {
            const r = await this.api.saveTenantModules(this.publicId(),
            {
                PackageCode: this.pkg() || null,
                EnabledModules: [...this.on()],
                MaxUsers: users,
                ConfirmAllOff: allOff
            });

            this.toast.success('Modules saved', r?.Message ?? 'Saved.');

            await this.load();
        }
        catch (e)
        {
            this.error.set(apiMessage(e));
        }
        finally
        {
            this.saving.set(false);
        }
    }
}
