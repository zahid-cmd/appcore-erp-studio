//===============================================================
// Imports
//===============================================================

import
{
    Component
}
from '@angular/core';


//===============================================================
// Login Page 1 Background
//===============================================================

import
{
    LoginPageBackgroundComponent
}
from '../../components/login-page-1/background/background';


//===============================================================
// Login Page 1 Branding
//===============================================================

import
{
    LoginPageBrandingComponent
}
from '../../components/login-page-1/branding/branding';


//===============================================================
// Login Page 1 Promotional Panel
//===============================================================

import
{
    LoginPagePromotionalPanelComponent
}
from '../../components/login-page-1/promotional-panel/promotional-panel';


//===============================================================
// Login Page 1 Login Panel
//===============================================================

import
{
    LoginPageLoginPanelComponent
}
from '../../components/login-page-1/login-panel/login-panel';


//===============================================================
// Login Page 1 Powered By
//===============================================================

import
{
    LoginPagePoweredByComponent
}
from '../../components/login-page-1/powered-by/powered-by';


//===============================================================
// Login Page 1
//===============================================================

@Component
({
    selector:
        'app-login-page-1',

    standalone:
        true,

    imports:
    [
        LoginPageBackgroundComponent,

        LoginPageBrandingComponent,

        LoginPagePromotionalPanelComponent,

        LoginPageLoginPanelComponent,

        LoginPagePoweredByComponent
    ],

    templateUrl:
        './login-page-1.html',

    styleUrls:
    [
        './login-page-1.css'
    ]
})


//===============================================================
// Login Page 1 Component
//===============================================================

export class LoginPage1
{
}