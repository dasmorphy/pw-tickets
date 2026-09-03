import { Component, Inject, OnInit, computed, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { InputTextModule } from 'primeng/inputtext';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MenuService } from 'src/app/services/menu.service';
import { UserService } from 'src/app/services/user.service';
import { NotificationService } from 'src/app/services/notification.service';
import { NotificationItem } from 'src/app/models/notification';

/** Cantidad de notificaciones que se muestran en el panel de la campana */
const PREVIEW_SIZE = 5;

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    AvatarModule,
    InputTextModule,
    OverlayPanelModule,
    ProgressSpinnerModule,
    TagModule,
    TooltipModule
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.sass'],
})
export class HeaderComponent implements OnInit{
  private readonly menuService = inject(MenuService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  public readonly notificationService = inject(NotificationService);

  user_json:any;
  theme_selection: boolean = false;
  iconTheme: string = 'pi pi-sun'
  screenWidth: any = window.innerWidth;

  notificationsPreview = computed(() => this.notificationService.notifications().slice(0, PREVIEW_SIZE));

  constructor(@Inject(DOCUMENT) private document: Document){}


  ngOnInit(){
    this.user_json = this.userService.getDataSession();
    const theme:any = localStorage.getItem('theme');

    if (this.user_json) {
      this.iconTheme = theme === 'dark' ? 'pi pi-moon' : 'pi pi-sun';
      this.changeThemeLara(theme);
      // Usa la caché local; solo consulta al backend si no hay datos vigentes
      this.notificationService.loadNotifications();
    }

  }

  changeThemeColor() {
    const theme_local_storage = localStorage.getItem('theme');
    let theme: string = '';

    if (theme_local_storage) {
      this.theme_selection =  theme_local_storage === 'dark' ? false : true;
      theme = this.theme_selection ? 'dark' : 'light';
    }

    this.iconTheme = this.theme_selection ? 'pi pi-moon' : 'pi pi-sun';
    localStorage.setItem('theme', theme);
    this.changeThemeLara(theme);

  }

  changeThemeLara(theme: string) {
    let themeLink = this.document.getElementById('app-theme') as HTMLLinkElement;
    themeLink.href = 'lara-' + theme + '-blue' + '.css';
  }

  toggleMenu() {
    this.menuService.changeToggle();
  }

  toggleNotifications(event: any, panel: any) {
    panel.toggle(event);
    // No vuelve a consultar si la caché local sigue vigente
    this.notificationService.loadNotifications();
  }

  reloadNotifications() {
    this.notificationService.loadNotifications(true);
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }

  openNotification(notification: NotificationItem, panel: any) {
    this.notificationService.markAsRead(notification);
    panel.hide();
    this.router.navigate(['/notificaciones'], {
      queryParams: { id: notification.id_notification }
    });
  }

  goToAllNotifications(panel: any) {
    panel.hide();
    this.router.navigate(['/notificaciones']);
  }
}
