import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { IDENTITY_SERVICE } from './identity.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(IDENTITY_SERVICE).getAccessToken();

  if (token === null) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};
