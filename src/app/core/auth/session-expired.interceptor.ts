import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { IDENTITY_SERVICE } from './identity.service';

export const sessionExpiredInterceptor: HttpInterceptorFn = (request, next) => {
  const identity = inject(IDENTITY_SERVICE);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        identity.signOut();
        void router.navigateByUrl('/login');
      }

      return throwError(() => error);
    }),
  );
};
