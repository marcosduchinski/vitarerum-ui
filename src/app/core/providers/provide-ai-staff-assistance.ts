import { inject, Provider } from '@angular/core';
import { USE_MOCK_API } from '@core/config/app-config.model';
import { AiStaffAssistanceServiceMock } from '@features/ai-staff-assistance/mocks/ai-staff-assistance.service.mock';
import {
  AI_STAFF_ASSISTANCE_SERVICE,
  AiStaffAssistanceService,
} from '@features/ai-staff-assistance/services/ai-staff-assistance.service';

export function provideAiStaffAssistance(): Provider[] {
  return [
    AiStaffAssistanceService,
    AiStaffAssistanceServiceMock,
    {
      provide: AI_STAFF_ASSISTANCE_SERVICE,
      useFactory: () =>
        inject(USE_MOCK_API)
          ? inject(AiStaffAssistanceServiceMock)
          : inject(AiStaffAssistanceService),
    },
  ];
}
