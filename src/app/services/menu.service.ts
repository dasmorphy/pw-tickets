import { Injectable, effect, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MenuService {

  toggle = signal(false);

  e = effect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    if (mq.matches) this.toggle.set(true);
  }, { allowSignalWrites: true })

  changeToggle() {
    this.toggle.set(!this.toggle());
  }
}
