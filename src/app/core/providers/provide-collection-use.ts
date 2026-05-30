import { inject, Provider } from '@angular/core';
import { USE_MOCK_API } from '@core/config/app-config.model';
import { ProposalApiServiceMock } from '../../features/collections/proposals/mocks/proposal-api.service.mock';
import { ProjectApiServiceMock } from '../../features/collections/projects/mocks/project-api.service.mock';
import {
  PROJECT_API_SERVICE,
  ProjectApiService,
} from '../../features/collections/projects/services/project-api.service';
import {
  PROPOSAL_API_SERVICE,
  ProposalApiService,
} from '../../features/collections/proposals/services/proposal-api.service';

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
