//===============================================================
// Motor Power (2026-11-10) : electric motor bikes carry a MOTOR
// number, not an engine number. Every page labels the number by
// the bike : "Motor No" for electric bikes, "Engine No" for the
// rest.
//
// The electric bike ids load once per session (Settings › Motor
// Bike Power API). Pages use the service; print sources (plain
// functions) use the exported helpers, which read the same list.
//===============================================================

import
{
    Injectable,
    inject,
    signal
}
from '@angular/core';

import
{
    HttpClient
}
from '@angular/common/http';

import
{
    environment
}
from '../../environments/environment';


// The list as loaded (shared with the print helpers) : ids,
// and codes / names (UPPERCASE) for rows that carry no id
let ELECTRIC_IDS:
    Set<number> =
    new Set<number>();

let ELECTRIC_KEYS:
    Set<string> =
    new Set<string>();

let ELECTRIC_MODELS:
    Set<number> =
    new Set<number>();


// true : the bike MODEL (Bike Models id) is electric
export function isElectricModel
(
    bikeModelId:
        number | null | undefined
):
    boolean
{
    return !!bikeModelId && ELECTRIC_MODELS.has(Number(bikeModelId));
}

// The print viewer opens in its own tab : the last list is kept
// in this browser and read back there
const STORAGE_KEY =
    'appcore.electric-bikes';

try
{
    const saved =
        JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');

    if (saved && Array.isArray(saved.ids) && Array.isArray(saved.keys))
    {
        ELECTRIC_IDS = new Set<number>(saved.ids.map((x:any) => Number(x)));
        ELECTRIC_KEYS = new Set<string>(saved.keys.map((x:any) => String(x)));
        ELECTRIC_MODELS = new Set<number>((saved.models ?? []).map((x:any) => Number(x)));
    }
}
catch
{
    // no storage : the list loads with the page
}


// true : a bike known by its code or name is electric (rows with
// no product id; "Motor Bikes - " in front is ignored)
export function isElectricName
(
    codeOrName:
        string | null | undefined
):
    boolean
{
    const key =
        String(codeOrName ?? '').trim().toUpperCase();

    return !!key
        && (ELECTRIC_KEYS.has(key) || ELECTRIC_KEYS.has(key.replace(/^MOTOR BIKES - /, '')));
}


// true : the bike (product id) is electric
export function isElectricBike
(
    productId:
        number | null | undefined
):
    boolean
{
    return !!productId && ELECTRIC_IDS.has(Number(productId));
}

// 'Motor' / 'Engine'
export function bikeNoWord
(
    productId:
        number | null | undefined
):
    string
{
    return isElectricBike(productId) ? 'Motor' : 'Engine';
}

// 'Motor No' / 'Engine No'
export function bikeNoLabel
(
    productId:
        number | null | undefined
):
    string
{
    return `${bikeNoWord(productId)} No`;
}

// A heading over several bikes : 'Motor' (all electric), 'Engine'
// (none), 'Engine / Motor' (mixed)
export function bikesNoWord
(
    productIds:
        (number | null | undefined)[]
):
    string
{
    const ids =
        productIds.filter(x => !!x);

    if (ids.length === 0)
    {
        return 'Engine';
    }

    const electric =
        ids.filter(x => isElectricBike(x)).length;

    return electric === 0
        ? 'Engine'
        : electric === ids.length
            ? 'Motor'
            : 'Engine / Motor';
}


@Injectable({ providedIn:'root' })
export class MotorPowerService
{
    private readonly http =
        inject(HttpClient);

    // Read in templates : a page re-renders once the list arrives
    readonly electricIds =
        signal<Set<number>>(ELECTRIC_IDS);

    private loading =
        false;

    private loaded =
        false;

    // Called by the pages (once is enough; later calls do nothing)
    load():
        void
    {
        if (this.loaded || this.loading)
        {
            return;
        }

        this.loading =
            true;

        this.http
            .get<any[]>(`${environment.apiUrl}/settings/product-settings/motor-bike-power/electric`)
            .subscribe
            ({
                next:
                    rows =>
                    {
                        const list =
                            Array.isArray(rows) ? rows : [];

                        const pick =
                            (x:any, name:string):any =>
                                x?.[name] ?? x?.[name.charAt(0).toLowerCase() + name.slice(1)];

                        ELECTRIC_IDS =
                            new Set<number>(list.map(x => Number(pick(x, 'ProductId'))).filter(x => x > 0));

                        ELECTRIC_MODELS =
                            new Set<number>(list.map(x => Number(pick(x, 'BikeModelId'))).filter(x => x > 0));

                        ELECTRIC_KEYS =
                            new Set<string>
                            (
                                list
                                    .flatMap
                                    (
                                        x =>
                                        {
                                            const name =
                                                String(pick(x, 'ProductName') ?? '').trim().toUpperCase();

                                            return [
                                                String(pick(x, 'ProductCode') ?? '').trim().toUpperCase(),
                                                name,
                                                name.replace(/^MOTOR BIKES - /, ''),
                                                String(pick(x, 'ModelName') ?? '').trim().toUpperCase()
                                            ];
                                        }
                                    )
                                    .filter(x => !!x)
                            );

                        this.electricIds.set(ELECTRIC_IDS);

                        try
                        {
                            localStorage.setItem(STORAGE_KEY, JSON.stringify({ ids:[...ELECTRIC_IDS], keys:[...ELECTRIC_KEYS], models:[...ELECTRIC_MODELS] }));
                        }
                        catch
                        {
                            // storage blocked : prints fall back to "Engine"
                        }

                        this.loaded =
                            true;

                        this.loading =
                            false;
                    },

                error:
                    () =>
                    {
                        this.loading =
                            false;
                    }
            });
    }

    isElectric
    (
        productId:
            number | null | undefined
    ):
        boolean
    {
        return !!productId && this.electricIds().has(Number(productId));
    }

    // 'Motor' / 'Engine'
    word
    (
        productId:
            number | null | undefined
    ):
        string
    {
        return this.isElectric(productId) ? 'Motor' : 'Engine';
    }

    // A bike MODEL (Bike Models id) : 'Motor' / 'Engine'
    wordByModel
    (
        bikeModelId:
            number | null | undefined
    ):
        string
    {
        this.electricIds();

        return isElectricModel(bikeModelId) ? 'Motor' : 'Engine';
    }

    // A row with no product id : by its code / name
    wordByName
    (
        codeOrName:
            string | null | undefined
    ):
        string
    {
        this.electricIds();

        return isElectricName(codeOrName) ? 'Motor' : 'Engine';
    }

    // 'Motor No' / 'Engine No'
    label
    (
        productId:
            number | null | undefined
    ):
        string
    {
        return `${this.word(productId)} No`;
    }

    // Several bikes : 'Motor' / 'Engine' / 'Engine / Motor'
    wordFor
    (
        productIds:
            (number | null | undefined)[]
    ):
        string
    {
        this.electricIds();

        return bikesNoWord(productIds);
    }
}
