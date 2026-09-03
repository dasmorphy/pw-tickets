import { Component, OnInit, computed, inject } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { PanelMenuModule } from 'primeng/panelmenu';
import { MenuService } from 'src/app/services/menu.service';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { AuthService } from 'src/app/services/auth.service';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { LogbookService } from 'src/app/services/logbook.service';
import { UtilsService } from 'src/app/services/utils.service';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    PanelMenuModule,
    DialogModule,
    DropdownModule,
    ProgressSpinnerModule
  ],
  // providers: [MessageService],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.sass']
})
export class MenuComponent implements OnInit {

  private readonly authService = inject(AuthService)
  private readonly menuService = inject(MenuService);
  private readonly logbookService = inject(LogbookService);
  private readonly utilsService = inject(UtilsService);
  private readonly userService = inject(UserService);

  toggle = computed(() => this.menuService.toggle());
  // user_storage = computed(() => this.userService.user_storage());
  user_permissions_signal = computed(() => this.authService.user_permissions_signal());
  
  user_permissions: string[] = [];
  user_session: any;
  showGenerateReport: boolean = false;
  isLoading: boolean = false;
  optionsReport = [
    'Pdf', 'Excel'
  ];
  optionSelected = '';


  items = computed(() => {
    return [
      {
        label: 'Dashboard',
        icon: 'pi pi-chart-pie',
        routerLink: ['dashboard'],
        command: () => { this.clickHiddenToggle(true) },
      },
      {
        label: 'Solicitudes',
        icon: 'pi pi-list-check',
        routerLink: ['solicitudes'],
        // visible: this.user_permissions_signal()?.includes('VER_BITACORAS'),
        command: () => { this.clickHiddenToggle(true) },
        
      },
      {
        label: 'Cerrar Sesión',
        icon: 'pi pi-sign-out',
        command: () => this.logout()
      }
    ];
  })

  ngOnInit() {
    // this.user_session = this.userService.getDataSession();
    // const attributes = this.user_session?.attributes
    // this.authService.setPermissionsUser(attributes.permissions);
    this.userService.setUserStorage(this.user_session)
    // this.calculateUserPermissions();
  }

  clickHiddenToggle(flag?: boolean) {
    const screenWidth = window.innerWidth;

    if (screenWidth <= 600 && !flag) {
      this.menuService.changeToggle();
    } else if (screenWidth > 600 && !this.toggle()) {
      this.menuService.changeToggle();
    }


  }

  calculateUserPermissions() {
    // Lógica para calcular y retornar los permisos del usuario
    if (this.user_session) {
      const rolePermissionsMap: { [key: string]: string } = {
        'VENTAS': 'VENTAS',
        'GESTION-USUARIO': 'GESTION-USUARIO',
        'PROSPECCION': 'PROSPECCION',
        'OFERTA': 'OFERTA',
        'DIRECCION': 'DIRECCION',
        'CONDICIONES-COMERCIALES': 'CONDICIONES-COMERCIALES',
        'PRODUCTOS': 'PRODUCTOS',
        'ENTIDADES-EXTERNAS': 'ENTIDADES-EXTERNAS',
        'PROCESOS': 'PROCESOS',
        'SEGURIDAD': 'SEGURIDAD',
        'METRICAS': 'METRICAS'
      };

      for (let permisos of this.user_session.groups) {
        const roles = permisos.realmRoles;

        if (roles?.length > 0) {
          for (let rol of roles) {
            const uppercaseRol = rol.toUpperCase();

            // Iterar sobre las claves (prefijos) del objeto rolePermissionsMap
            for (let prefix in rolePermissionsMap) {
              if (uppercaseRol.startsWith(prefix) && !this.user_permissions.includes(rolePermissionsMap[prefix])) {
                this.user_permissions.push(rolePermissionsMap[prefix]);
              }
            }

            this.user_permissions.push(uppercaseRol);
          }
        }
      }

      this.authService.setPermissionsUser(this.user_permissions)
    }

  }

  changeOptionReport(event: any) {
    this.optionSelected = event?.value;
  }

  generateReport() {
    this.showGenerateReport = false;
    this.isLoading = true;

    const isExcel = this.optionSelected === 'Excel';

    const request$ = isExcel
      ? this.logbookService.getGenerateReportExcel()
      : this.logbookService.getGenerateReportPdf();

    const defaultName = isExcel ? 'reporte_excel' : 'reporte_pdf';

    request$.subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.utilsService.downloadFile(response, defaultName);
      },
      error: () => {
        this.isLoading = false;
        this.utilsService.onError('Error al generar el archivo');
      }
    });
  }

  logout() {
    this.authService.logout()
  }

  toggleMenu() {
    this.menuService.changeToggle();
  }

  expandedSidenav() {
    if (!this.toggle()) {
      this.menuService.changeToggle();
    }
  }
}
