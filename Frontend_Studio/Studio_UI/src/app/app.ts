//===============================================================
// Imports
//===============================================================

import
{
    Component
}
from '@angular/core';

import
{
    RouterOutlet
}
from '@angular/router';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector: 'app-root',

    standalone: true,

    imports:
    [
        RouterOutlet
    ],

    templateUrl:
        './app.html',

    styleUrl:
        './app.css'
})

//===============================================================
// App Component
//===============================================================

export class App
{
}