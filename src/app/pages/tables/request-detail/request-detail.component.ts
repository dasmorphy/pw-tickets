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
    ToastModule
  ],
  templateUrl: './request-detail.component.html',
  styleUrls: ['./request-detail.component.sass']
})
export class RequestDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);

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

  save(): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Información guardada',
      detail: 'La gestión comercial se actualizó correctamente.'
    });
  }
}
