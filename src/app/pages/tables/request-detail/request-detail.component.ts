import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ToastModule } from 'primeng/toast';
import { RegisterTicketCommercialComponent } from 'src/app/components/forms/register-ticket-commercial/register-ticket-commercial.component';
import { RegisterTicketFinancialComponent } from 'src/app/components/forms/register-ticket-financial/register-ticket-financial.component';
import { RegisterTicketTechnicalComponent } from 'src/app/components/forms/register-ticket-technical/register-ticket-technical.component';
import { GlpiService } from 'src/app/services/glpi.service';
import { UserService } from 'src/app/services/user.service';
import { UtilsService } from 'src/app/services/utils.service';

interface CommercialForm {
  origin: string | null;
  solutionType: string | null;
  quotedValue: number | null;
  status: string | null;
  closeProbability: number | null;
  estimatedCloseDate: Date | null;
  nextFollowUp: Date | null;
  nextAction: string | null;
  nextActionOwner: string | null;
  requiresTechnicalSupport: boolean;
  requiresMaterials: boolean;
  expectedStartDate: Date | null;
  contractReceived: boolean;
  observations: string;
  lossReason: string;
}

interface GlpiDocument {
  id: number;
  filename: string;
  name: string;
  mime: string;
  assocdate: string;
  users_id: string;
}

@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    CalendarModule,
    CheckboxModule,
    DropdownModule,
    InputNumberModule,
    InputTextareaModule,
    ToastModule,
    RegisterTicketCommercialComponent,
    RegisterTicketTechnicalComponent,
    RegisterTicketFinancialComponent
  ],
  templateUrl: './request-detail.component.html',
  styleUrls: ['./request-detail.component.sass']
})
export class RequestDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);

  private readonly glpiService = inject(GlpiService)
  private readonly userService = inject(UserService);
  readonly utilsService = inject(UtilsService);
  

  readonly ticket = `#${this.route.snapshot.paramMap.get('ticket') ?? 'INC-2024-1258'}`;
  readonly origins = ['Cliente Actual', 'Referido', 'Visita comercial', 'Whatsapp', 'Correo', 'Web / redes', 'Licitación'];
  readonly solutionTypes = ['CCTV', 'Monitoreo', 'Control de acceso', 'Alarmas / intrusión', 'Redes / telecomunicaciones', 'Energía / fotovoltaico', 'Mantenimiento / Soporte'];
  readonly statuses = ['Por elaborar', 'Enviada', 'Seguimiento', 'Negociación', 'Aprobada', 'Rechazada', 'En pausa'];
  readonly nextActions = ['Facturar', 'Solicitar reunión con cliente', 'En revisión por cliente'];
  readonly actionOwners = ['Asesor', 'Área técnica', 'Contabilidad'];

  user_json: any;
  area_user: string;

  ticketIdRouteParam: number | null = null;
  ticketDetails: any = null;
  ticketIdEdit: number;

  ngOnInit() {
    this.user_json = this.userService.getDataSession();
    this.area_user = this.user_json?.attributes?.area
    const ticketId = this.route.snapshot.paramMap.get('ticket_glpi');
    if (ticketId) {
      this.ticketIdRouteParam = Number(ticketId);
      this.getDetailTicket(this.ticketIdRouteParam);
    }

    this.ticketIdEdit = Number(
      this.route.snapshot.paramMap.get('ticket_intern')
    );

  }


  getDetailTicket(ticketId: number): void {
    this.glpiService.getDetailTicket(ticketId).subscribe({
      next: (response: any) => {
        const data = response?.body || {};
        this.ticketDetails = data?.data || {};
        console.log('Ticket details:', this.ticketDetails);
      },
      error: (error: any) => {
        console.error('Error fetching ticket details:', error);
        this.utilsService.onError('Error al obtener los detalles del ticket, por favor inténtelo de nuevo más tarde.');
      }
    });
  }

  getDocumentName(document: GlpiDocument): string {
    return document.filename || document.name || 'Documento sin nombre';
  }

  getDocumentType(document: GlpiDocument): string {
    const filename = this.getDocumentName(document);
    const extension = filename.includes('.') ? filename.split('.').pop() : null;
    return extension?.toUpperCase() || document.mime?.split('/').pop()?.toUpperCase() || 'ARCHIVO';
  }

  getDocumentIcon(document: GlpiDocument): string {
    if (document.mime === 'application/pdf') return 'pi pi-file-pdf';
    if (document.mime?.startsWith('image/')) return 'pi pi-image';
    return 'pi pi-file';
  }

  formatDocumentDate(value: string): string {
    if (!value) return 'Sin fecha';
    const [date, time = ''] = value.split(' ');
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}${time ? ` ${time.slice(0, 5)}` : ''}`;
  }

  save(): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Información guardada',
      detail: 'La gestión comercial se actualizó correctamente.'
    });
  }

  downloadDocument(documentId: number): void {
    this.glpiService.downloadDocument(documentId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);

        window.open(url, '_blank');

        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 1000);
      },
      error: (error) => {
        console.error('Error al descargar documento:', error);
      }
    });
  }

  redirectTicketGlpi() {
    const url = `http://192.168.230.253/glpi/front/ticket.form.php?id=${this.ticketIdRouteParam}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

}
