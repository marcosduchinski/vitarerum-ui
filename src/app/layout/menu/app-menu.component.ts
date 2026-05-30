import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { IDENTITY_SERVICE } from '@core/identity/identity.service';
import { GroupName } from '@core/identity/models/group-name.enum';

import { AppMenuItemComponent } from './app-menu-item.component';
import { MenuNode } from './menu.model';

const HOME: MenuNode = {
  label: 'Home',
  items: [{ label: 'Dashboard', icon: 'pi pi-home', routerLink: '/p/dashboard' }],
};

const MENUS: Record<GroupName, readonly MenuNode[]> = {
  EXTERNAL: [
    HOME,
    {
      label: 'Proposals',
      items: [
        { label: 'New proposal', icon: 'pi pi-file-plus', routerLink: '/p/proposals/new' },
        { label: 'My proposals', icon: 'pi pi-folder-open', routerLink: '/p/proposals/my' },
      ],
    },
    {
      label: 'Projects',
      items: [{ label: 'My projects', icon: 'pi pi-briefcase', routerLink: '/p/projects/my' }],
    },
  ],

  COLLECTIONS_MANAGEMENT: [
    HOME,
    {
      label: 'Collection use',
      items: [
        {
          label: 'Proposals',
          icon: 'pi pi-copy',
          items: [
            { label: 'Staff queue', icon: 'pi pi-list', routerLink: '/p/proposals/queue' },
            { label: 'My assignments', icon: 'pi pi-bookmark', routerLink: '/p/proposals/assignments' },
            { label: 'Pending documents', icon: 'pi pi-file', routerLink: '/p/proposals/pending-documents' },
            { label: 'Approved', icon: 'pi pi-check-circle', routerLink: '/p/proposals/approved' },
            { label: 'Rejected / cancelled', icon: 'pi pi-times-circle', routerLink: '/p/proposals/rejected' },
          ],
        },
        {
          label: 'Projects',
          icon: 'pi pi-server',
          items: [
            { label: 'All projects', icon: 'pi pi-th-large', routerLink: '/p/projects/all' },
            { label: 'In progress', icon: 'pi pi-spinner', routerLink: '/p/projects/in-progress' },
            { label: 'Suspended', icon: 'pi pi-pause-circle', routerLink: '/p/projects/suspended' },
            { label: 'Completed / closed', icon: 'pi pi-check', routerLink: '/p/projects/completed' },
          ],
        },
      ],
    },
    {
      label: 'Administration',
      items: [
        { label: 'Users', icon: 'pi pi-users', routerLink: '/p/admin/users' },
        { label: 'Groups', icon: 'pi pi-sitemap', routerLink: '/p/admin/groups' },
      ],
    },
  ],

  CURATORIAL: [
    HOME,
    {
      label: 'Collection use',
      items: [
        {
          label: 'Proposals',
          icon: 'pi pi-copy',
          items: [
            { label: 'Staff queue', icon: 'pi pi-list', routerLink: '/p/proposals/queue' },
            { label: 'My assignments', icon: 'pi pi-bookmark', routerLink: '/p/proposals/assignments' },
            { label: 'Pending direction', icon: 'pi pi-question-circle', routerLink: '/p/proposals/pending-direction' },
            { label: 'Approved', icon: 'pi pi-check-circle', routerLink: '/p/proposals/approved' },
          ],
        },
        {
          label: 'Projects',
          icon: 'pi pi-server',
          items: [
            { label: 'All projects', icon: 'pi pi-th-large', routerLink: '/p/projects/all' },
          ],
        },
      ],
    },
    {
      label: 'Administration',
      items: [
        { label: 'Users', icon: 'pi pi-users', routerLink: '/p/admin/users' },
        { label: 'Groups', icon: 'pi pi-sitemap', routerLink: '/p/admin/groups' },
      ],
    },
  ],

  DIRECTION: [
    HOME,
    {
      label: 'Proposals',
      items: [
        { label: 'Pending direction', icon: 'pi pi-question-circle', routerLink: '/p/proposals/pending-direction' },
        { label: 'Approved', icon: 'pi pi-check-circle', routerLink: '/p/proposals/approved' },
      ],
    },
    {
      label: 'Projects',
      items: [{ label: 'All projects', icon: 'pi pi-th-large', routerLink: '/p/projects/all' }],
    },
  ],
};

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [AppMenuItemComponent],
  templateUrl: './app-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppMenuComponent {
  private readonly identity = inject(IDENTITY_SERVICE);

  protected readonly items = computed<readonly MenuNode[]>(() => {
    const group = this.identity.session()?.group;
    return group ? MENUS[group] : [HOME];
  });
}
