/* ============================================================
   Location
   (area / thana / upazila used on customer addresses)
============================================================ */

export interface Location
{
    LocationId:
        number;

    // LOC-0001 (central code generator)
    LocationCode:
        string;

    // Typed, unique within its district
    LocationName:
        string;

    // "<Location Name>, <District>" e.g. "Mirpur, Dhaka"
    DisplayName:
        string;

    //===========================================================
    // Geography (fixed lists)
    //===========================================================

    Division:
        string;

    District:
        string;

    // Optional, 4 digits
    PostalCode:
        string;

    Remarks:
        string;

    IsActive:
        boolean;
}


/* ============================================================
   Create / Update Location
============================================================ */

export interface CreateLocation
{
    LocationCode:
        string;

    LocationName:
        string;

    DisplayName:
        string;

    Division:
        string;

    District:
        string;

    PostalCode:
        string;

    Remarks:
        string;

    IsActive:
        boolean;
}


export interface UpdateLocation
extends CreateLocation
{
    LocationId:
        number;
}


/* ============================================================
   Division with its districts (fixed list from the server)
============================================================ */

export interface LocationDivisionOption
{
    Division:
        string;

    Districts:
        string[];
}


/* ============================================================
   Locations Defaults
============================================================ */

export interface LocationsDefaults
{
    NextLocationCode:
        string;

    Divisions:
        LocationDivisionOption[];
}