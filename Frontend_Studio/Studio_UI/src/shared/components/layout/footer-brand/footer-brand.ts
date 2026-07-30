import { Component } from '@angular/core';

import { AboutAppCoreComponent } from '../../utilities/about-appcore/about-appcore';

@Component({
    selector: 'app-footer-brand',
    standalone: true,
    imports: [
        AboutAppCoreComponent
    ],
    templateUrl: './footer-brand.html',
    styleUrls: ['./footer-brand.css']
})
export class FooterBrandComponent {

    showAbout = false;

    openAbout(): void {

        this.showAbout = true;

    }

    closeAbout(): void {

        this.showAbout = false;

    }

}