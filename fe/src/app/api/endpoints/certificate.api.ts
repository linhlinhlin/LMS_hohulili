import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../client/api-client';
import { STUDENT_ENDPOINTS } from './student.endpoints';

export interface CertificateDTO {
  id: string;
  courseId: string;
  courseName: string;
  verificationToken: string;
  issuedAt: string;
}

export interface CertificateVerification {
  valid: boolean;
  studentId?: string;
  studentName?: string;
  courseId?: string;
  courseName?: string;
  issuedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class CertificateApi {
  private api = inject(ApiClient);

  getMyCertificates(): Observable<any> {
    return this.api.get(STUDENT_ENDPOINTS.MY_CERTIFICATES);
  }

  verifyCertificate(token: string): Observable<any> {
    return this.api.get(STUDENT_ENDPOINTS.VERIFY_CERTIFICATE(token));
  }

  issueCertificate(enrollmentId: string): Observable<any> {
    return this.api.post(`${STUDENT_ENDPOINTS.BASE}/certificates/issue/${enrollmentId}`, {});
  }
}
