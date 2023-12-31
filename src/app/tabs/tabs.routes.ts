import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
    {
        path: 'tabs',
        component: TabsPage,
        children: [
            {
                path: 'main',
                loadComponent: () =>
                    import('../main/main.page').then((m) => m.MainPage),
            },
            {
                path: '',
                redirectTo: '/tabs/main',
                pathMatch: 'full',
            },
        ],
    },
    {
        path: '',
        redirectTo: '/tabs/main',
        pathMatch: 'full',
    },
];