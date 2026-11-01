//===============================================================
// Footer Brand : About button + logo
//===============================================================

import
{
    Component,
    EventEmitter,
    Output,
    computed,
    inject
}
from '@angular/core';

import
{
    ShellService
}
from '../../../../core/shell/shell.service';


@Component(
{
    selector:
        'app-footer-brand',

    standalone:
        true,

    imports:
    [
    ],

    templateUrl:
        './footer-brand.html',

    styleUrls:
    [
        './footer-brand.css'
    ]
})
export class FooterBrandComponent
{

    @Output()
    aboutClick =
        new EventEmitter<void>();


    private readonly shellService =
        inject(ShellService);


    // Light footer: the logo made for light backgrounds.
    readonly logoSrc =
        computed(
            () =>
                this.shellService.appearance() === 'light'
                ? 'assets/logo-light.png'
                : 'assets/logo-dark.png'
        );


    openAbout():
        void
    {
        this.aboutClick.emit();
    }

}