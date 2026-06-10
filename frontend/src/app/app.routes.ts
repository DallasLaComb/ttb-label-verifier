import { Routes } from '@angular/router';
import { Verify } from './pages/verify/verify';
import { About } from './pages/about/about';
import { Faq } from './pages/faq/faq';
import { Resources } from './pages/resources/resources';
import { Contact } from './pages/contact/contact';
import { Login } from './pages/login/login';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: '', component: Verify, canActivate: [authGuard] },
  { path: 'about', component: About, canActivate: [authGuard] },
  { path: 'faq', component: Faq, canActivate: [authGuard] },
  { path: 'resources', component: Resources, canActivate: [authGuard] },
  { path: 'contact', component: Contact, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
