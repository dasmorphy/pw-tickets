import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ToastModule } from 'primeng/toast';
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
    selector: 'app-register-ticket-commercial',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ButtonModule,
        CalendarModule,
        CheckboxModule,
        DropdownModule,
        InputNumberModule,
        InputTextareaModule,
        ToastModule,
        FormsModule,
        ReactiveFormsModule,
    ],
    templateUrl: './register-ticket-commercial.component.html',
    styleUrls: ['./register-ticket-commercial.component.sass']
})
export class RegisterTicketCommercialComponent {
    private glpiService = inject(GlpiService);
    private utilsService = inject(UtilsService);

    ticketForm: FormGroup;

    readonly origins = ['Cliente Actual', 'Referido', 'Visita comercial', 'Whatsapp', 'Correo', 'Web / redes', 'Licitación'];
    readonly solutionTypes = ['CCTV', 'Monitoreo', 'Control de acceso', 'Alarmas / intrusión', 'Redes / telecomunicaciones', 'Energía / fotovoltaico', 'Mantenimiento / Soporte'];
    readonly statuses = ['Por elaborar', 'Enviada', 'Seguimiento', 'Negociación', 'Aprobada', 'Rechazada', 'En pausa'];
    readonly nextActions = ['Facturar', 'Solicitar reunión con cliente', 'En revisión por cliente'];
    readonly actionOwners = ['Asesor', 'Área técnica', 'Contabilidad'];


    constructor(private fb: FormBuilder,) {
        this.ticketForm = this.fb.group({
            origin: ['', Validators.required],
            solutionType: ['', Validators.required],
            quotedValue: [null, Validators.required],
            status: ['', Validators.required],
            closeProbability: [null, Validators.required],
            estimatedCloseDate: [null, Validators.required],
            nextFollowUp: [null, Validators.required],
            nextAction: ['', Validators.required],
            nextActionOwner: ['', Validators.required],
            requiresTechnicalSupport: [false, Validators.required],
            requiresMaterials: [false, Validators.required],
            expectedStartDate: [null, Validators.required],
            contractReceived: [false, Validators.required],
            observations: [''],
            lossReason: ['']
        });
    }

}