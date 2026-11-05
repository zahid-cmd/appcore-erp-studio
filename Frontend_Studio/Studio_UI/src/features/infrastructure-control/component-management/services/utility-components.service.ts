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
    UtilityComponents, 
 
    CreateUtilityComponents, 
 
    UpdateUtilityComponents 
} 
from '../models/utility-components.model'; 
 
 
//=============================================================== 
// Utility Components Service 
//=============================================================== 
 
@Injectable( 
{ 
    providedIn:'root' 
}) 
 
 
export class UtilityComponentsService 
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
        `${environment.apiUrl}/infrastructure-control/component-management/utility-components`; 
 
 
 
    //=========================================================== 
    // Get All 
    //=========================================================== 
 
    getAll(): 
        Observable<UtilityComponents[]> 
    { 
        return this.http.get<UtilityComponents[]>( 
            this.apiUrl 
        ); 
    } 
 
 
 
    //=========================================================== 
    // Get By Id 
    //=========================================================== 
 
    getById 
    ( 
        id: 
            string 
    ): 
        Observable<UtilityComponents> 
    { 
        return this.http.get<UtilityComponents>( 
            `${this.apiUrl}/${id}` 
        ); 
    } 
 
 
 
    //=========================================================== 
    // Create 
    //=========================================================== 
 
    create 
    ( 
        model: 
            CreateUtilityComponents 
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
        publicId:
            string,

        model: 
            UpdateUtilityComponents 
    ): 
        Observable<void> 
    { 
        return this.http.put<void>( 
            `${this.apiUrl}/${publicId}`, 
 
            model 
        ); 
    } 
 
 
 
    //=========================================================== 
    // Delete 
    //=========================================================== 
 
    delete 
    ( 
        id: 
            string 
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
            string 
    ): 
        Observable<any[]> 
    { 
        return this.http.get<any[]>( 
            `${this.apiUrl}/${id}/history` 
        ); 
    } 
 
}