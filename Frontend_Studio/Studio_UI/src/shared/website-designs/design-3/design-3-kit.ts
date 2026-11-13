//===============================================================
// Design 3 : kit (loaded on demand by WebsiteDesignService)
// --------------------------------------------------------------
// Only fetched when Design 3 is the default design, or a staff
// preview asks for it. Its header, home page and token sheet.
//===============================================================

import
{
    WebsiteDesignKit
}
from '../../../core/website/website-design.service';

import
{
    Design3Header
}
from './design-3-header';

import
{
    Design3Home
}
from './design-3-home';

import
{
    Design3Tokens
}
from './design-3-tokens';


export const DESIGN_3:
    WebsiteDesignKit =
{
    key:'website-page-3',
    no:3,
    header:Design3Header,
    home:Design3Home,
    tokens:Design3Tokens
};
