//===============================================================
// Design 2 : kit (loaded on demand by WebsiteDesignService)
// --------------------------------------------------------------
// Only fetched when Design 2 is the default design, or a staff
// preview asks for it. Its header, home page and token sheet.
//===============================================================

import
{
    WebsiteDesignKit
}
from '../../../core/website/website-design.service';

import
{
    Design2Header
}
from './design-2-header';

import
{
    Design2Home
}
from './design-2-home';

import
{
    Design2Tokens
}
from './design-2-tokens';


export const DESIGN_2:
    WebsiteDesignKit =
{
    key:'website-page-2',
    no:2,
    header:Design2Header,
    home:Design2Home,
    tokens:Design2Tokens
};
