import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { installBackdropClickGuard } from './shared/utils/backdrop-click-guard';

// A text selection dragged from a pop-up onto its backdrop no
// longer closes the pop-up (2026-11-09)
installBackdropClickGuard();

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
