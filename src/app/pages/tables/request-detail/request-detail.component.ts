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
import { GlpiService } from 'src/app/services/glpi.service';
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
    RegisterTicketCommercialComponent
  ],
  templateUrl: './request-detail.component.html',
  styleUrls: ['./request-detail.component.sass']
})
export class RequestDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);

  private readonly glpiService = inject(GlpiService)
  readonly utilsService = inject(UtilsService);
  

  readonly ticket = `#${this.route.snapshot.paramMap.get('ticket') ?? 'INC-2024-1258'}`;
  readonly origins = ['Cliente Actual', 'Referido', 'Visita comercial', 'Whatsapp', 'Correo', 'Web / redes', 'Licitación'];
  readonly solutionTypes = ['CCTV', 'Monitoreo', 'Control de acceso', 'Alarmas / intrusión', 'Redes / telecomunicaciones', 'Energía / fotovoltaico', 'Mantenimiento / Soporte'];
  readonly statuses = ['Por elaborar', 'Enviada', 'Seguimiento', 'Negociación', 'Aprobada', 'Rechazada', 'En pausa'];
  readonly nextActions = ['Facturar', 'Solicitar reunión con cliente', 'En revisión por cliente'];
  readonly actionOwners = ['Asesor', 'Área técnica', 'Contabilidad'];

  commercial: CommercialForm = {
    origin: 'Cliente Actual',
    solutionType: 'Redes / telecomunicaciones',
    quotedValue: 2350,
    status: 'Seguimiento',
    closeProbability: 65,
    estimatedCloseDate: new Date(2024, 5, 14),
    nextFollowUp: new Date(2024, 5, 3),
    nextAction: 'Solicitar reunión con cliente',
    nextActionOwner: 'Asesor',
    requiresTechnicalSupport: true,
    requiresMaterials: false,
    expectedStartDate: new Date(2024, 5, 24),
    contractReceived: false,
    observations: 'Se cotiza paquete de soporte para diagnóstico y configuración de acceso VPN remoto.',
    lossReason: ''
  };

  ticketIdRouteParam: number | null = null;
  ticketDetails: any = null;

  ngOnInit() {
    const ticketId = this.route.snapshot.paramMap.get('ticket');
    if (ticketId) {
      this.ticketIdRouteParam = Number(ticketId);
      this.getDetailTicket(this.ticketIdRouteParam);
    }
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
}
