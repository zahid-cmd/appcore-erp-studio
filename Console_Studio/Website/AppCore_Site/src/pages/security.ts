import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SiteService } from '../core/site.service';
import { CtaBand } from '../layout/cta-band';

// Security & privacy : only what the system really does today.
// Do not add certifications, named laws or "can never be hacked"
// claims unless they are true and agreed by the owner.
@Component({
    selector: 'site-security',
    imports: [RouterLink, CtaBand],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        .top { padding: 76px 0 84px; }
        .top-in { position: relative; display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); align-items: center; gap: 48px; }
        .top h1 { margin: 16px 0 16px; color: #fff; font-size: clamp(34px, 4.6vw, 56px); font-weight: 800; letter-spacing: -0.04em; line-height: 1.05; }
        .shield { position: relative; display: flex; align-items: center; justify-content: center; justify-self: center; width: 220px; height: 220px; border: 1px solid rgba(216, 131, 74, 0.3); border-radius: 50%; background: radial-gradient(circle, rgba(216, 131, 74, 0.18), rgba(216, 131, 74, 0.02) 70%); box-shadow: 0 0 0 18px rgba(216, 131, 74, 0.04), 0 0 0 40px rgba(216, 131, 74, 0.025); }
        .shield i { color: #f0b88c; font-size: 84px; }

        .layers { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
        .layer { display: flex; flex-direction: column; gap: 12px; padding: 26px; }
        .layer h3 { color: var(--s-text); font-size: 17px; font-weight: 800; }
        .layer p { color: var(--s-muted); font-size: 14.5px; }

        .promise { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
        .pr { display: flex; gap: 14px; padding: 22px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; background: rgba(255, 255, 255, 0.03); }
        .pr > i { margin-top: 3px; color: var(--s-copper-2); font-size: 18px; }
        .pr b { display: block; color: #fff; font-size: 16px; }
        .pr span { color: var(--s-on-dark-2); font-size: 14px; }

        .honest { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 40px; align-items: start; }
        .honest p { color: var(--s-text-2); font-size: 16px; line-height: 1.8; }
        .honest p + p { margin-top: 14px; }
        .honest ul { display: flex; flex-direction: column; gap: 12px; margin: 0; padding: 0; list-style: none; }
        .honest li { display: flex; gap: 12px; padding: 16px 18px; color: var(--s-text-2); font-size: 14.5px; }
        .honest li i { margin-top: 3px; color: var(--s-copper); }

        @media (max-width: 960px) { .top-in, .honest { grid-template-columns: minmax(0, 1fr); } .shield { display: none; } .layers { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 620px) { .layers, .promise { grid-template-columns: minmax(0, 1fr); } }
    `],
    template: `
        <section class="top dark grid-lines">
            <div class="container top-in">
                <div>
                    <span class="eyebrow rise">Security & privacy</span>
                    <h1 class="rise d1">Your business data, kept apart and kept safe.</h1>
                    <p class="lead rise d2">Security is built into how AppCore is made, not added later. Here is exactly how we protect your data, and what we promise you about it.</p>
                </div>
                <div class="shield rise d2" aria-hidden="true"><i class="fas fa-shield-halved"></i></div>
            </div>
        </section>

        <section class="section">
            <div class="container">
                <div class="section-head">
                    <span class="eyebrow">Layers of protection</span>
                    <h2 class="h2">How your data is protected.</h2>
                    <p class="lead">No single lock keeps data safe. Several layers, each doing its own job, do.</p>
                </div>
                <div class="layers">
                    @for (l of layers; track l.title)
                    {
                        <div class="card layer">
                            <span class="icon-tile solid"><i [class]="l.icon"></i></span>
                            <h3>{{ l.title }}</h3>
                            <p>{{ l.text }}</p>
                        </div>
                    }
                </div>
            </div>
        </section>

        <section class="section dark grid-lines">
            <div class="container" style="position:relative">
                <div class="section-head">
                    <span class="eyebrow">Our promise</span>
                    <h2 class="h2">Your data belongs to you.</h2>
                    <p class="lead">We look after your data; we never own it.</p>
                </div>
                <div class="promise">
                    @for (p of promises; track p.title)
                    {
                        <div class="pr"><i [class]="p.icon"></i><div><b>{{ p.title }}</b><span>{{ p.text }}</span></div></div>
                    }
                </div>
            </div>
        </section>

        <section class="section">
            <div class="container honest">
                <div>
                    <span class="eyebrow">Straight talk</span>
                    <h2 class="h2" style="margin:12px 0 18px">Why we don't promise "unhackable".</h2>
                    <p>No honest software company can promise that nothing will ever go wrong, and you should be careful of anyone who does. What we can promise is that we take every reasonable step to keep your data safe, keep improving those steps, and tell you straight away if something ever affects you.</p>
                    <p>We handle your data under a written agreement and the data-protection laws that apply to you. Questions about security? <a routerLink="/contact">Talk to us</a> : we are happy to go through it in detail before you decide.</p>
                </div>
                <ul>
                    <li class="card"><i class="fas fa-circle-check"></i>Separate database for every client</li>
                    <li class="card"><i class="fas fa-circle-check"></i>Encrypted connection on every page</li>
                    <li class="card"><i class="fas fa-circle-check"></i>Passwords stored only as one-way hashes</li>
                    <li class="card"><i class="fas fa-circle-check"></i>Login lock after repeated wrong passwords</li>
                    <li class="card"><i class="fas fa-circle-check"></i>Roles and a full activity history</li>
                    <li class="card"><i class="fas fa-circle-check"></i>Backed up every night</li>
                </ul>
            </div>
        </section>

        <site-cta />
    `
})
export class SecurityPage
{
    readonly site = inject(SiteService);

    readonly layers =
    [
        { icon: 'fas fa-database', title: 'A database of your own', text: 'Every client gets a separate database. Your records are never stored in the same place as another company\'s, and a login for one company does not work for another.' },
        { icon: 'fas fa-lock', title: 'Encrypted on the way', text: 'Every page, every report and every file travels over an encrypted HTTPS connection, so nobody in between can read it.' },
        { icon: 'fas fa-server', title: 'No open doors on our servers', text: 'Our servers are reached only through a secure, encrypted tunnel. They have no ports open to the internet for anyone to knock on.' },
        { icon: 'fas fa-key', title: 'Passwords nobody can read', text: 'Passwords are never stored. We keep only a salted one-way hash, so not even our own staff can see your password.' },
        { icon: 'fas fa-user-lock', title: 'Locked against guessing', text: 'After repeated wrong passwords the login is locked for a while, which stops automated password guessing.' },
        { icon: 'fas fa-user-shield', title: 'Each person sees only their work', text: 'You decide who sees and does what. Approvals and a full history show who changed what, and when.' },
        { icon: 'fas fa-clock-rotate-left', title: 'Backed up every night', text: 'Your database is backed up automatically every night, so it can be restored if anything ever goes wrong.' },
        { icon: 'fas fa-rotate', title: 'Kept up to date', text: 'Security fixes and improvements reach your address with every update, without you installing anything.' }
    ];

    readonly promises =
    [
        { icon: 'fas fa-ban', title: 'Never sold, never shared', text: 'We do not sell, rent or share your data with anyone, and we do not use it for advertising.' },
        { icon: 'fas fa-file-export', title: 'Take it with you', text: 'You can ask for a full copy of your data at any time.' },
        { icon: 'fas fa-trash-can', title: 'Deleted when you leave', text: 'If you stop using AppCore, we delete your data after handing you your copy.' },
        { icon: 'fas fa-bell', title: 'Told straight away', text: 'If anything ever affects your data, we tell you promptly and openly.' }
    ];
}
