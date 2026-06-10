import { Routes } from '@angular/router';
import { Verify } from './pages/verify/verify';
import { About } from './pages/about/about';
import { Faq } from './pages/faq/faq';
import { Resources } from './pages/resources/resources';
import { Contact } from './pages/contact/contact';

export const routes: Routes = [
  { path: '', component: Verify },
  { path: 'about', component: About },
  { path: 'faq', component: Faq },
  { path: 'resources', component: Resources },
  { path: 'contact', component: Contact },
  { path: '**', redirectTo: '' },
];
