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
      label: 'Use of Collections',
      items: [
        {
          label: 'Proposals',
          icon: 'pi pi-copy',
          items: [{ label: 'My Proposals', icon: 'pi pi-bookmark', routerLink: '/p/proposals/my' }],
        },
        {
          label: 'Projects',
          icon: 'pi pi-server',
          items: [{ label: 'My projects', icon: 'pi pi-th-large', routerLink: '/p/projects/my' }],
        },
      ],
    },
  ],

  COLLECTIONS_MANAGEMENT: [
    HOME,
    {
      label: 'Use of Collections',
      items: [
        {
          label: 'Proposals',
          icon: 'pi pi-copy',
          items: [
            { label: 'New', icon: 'pi pi-list', routerLink: '/p/proposals/new' },
            { label: 'My assignments', icon: 'pi pi-bookmark', routerLink: '/p/proposals/my' },
            {
              label: "Other's assignments",
              icon: 'pi pi-bookmark',
              routerLink: '/p/proposals/others',
            },
            { label: 'Approved', icon: 'pi pi-check-circle', routerLink: '/p/proposals/approved' },
            {
              label: 'Rejected / cancelled',
              icon: 'pi pi-times-circle',
              routerLink: '/p/proposals/rejected',
            },
          ],
        },
        {
          label: 'Projects',
          icon: 'pi pi-server',
          items: [
            { label: 'My projects', icon: 'pi pi-th-large', routerLink: '/p/projects/my' },
            { label: 'In progress', icon: 'pi pi-th-large', routerLink: '/p/projects/in-progress' },
            { label: 'Suspended', icon: 'pi pi-pause-circle', routerLink: '/p/projects/suspended' },
            {
              label: 'Completed / closed',
              icon: 'pi pi-check',
              routerLink: '/p/projects/completed',
            },
          ],
        },
      ],
    },
  ],

  CURATORIAL: [
    HOME,
    {
      label: 'Use of Collections',
      items: [
        {
          label: 'Proposals',
          icon: 'pi pi-copy',
          items: [
            { label: 'New', icon: 'pi pi-list', routerLink: '/p/proposals/new' },
            { label: 'My assignments', icon: 'pi pi-bookmark', routerLink: '/p/proposals/my' },
            {
              label: "Other's assignments",
              icon: 'pi pi-bookmark',
              routerLink: '/p/proposals/others',
            },
            { label: 'Approved', icon: 'pi pi-check-circle', routerLink: '/p/proposals/approved' },
            {
              label: 'Rejected / cancelled',
              icon: 'pi pi-times-circle',
              routerLink: '/p/proposals/rejected',
            },
          ],
        },
        {
          label: 'Projects',
          icon: 'pi pi-server',
          items: [
            { label: 'My projects', icon: 'pi pi-th-large', routerLink: '/p/projects/my' },
            { label: 'In progress', icon: 'pi pi-th-large', routerLink: '/p/projects/in-progress' },
            { label: 'Suspended', icon: 'pi pi-pause-circle', routerLink: '/p/projects/suspended' },
            {
              label: 'Completed / closed',
              icon: 'pi pi-check',
              routerLink: '/p/projects/completed',
            },
          ],
        },
      ],
    },
  ],

  DIRECTION: [
    HOME,
    {
      label: 'Use of Collections',
      items: [
        {
          label: 'Proposals',
          icon: 'pi pi-copy',
          items: [
            { label: 'New', icon: 'pi pi-list', routerLink: '/p/proposals/new' },
            { label: 'My assignments', icon: 'pi pi-bookmark', routerLink: '/p/proposals/my' },
            {
              label: "Other's assignments",
              icon: 'pi pi-bookmark',
              routerLink: '/p/proposals/others',
            },
            { label: 'Approved', icon: 'pi pi-check-circle', routerLink: '/p/proposals/approved' },
            {
              label: 'Rejected / cancelled',
              icon: 'pi pi-times-circle',
              routerLink: '/p/proposals/rejected',
            },
          ],
        },
        {
          label: 'Projects',
          icon: 'pi pi-server',
          items: [
            { label: 'My projects', icon: 'pi pi-th-large', routerLink: '/p/projects/my' },
            { label: 'In progress', icon: 'pi pi-th-large', routerLink: '/p/projects/in-progress' },
            { label: 'Suspended', icon: 'pi pi-pause-circle', routerLink: '/p/projects/suspended' },
            {
              label: 'Completed / closed',
              icon: 'pi pi-check',
              routerLink: '/p/projects/completed',
            },
          ],
        },
      ],
    },
  ],

  ADMIN: [
    HOME,
    {
      label: 'Use of Collections',
      items: [
        {
          label: 'Proposals',
          icon: 'pi pi-copy',
          items: [
            { label: 'New', icon: 'pi pi-list', routerLink: '/p/proposals/new' },
            { label: 'My assignments', icon: 'pi pi-bookmark', routerLink: '/p/proposals/my' },
            {
              label: "Other's assignments",
              icon: 'pi pi-bookmark',
              routerLink: '/p/proposals/others',
            },
            { label: 'Approved', icon: 'pi pi-check-circle', routerLink: '/p/proposals/approved' },
            {
              label: 'Rejected / cancelled',
              icon: 'pi pi-times-circle',
              routerLink: '/p/proposals/rejected',
            },
          ],
        },
        {
          label: 'Projects',
          icon: 'pi pi-server',
          items: [
            { label: 'My projects', icon: 'pi pi-th-large', routerLink: '/p/projects/my' },
            { label: 'In progress', icon: 'pi pi-th-large', routerLink: '/p/projects/in-progress' },
            { label: 'Suspended', icon: 'pi pi-pause-circle', routerLink: '/p/projects/suspended' },
            {
              label: 'Completed / closed',
              icon: 'pi pi-check',
              routerLink: '/p/projects/completed',
            },
          ],
        },
      ],
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
