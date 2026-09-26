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
    Observable 
} 
from 'rxjs'; 
 
import 
{ 
    environment 
} 
from '../../../../environments/environment'; 
 
import 
{ 
    Dashboards, 
 
    CreateDashboards, 
 
    UpdateDashboards, 
 
    DashboardsDefaults 
} 
from '../models/dashboards.model'; 
 
 
//=============================================================== 
// Dashboards Service 
//=============================================================== 
 
@Injectable( 
{ 
    providedIn:'root' 
}) 
 
 
export class DashboardsService 
{ 
 
    //=========================================================== 
    // Injection 
    //=========================================================== 
 
    private readonly http = 
        inject(HttpClient); 
 
 
 
    //=========================================================== 
    // API 
    //=========================================================== 
 
    private readonly apiUrl = 
        `${environment.apiUrl}/infrastructure-control/application-configuration/dashboards`; 
 
 
 
    //=========================================================== 
    // Get All 
    //=========================================================== 
 
    getAll(): 
        Observable<Dashboards[]> 
    { 
        return this.http.get<Dashboards[]>( 
            this.apiUrl 
        ); 
    } 
 
 
 
    //=========================================================== 
    // Get By Id 
    //=========================================================== 
 
    getById 
    ( 
        id: 
            number 
    ): 
        Observable<Dashboards> 
    { 
        return this.http.get<Dashboards>( 
            `${this.apiUrl}/${id}` 
        ); 
    } 
 
 
 
    //=========================================================== 
    // Get Active 
    //=========================================================== 
 
    getActive(): 
        Observable<Dashboards> 
    { 
        return this.http.get<Dashboards>( 
            `${this.apiUrl}/active` 
        ); 
    } 
 
 
 
    //=========================================================== 
    // Get Defaults 
    //=========================================================== 
 
    getDefaults(): 
        Observable<DashboardsDefaults> 
    { 
        return this.http.get<DashboardsDefaults>( 
            `${this.apiUrl}/defaults` 
        ); 
    } 
 
 
 
    //=========================================================== 
    // Create 
    //=========================================================== 
 
    create 
    ( 
        model: 
            CreateDashboards 
    ): 
        Observable<number> 
    { 
        return this.http.post<number>( 
            this.apiUrl, 
 
            model 
        ); 
    } 
 
 
 
    //=========================================================== 
    // Update 
    //=========================================================== 
 
    update 
    ( 
        model: 
            UpdateDashboards 
    ): 
        Observable<void> 
    { 
        return this.http.put<void>( 
            `${this.apiUrl}/${model.id}`, 
 
            model 
        ); 
    } 
 
 
 
    //=========================================================== 
    // Delete 
    //=========================================================== 
 
    delete 
    ( 
        id: 
            number 
    ): 
        Observable<void> 
    { 
        return this.http.delete<void>( 
            `${this.apiUrl}/${id}` 
        ); 
    } 
 
 
 
    //=========================================================== 
    // Restore 
    //=========================================================== 
 
    restore(): 
        Observable<void> 
    { 
        return this.http.put<void>( 
            `${this.apiUrl}/restore`, 
 
            {} 
        ); 
    } 
 
 
 
    //=========================================================== 
    // Get History 
    //=========================================================== 
 
    getHistory(): 
        Observable<any[]> 
    { 
        return this.http.get<any[]>( 
            `${this.apiUrl}/history` 
        ); 
    } 
 
 
 
    //=========================================================== 
    // Get Entity History 
    //=========================================================== 
 
    getEntityHistory 
    ( 
        id: 
            number 
    ): 
        Observable<any[]> 
    { 
        return this.http.get<any[]>( 
            `${this.apiUrl}/${id}/history` 
        ); 
    } 
 
} 