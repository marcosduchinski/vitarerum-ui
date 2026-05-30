import { inject, Provider } from '@angular/core';
import { USE_MOCK_API } from '@core/config/app-config.model';
import { ProposalApiServiceMock } from '@core/collection-use/mocks/proposal-api.service.mock';
import { ProjectApiServiceMock } from '@core/collection-use/mocks/project-api.service.mock';
import {
  PROJECT_API_SERVICE,
  ProjectApiService,
} from '@core/collection-use/projects/project-api.service';
import {
  PROPOSAL_API_SERVICE,
  ProposalApiService,
} from '@core/collection-use/proposals/proposal-api.service';

export function provideCollectionUse(): Provider[] {
  return [
    ProposalApiService,
    ProposalApiServiceMock,
    {
      provide: PROPOSAL_API_SERVICE,
      useFactory: () =>
        inject(USE_MOCK_API) ? inject(ProposalApiServiceMock) : inject(ProposalApiService),
    },
    ProjectApiService,
    ProjectApiServiceMock,
    {
      provide: PROJECT_API_SERVICE,
      useFactory: () =>
        inject(USE_MOCK_API) ? inject(ProjectApiServiceMock) : inject(ProjectApiService),
    },
  ];
}
