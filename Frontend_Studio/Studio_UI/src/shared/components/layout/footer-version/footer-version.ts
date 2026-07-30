import { Component } from '@angular/core';

@Component({
    selector: 'app-footer-version',
    standalone: true,
    templateUrl: './footer-version.html',
    styleUrl: './footer-version.css'
})
export class FooterVersionComponent {

    version = 'Version 1.0.0';

}