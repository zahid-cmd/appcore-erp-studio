//===============================================================
// Toasts : ToastService.success / error / info, shown bottom-right
//===============================================================

import { ChangeDetectionStrategy, Component, Injectable, inject, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast
{
    id: number;
    kind: ToastKind;
    title: string;
    text: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService
{
    readonly items = signal<Toast[]>([]);

    private next = 1;

    success(title: string, text = ''): void
    {
        this.push('success', title, text);
    }

    error(title: string, text = ''): void
    {
        this.push('error', title, text, 7000);
    }

    info(title: string, text = ''): void
    {
        this.push('info', title, text);
    }

    dismiss(id: number): void
    {
        this.items.update(list => list.filter(x => x.id !== id));
    }

    private push(kind: ToastKind, title: string, text: string, ms = 4000): void
    {
        const id = this.next++;

        this.items.update(list => [...list.slice(-3), { id, kind, title, text }]);

        setTimeout(() => this.dismiss(id), ms);
    }
}

@Component({
    selector: 'ac-toasts',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        :host { position: fixed; right: 20px; bottom: 52px; z-index: 300; display: flex; flex-direction: column; gap: 10px; width: min(360px, calc(100vw - 40px)); }
        .tt { position: relative; display: flex; gap: 12px; padding: 13px 14px 13px 16px; border: 1px solid var(--ac-border); border-radius: 14px; background: var(--ac-card); box-shadow: var(--ac-shadow-lg); overflow: hidden; animation: tt-in 0.25s cubic-bezier(0.2, 0.8, 0.2, 1); }
        .tt::before { position: absolute; top: 0; bottom: 0; left: 0; width: 3px; background: var(--c); content: ''; }
        .tt > i { margin-top: 1px; color: var(--c); font-size: 16px; }
        .tt-body { display: flex; flex: 1; flex-direction: column; gap: 2px; min-width: 0; }
        .tt-body b { font-size: 13px; }
        .tt-body span { color: var(--ac-muted); font-size: 12.5px; overflow-wrap: anywhere; }
        .tt button { align-self: flex-start; border: 0; background: none; color: var(--ac-faint); cursor: pointer; }
        .success { --c: var(--ac-green); }
        .error { --c: var(--ac-red); }
        .info { --c: var(--ac-accent); }
        @keyframes tt-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    `],
    template: `
        @for (t of toast.items(); track t.id)
        {
            <div class="tt" [class]="'tt ' + t.kind" role="status">
                <i class="fas" [class.fa-circle-check]="t.kind === 'success'" [class.fa-circle-exclamation]="t.kind === 'error'" [class.fa-circle-info]="t.kind === 'info'"></i>
                <div class="tt-body">
                    <b>{{ t.title }}</b>
                    @if (t.text) { <span>{{ t.text }}</span> }
                </div>
                <button type="button" aria-label="Close" (click)="toast.dismiss(t.id)"><i class="fas fa-xmark"></i></button>
            </div>
        }
    `
})
export class ToastHost
{
    readonly toast = inject(ToastService);
}
