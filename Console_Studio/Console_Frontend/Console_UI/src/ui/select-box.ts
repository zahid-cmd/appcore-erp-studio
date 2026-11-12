//===============================================================
// Select box : a styled dropdown (instead of a native <select>,
// whose list cannot be styled or height-limited). The list floats
// above everything (position: fixed), max 8 rows, AppCore scrollbar,
// a search box when the list is long.
//
//   <ac-select-box [options]="[{ value: 'A', label: 'Active' }]" [(value)]="status" />
//===============================================================

import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, model, signal, viewChild } from '@angular/core';

export interface SelectOption
{
    value: unknown;
    label: string;
    hint?: string;
    icon?: string;
}

@Component({
    selector: 'ac-select-box',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host:
    {
        '(document:mousedown)': 'outside($event)',
        '(window:resize)': 'close()',
        '(document:keydown.escape)': 'close()'
    },
    styles: [`
        :host { position: relative; display: block; min-width: 0; }
        .sb-btn { display: flex; align-items: center; gap: 9px; width: 100%; height: 38px; padding: 0 11px 0 12px; border: 1px solid var(--ac-border); border-radius: var(--ac-radius-sm); background: var(--ac-card); color: var(--ac-text); font: inherit; text-align: left; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; }
        .sb-btn:hover:not(:disabled) { border-color: var(--ac-faint); }
        .sb-btn.open, .sb-btn:focus-visible { border-color: var(--ac-accent); outline: none; box-shadow: 0 0 0 3px var(--ac-accent-ring); }
        .sb-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .sb-btn.compact { height: 32px; }
        .sb-btn > i.lead { color: var(--ac-accent); }
        .sb-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sb-text.ph { color: var(--ac-faint); }
        .sb-caret { color: var(--ac-faint); font-size: 11px; transition: transform 0.2s; }
        .open .sb-caret { transform: rotate(180deg); }
        .sb-panel { position: fixed; z-index: 400; display: flex; flex-direction: column; padding: 6px; border: 1px solid var(--ac-border); border-radius: 13px; background: var(--ac-card); box-shadow: var(--ac-shadow-lg); animation: sb-in 0.14s ease-out; }
        .sb-search { position: relative; margin-bottom: 6px; }
        .sb-search i { position: absolute; top: 50%; left: 10px; color: var(--ac-faint); font-size: 12px; transform: translateY(-50%); }
        .sb-search input { width: 100%; height: 32px; padding: 0 10px 0 30px; border: 1px solid var(--ac-border); border-radius: 9px; outline: none; background: var(--ac-card-2); color: var(--ac-text); font: inherit; }
        .sb-search input:focus { border-color: var(--ac-accent); }
        .sb-list { max-height: 296px; overflow-y: auto; }
        .sb-opt { display: flex; align-items: center; gap: 9px; width: 100%; padding: 8px 10px; border: 0; border-radius: 9px; background: transparent; color: var(--ac-text-2); font: inherit; text-align: left; cursor: pointer; }
        .sb-opt:hover { background: var(--ac-hover); color: var(--ac-text); }
        .sb-opt.on { background: var(--ac-accent-soft); color: var(--ac-accent); font-weight: 700; }
        .sb-opt .sb-check { margin-left: auto; font-size: 11px; }
        .sb-opt small { display: block; color: var(--ac-muted); font-size: 11.5px; font-weight: 500; }
        .sb-none { padding: 12px; color: var(--ac-muted); text-align: center; }
        @keyframes sb-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
    `],
    template: `
        <button #trigger type="button" class="sb-btn" [class.open]="open()" [class.compact]="compact()" [disabled]="disabled()" (click)="toggle()">
            @if (current()?.icon) { <i class="lead" [class]="'lead ' + current()!.icon"></i> }
            <span class="sb-text" [class.ph]="!current()">{{ current()?.label ?? placeholder() }}</span>
            <i class="fas fa-chevron-down sb-caret"></i>
        </button>

        @if (open())
        {
            <div #panel class="sb-panel" [style.left.px]="pos().left" [style.top.px]="pos().top" [style.bottom.px]="pos().bottom" [style.width.px]="pos().width">
                @if (options().length > 8)
                {
                    <div class="sb-search">
                        <i class="fas fa-magnifying-glass"></i>
                        <input #find placeholder="Search" [value]="query()" (input)="query.set(find.value)" />
                    </div>
                }
                <div class="sb-list ac-scroll">
                    @for (o of shown(); track $index)
                    {
                        <button type="button" class="sb-opt" [class.on]="o.value === value()" (click)="pick(o)">
                            @if (o.icon) { <i [class]="o.icon"></i> }
                            <span>{{ o.label }}@if (o.hint) { <small>{{ o.hint }}</small> }</span>
                            @if (o.value === value()) { <i class="fas fa-check sb-check"></i> }
                        </button>
                    }
                    @empty
                    {
                        <div class="sb-none">Nothing found</div>
                    }
                </div>
            </div>
        }
    `
})
export class SelectBox
{
    private readonly host = inject(ElementRef<HTMLElement>);

    readonly options = input<SelectOption[]>([]);

    readonly value = model<unknown>(null);

    readonly placeholder = input('Select');

    readonly disabled = input(false);

    readonly compact = input(false);

    // open above the box (e.g. pagination at the bottom)
    readonly up = input(false);

    readonly open = signal(false);

    readonly query = signal('');

    readonly pos = signal<{ left: number; top: number | null; bottom: number | null; width: number }>({ left: 0, top: 0, bottom: null, width: 0 });

    private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

    readonly current = computed(() => this.options().find(o => o.value === this.value()) ?? null);

    readonly shown = computed(() =>
    {
        const q = this.query().trim().toLowerCase();

        return q ? this.options().filter(o => o.label.toLowerCase().includes(q)) : this.options();
    });

    toggle(): void
    {
        if (this.open())
        {
            this.close();

            return;
        }

        const r = this.trigger()?.nativeElement.getBoundingClientRect();

        if (!r)
        {
            return;
        }

        const width = Math.max(r.width, 180);
        const left = Math.min(r.left, window.innerWidth - width - 8);
        const below = window.innerHeight - r.bottom;
        const goUp = this.up() || (below < 260 && r.top > below);

        this.pos.set(
            goUp
                ? { left, top: null, bottom: window.innerHeight - r.top + 6, width }
                : { left, top: r.bottom + 6, bottom: null, width });

        this.query.set('');
        this.open.set(true);

        // any scroll (page canvas, modal body) closes the list
        document.addEventListener('scroll', this.onScroll, true);
    }

    private readonly onScroll = (e: Event): void =>
    {
        // scrolling inside the list itself keeps it open
        if (!(e.target instanceof Node) || !this.host.nativeElement.contains(e.target))
        {
            this.close();
        }
    };

    pick(o: SelectOption): void
    {
        this.value.set(o.value);
        this.close();
    }

    close(): void
    {
        if (this.open())
        {
            this.open.set(false);
        }

        document.removeEventListener('scroll', this.onScroll, true);
    }

    outside(e: MouseEvent): void
    {
        if (this.open() && !this.host.nativeElement.contains(e.target as Node))
        {
            this.close();
        }
    }
}
