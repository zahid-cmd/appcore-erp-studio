import {
    Component,
    EventEmitter,
    Input,
    Output
} from '@angular/core';

import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-about-appcore',
    standalone: true,
    imports: [
        CommonModule
    ],
    templateUrl: './about-appcore.html',
    styleUrls: ['./about-appcore.css']
})
export class AboutAppCoreComponent {

    @Input()
    visible = false;

    @Output()
    close = new EventEmitter<void>();

    closeDialog(): void {

        this.close.emit();

    }

}