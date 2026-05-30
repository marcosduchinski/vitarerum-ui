import { Routes } from '@angular/router';

export const PROPOSALS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'new' },
  {
    path: 'new',
    title: 'New Proposals',
    loadComponent: () =>
      import('./pages/new/proposals-new-page.component').then(m => m.ProposalsNewPageComponent),
  },
  {
    path: 'submit',
    title: 'Submit Proposal',
    loadComponent: () =>
      import('./pages/submit/proposal-submit-page.component').then(m => m.ProposalSubmitPageComponent),
  },
  { path: 'my', redirectTo: '/p/dashboard' },
  { path: 'others', redirectTo: '/p/dashboard' },
  { path: 'approved', redirectTo: '/p/dashboard' },
  { path: 'rejected', redirectTo: '/p/dashboard' },
  {
    path: ':id',
    title: 'Proposal',
    loadComponent: () =>
      import('./pages/detail/proposal-detail-page.component').then(m => m.ProposalDetailPageComponent),
  },
];
