import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { GlpiService } from 'src/app/services/glpi.service';
import { UserService } from 'src/app/services/user.service';
import { UtilsService } from 'src/app/services/utils.service';
import { TicketDetailSidebarComponent } from 'src/app/components/modals/ticket-detail-sidebar/ticket-detail-sidebar.component';

@Component({
  selector: 'app-inspections-approval',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule, SplitButtonModule, TableModule, ToastModule, TooltipModule, TicketDetailSidebarComponent],
  templateUrl: './inspections-approval.component.html',
  styleUrls: ['./inspections-approval.component.sass']
})
export class InspectionsApprovalComponent {
  private readonly glpiService = inject(GlpiService);
  private readonly router = inject(Router);
  readonly utilsService = inject(UtilsService);
  readonly userService = inject(UserService);

  filters: any = {
    status: 'Pendiente aprobación',
  };
  user_session: any;
  selectedTicket: any;
  registeredTickets: any[] = [];
  registeredLoading = false;
  showConfirm = false;
  isApproving = false;
  showDetail = false;

  items: any = [
    {
        label: 'Ver detalles',
        icon: 'pi pi-eye',
        command: () => this.showDetail = true
    },
    {
        label: 'Editar',
        icon: 'pi pi-play-circle',
        visible: () => this.selectedTicket?.status != 'Listo para cotizar',
        command: () => this.routeRegister()
    },
    {
        label: 'Aprobar',
        icon: 'pi pi-check-circle',
        command: () => this.showConfirm = true
    },
  ];

  ngOnInit() {
    this.user_session = this.userService.getDataSession();
    if (this.user_session?.role == 'tecnico') {
      this.filters.responsible_id = this.user_session?.id_user
      this.filters.user = this.user_session?.user
    }

    this.fetchTicketsTechnical();
  }

  fetchTicketsTechnical() {
    this.registeredLoading = true;
    this.glpiService.getTicketsTechnical(this.filters).subscribe({
      next: (response: any) => {
        console.log(response);
        this.registeredTickets = response?.data ?? [];
        this.registeredLoading = false;
      },
      error: (error: any) => {
        console.error('Error fetching tickets:', error);
        this.registeredLoading = false;
        this.utilsService.onError('Error al obtener los tickets por favor, inténtelo de nuevo más tarde.');
      }
    });
  }

  optionsTicket(ticket: any) {
    this.selectedTicket = ticket
  }

  routeRegister() {
    this.router.navigate([
      `/registro-inspeccion-tecnica/${this.selectedTicket?.id_inspection}`
    ]);
  }

  approveInspection() {
    this.isApproving = true;
    const data = {
      id_inspection: this.selectedTicket?.id_inspection,
      user: this.user_session?.user
    }

    this.glpiService.approveTechnicalInspection(data).subscribe({
      next: () => {
        this.isApproving = false;
        this.showConfirm = false;
        this.utilsService.onSuccess('Inspección aprobada correctamente');
        this.fetchTicketsTechnical();
      },
      error: (error: any) => {
        console.log(error)
        this.isApproving = false;
        this.showConfirm = false;
        this.utilsService.onError(error?.error?.message ?? 'No se pudo aprobar la inspección, por favor intente nuevamente')
      }
    })
  }
}
