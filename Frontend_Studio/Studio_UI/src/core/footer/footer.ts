import { Component } from '@angular/core';

import { FooterVersionComponent } from '../../shared/components/layout/footer-version/footer-version';

import { FooterBrandComponent } from '../../shared/components/layout/footer-brand/footer-brand';

@Component({
    selector: 'app-footer',
    standalone: true,
    imports: [
        FooterVersionComponent,
        FooterBrandComponent
    ],
    templateUrl: './footer.html',
    styleUrls: ['./footer.css']
})
export class FooterComponent {

}