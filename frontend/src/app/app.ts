import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Navbar } from './shared/navbar/navbar';
import { Footer } from './shared/footer/footer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer],
  templateUrl: './app.html',
})
export class App {
  protected readonly isLoginPage = signal(false);

  constructor(router: Router) {
    this.isLoginPage.set(router.url.startsWith('/login'));
    router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.isLoginPage.set(event.urlAfterRedirects.startsWith('/login'));
      }
    });
  }
}
