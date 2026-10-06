import { Component, EventEmitter, Output } from '@angular/core';

@Component({
    selector: 'app-footer-brand',
    standalone: true,
    imports: [],
    templateUrl: './footer-brand.html',
    styleUrls: ['./footer-brand.css']
})
export class FooterBrandComponent {

    @Output()
    aboutClick =
        new EventEmitter<void>();

    openAbout(): void {

        this.aboutClick.emit();

    }

}