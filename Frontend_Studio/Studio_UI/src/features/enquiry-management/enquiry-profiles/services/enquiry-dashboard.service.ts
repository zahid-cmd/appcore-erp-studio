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
    HttpClient,
    HttpParams
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
    EnquiryDashboard,
    EnquiryDashboardAgenda,
    EnquiryDashboardCount,
    EnquiryDashboardExecutive,
    EnquiryDashboardFilter,
    EnquiryDashboardOption,
    EnquiryDashboardTrend
}
from '../models/enquiry-dashboard.model';


//===============================================================
// Read a value in PascalCase or camelCase
//===============================================================

function pick
(
    source:
        any,
    key:
        string
):
    any
{
    if
    (
        !source
    )
    {
        return undefined;
    }

    const camel =
        key.charAt(0).toLowerCase() + key.slice(1);

    return source[key] !== undefined
        ? source[key]
        : source[camel];
}

const text =
    (value: any): string =>
        value === null || value === undefined ? '' : String(value);

const num =
    (value: any): number =>
        Number(value) || 0;

const numOrNull =
    (value: any): number | null =>
        value === null || value === undefined || value === '' ? null : Number(value);

const list =
    (value: any): any[] =>
        Array.isArray(value) ? value : [];

const toCount =
    (x: any): EnquiryDashboardCount =>
    ({
        Name:text(pick(x, 'Name')),
        Color:text(pick(x, 'Color')),
        Count:num(pick(x, 'Count'))
    });

const toOption =
    (x: any): EnquiryDashboardOption =>
    ({
        Id:num(pick(x, 'Id')),
        Name:text(pick(x, 'Name'))
    });


//===============================================================
// Enquiry Dashboard Service
//
//   GET enquiry-dashboard?branchId=&from=&to=&executiveId=
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class EnquiryDashboardService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/enquiry-management/enquiry-profiles/enquiry-dashboard`;


    get
    (
        filter:
            EnquiryDashboardFilter
    ):
        Observable<EnquiryDashboard>
    {
        let params =
            new HttpParams()
                .set('from', filter.From)
                .set('to', filter.To);

        if
        (
            filter.BranchId > 0
        )
        {
            params = params.set('branchId', String(filter.BranchId));
        }

        if
        (
            filter.ExecutiveId > 0
        )
        {
            params = params.set('executiveId', String(filter.ExecutiveId));
        }

        return this.http
            .get<any>(this.apiUrl, { params })
            .pipe(
                map
                (
                    x =>
                    ({
                        From:text(pick(x, 'From')),
                        To:text(pick(x, 'To')),
                        Today:text(pick(x, 'Today')),
                        SalesTotal:num(pick(x, 'SalesTotal')),
                        SalesOpen:num(pick(x, 'SalesOpen')),
                        SalesWon:num(pick(x, 'SalesWon')),
                        SalesLost:num(pick(x, 'SalesLost')),
                        ConversionRate:numOrNull(pick(x, 'ConversionRate')),
                        ServiceTotal:num(pick(x, 'ServiceTotal')),
                        ServiceOpen:num(pick(x, 'ServiceOpen')),
                        ServiceConverted:num(pick(x, 'ServiceConverted')),
                        ServiceLost:num(pick(x, 'ServiceLost')),
                        FollowUpsDue:num(pick(x, 'FollowUpsDue')),
                        FollowUpsOverdue:num(pick(x, 'FollowUpsOverdue')),
                        TestRidesToday:num(pick(x, 'TestRidesToday')),
                        TestRidesTodayConfirmed:num(pick(x, 'TestRidesTodayConfirmed')),
                        AppointmentsToday:num(pick(x, 'AppointmentsToday')),
                        AppointmentsTodayPickup:num(pick(x, 'AppointmentsTodayPickup')),
                        FunnelTestRidden:num(pick(x, 'FunnelTestRidden')),
                        AverageDaysToMaturity:numOrNull(pick(x, 'AverageDaysToMaturity')),
                        Sources:list(pick(x, 'Sources')).map(toCount),
                        Interest:list(pick(x, 'Interest')).map(toCount),
                        Models:list(pick(x, 'Models')).map(toCount),
                        LostReasons:list(pick(x, 'LostReasons')).map(toCount),
                        TrendUnit:text(pick(x, 'TrendUnit')) || 'Day',
                        Trend:list(pick(x, 'Trend')).map
                        (
                            (y: any): EnquiryDashboardTrend =>
                            ({
                                Label:text(pick(y, 'Label')),
                                Sales:num(pick(y, 'Sales')),
                                Service:num(pick(y, 'Service'))
                            })
                        ),
                        Agenda:list(pick(x, 'Agenda')).map
                        (
                            (y: any): EnquiryDashboardAgenda =>
                            ({
                                Kind:text(pick(y, 'Kind')) as EnquiryDashboardAgenda['Kind'],
                                Title:text(pick(y, 'Title')),
                                Detail:text(pick(y, 'Detail')),
                                WhenText:text(pick(y, 'WhenText')),
                                OverdueDays:num(pick(y, 'OverdueDays')),
                                PublicId:text(pick(y, 'PublicId')) || null
                            })
                        ),
                        AgendaMore:num(pick(x, 'AgendaMore')),
                        Executives:list(pick(x, 'Executives')).map
                        (
                            (y: any): EnquiryDashboardExecutive =>
                            ({
                                UserId:num(pick(y, 'UserId')),
                                Name:text(pick(y, 'Name')),
                                Total:num(pick(y, 'Total')),
                                Open:num(pick(y, 'Open')),
                                Won:num(pick(y, 'Won')),
                                Lost:num(pick(y, 'Lost')),
                                ConversionRate:numOrNull(pick(y, 'ConversionRate')),
                                Overdue:num(pick(y, 'Overdue'))
                            })
                        ),
                        Branches:list(pick(x, 'Branches')).map(toOption),
                        ExecutiveOptions:list(pick(x, 'ExecutiveOptions')).map(toOption)
                    })
                )
            );
    }
}
