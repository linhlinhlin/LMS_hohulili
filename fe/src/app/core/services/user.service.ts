import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse, Page } from '../../api/types/common.types';

export interface UserSummary {
    id: string;
    username: string;
    email: string;
    fullName: string;
    role: string;
}

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private http = inject(HttpClient);
    private readonly API_URL = `${environment.apiUrl}/api/v3/users`;

    searchUsersByRole(role: string, query: string, page: number = 0, limit: number = 10): Observable<Page<UserSummary>> {
        let params = `?role=${role}&page=${page + 1}&limit=${limit}`; // Backend uses 1-based page index for this endpoint or standard? 
        // UserController.java: @RequestParam(defaultValue = "1") int page
        // PageRequest.of(page - 1, limit);
        // So Backend expects 1-based index in param, converts to 0-based. 
        // My ClassService sent 0-based... wait.
        // ClassController uses Pageable directly. Spring Pageable Handler resolves page (0-based) and size.
        // UserController MANUALLY takes `int page` (1-based).

        if (query) params += `&q=${encodeURIComponent(query)}`;

        return this.http.get<ApiResponse<Page<UserSummary>>>(`${this.API_URL}/search${params}`)
            .pipe(map(response => response.data));
    }
}
