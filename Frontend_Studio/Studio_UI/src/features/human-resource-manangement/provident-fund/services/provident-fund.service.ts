//===============================================================
// Imports
//===============================================================

import
{
    Injectable,
    inject
}
from '@angular/core';

import
{
    HttpClient
}
from '@angular/common/http';

import
{
    Observable,
    map
}
from 'rxjs';

import
{
    environment
}
from '../../../../environments/environment';

import
{
    PfDefaults,
    PfInterestHome,
    PfInterestRun,
    PfInterestYear,
    PfLoan,
    PfMember,
    PfPolicy,
    PfRegisterRow,
    PfSettlement,
    PfStatementRow,
    emptyPfPolicy
}
from '../models/provident-fund.model';


//===============================================================
// The API sends camelCase or PascalCase : every key goes to
// PascalCase (the models). null : '' for text is left to the
// pages (they read with ?? where it matters).
//===============================================================

function pascal(value: any): any
{
    if (Array.isArray(value))
    {
        return value.map(pascal);
    }

    if (value && typeof value === 'object')
    {
        const result:
            Record<string, any> = {};

        for (const key of Object.keys(value))
        {
            result[key.charAt(0).toUpperCase() + key.slice(1)] = pascal(value[key]);
        }

        return result;
    }

    return value ?? '';
}

function defaults(x: any): PfDefaults
{
    const d = pascal(x ?? {});

    return {
        NextCode:d.NextCode ?? '',
        Policy:{ ...emptyPfPolicy(), ...(d.Policy ?? {}) },
        Employees:d.Employees ?? [],
        Members:d.Members ?? [],
        Reasons:d.Reasons ?? []
    };
}


//===============================================================
// Provident Fund Service :
// api/human-resource-manangement/provident-fund/...
//===============================================================

// A new row has no PublicId yet : '' cannot be read as a Guid
// by the server (the save then failed with a 400 and no
// message), so send the empty Guid instead (2026-11-14)
const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

function withId<T extends { PublicId?: string }>(row: T): T
{
    return { ...row, PublicId:row.PublicId || EMPTY_GUID };
}

@Injectable(
{
    providedIn:'root'
})
export class ProvidentFundService
{
    private readonly http =
        inject(HttpClient);

    private readonly api =
        `${environment.apiUrl}/human-resource-manangement/provident-fund`;

    private list<T>(url: string): Observable<T[]>
    {
        return this.http
            .get<any[]>(url)
            .pipe(map(rows => (Array.isArray(rows) ? rows : []).map(pascal) as T[]));
    }

    private one<T>(url: string): Observable<T>
    {
        return this.http.get<any>(url).pipe(map(x => pascal(x) as T));
    }

    // ---------- Policy ----------

    getPolicy():
        Observable<PfPolicy>
    {
        return this.http
            .get<any>(`${this.api}/policy`)
            .pipe(map(x => ({ ...emptyPfPolicy(), ...pascal(x ?? {}) }) as PfPolicy));
    }

    savePolicy(policy: PfPolicy):
        Observable<PfPolicy>
    {
        return this.http
            .put<any>(`${this.api}/policy`, policy)
            .pipe(map(x => ({ ...emptyPfPolicy(), ...pascal(x ?? {}) }) as PfPolicy));
    }

    // ---------- Members / Loans / Settlements ----------
    // kind : members | loans | settlements

    getAll<T>(kind: string): Observable<T[]>
    {
        return this.list<T>(`${this.api}/${kind}`);
    }

    getById<T>(kind: string, publicId: string): Observable<T>
    {
        return this.one<T>(`${this.api}/${kind}/${publicId}`);
    }

    getDefaults(kind: string):
        Observable<PfDefaults>
    {
        return this.http.get<any>(`${this.api}/${kind}/defaults`).pipe(map(defaults));
    }

    getHistory(kind: string):
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.api}/${kind}/history`);
    }

    delete(kind: string, publicId: string):
        Observable<void>
    {
        return this.http.delete<void>(`${this.api}/${kind}/${publicId}`);
    }

    createMember(m: PfMember):
        Observable<PfMember>
    {
        return this.http.post<any>(`${this.api}/members`, withId(m)).pipe(map(x => pascal(x) as PfMember));
    }

    updateMember(publicId: string, m: PfMember):
        Observable<void>
    {
        return this.http.put<void>(`${this.api}/members/${publicId}`, withId(m));
    }

    createLoan(l: PfLoan):
        Observable<PfLoan>
    {
        return this.http.post<any>(`${this.api}/loans`, withId(l)).pipe(map(x => pascal(x) as PfLoan));
    }

    // What the policy gives the member (nothing is saved)
    previewSettlement(memberId: number, date: string, reason: string):
        Observable<PfSettlement>
    {
        return this.http
            .get<any>(`${this.api}/settlements/preview`, { params:{ memberId, date, reason } })
            .pipe(map(x => pascal(x) as PfSettlement));
    }

    createSettlement(s: PfSettlement):
        Observable<PfSettlement>
    {
        return this.http.post<any>(`${this.api}/settlements`, withId(s)).pipe(map(x => pascal(x) as PfSettlement));
    }

    // ---------- Interest ----------

    // The financial years and the interest credited already
    getInterestHome():
        Observable<PfInterestHome>
    {
        return this.http
            .get<any>(`${this.api}/interest`)
            .pipe(map(x =>
            {
                const home = pascal(x ?? {});

                return {
                    Years:(home.Years ?? []).map((y: any) => pascal(y)),
                    Runs:(home.Runs ?? []).map((r: any) => pascal(r))
                } as PfInterestHome;
            }));
    }

    previewInterest(financialYearId: number):
        Observable<PfInterestYear>
    {
        return this.http
            .get<any>(`${this.api}/interest/${financialYearId}`)
            .pipe(map(x =>
            {
                const data = pascal(x ?? {});

                return {
                    ...data,
                    Year:pascal(data.Year ?? {}),
                    Rows:(data.Rows ?? []).map((r: any) => pascal(r))
                } as PfInterestYear;
            }));
    }

    postInterest(financialYearId: number):
        Observable<PfInterestRun>
    {
        return this.http.post<any>(`${this.api}/interest/${financialYearId}`, {}).pipe(map(x => pascal(x) as PfInterestRun));
    }

    deleteInterest(id: number):
        Observable<void>
    {
        return this.http.delete<void>(`${this.api}/interest/${id}`);
    }

    // ---------- Reports ----------

    getSummary():
        Observable<PfMember[]>
    {
        return this.list<PfMember>(`${this.api}/reports/summary`);
    }

    // Loan interest received and company parts forfeited
    getIncome():
        Observable<{ LoanInterest: number; Forfeited: number; ForfeitedToCompany: number }>
    {
        return this.http
            .get<any>(`${this.api}/reports/income`)
            .pipe(map(x => ({ LoanInterest:0, Forfeited:0, ForfeitedToCompany:0, ...pascal(x ?? {}) })));
    }

    getStatement(memberId: number):
        Observable<{ Member: PfMember; Rows: PfStatementRow[] }>
    {
        return this.one<{ Member: PfMember; Rows: PfStatementRow[] }>(`${this.api}/reports/statement/${memberId}`);
    }

    getRegister(year: number, month: number):
        Observable<PfRegisterRow[]>
    {
        return this.http
            .get<any[]>(`${this.api}/reports/register`, { params:{ year, month } })
            .pipe(map(rows => (Array.isArray(rows) ? rows : []).map(pascal) as PfRegisterRow[]));
    }
}
