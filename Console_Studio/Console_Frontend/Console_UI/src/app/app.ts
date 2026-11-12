import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ThemeService } from '../ui/theme.service';

@Component({
    selector: 'ac-root',
    imports: [RouterOutlet],
    template: '<router-outlet />'
})
export class App
{
    // applies the saved light / dark theme on start
    private readonly theme = inject(ThemeService);
}
