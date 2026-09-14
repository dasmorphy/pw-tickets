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
import { InputTextModule } from "primeng/inputtext";

@Component({
    selector: 'app-register-ticket-technical',
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
        InputTextModule
    ],
    templateUrl: './register-ticket-technical.component.html',
    styleUrls: ['./register-ticket-technical.component.sass']
})
export class RegisterTicketTechnicalComponent {
    private glpiService = inject(GlpiService);
    private utilsService = inject(UtilsService);

    ticketForm: FormGroup;

    clientsOptions: any[] = [];
    ubicationsOptions: any[] = [];

    caseTypeOptions = ['Requiere cotización', 'Interno', 'Garantía', 'Aprobado directo'];
    priorityOptions = ['Urgente', 'Alta', 'Media', 'Baja'];
    managementStatusOptions = ['No iniciado', 'En proceso', 'Completado', 'No aplica'];
    nextActionsOptions = ['Cotización', 'Inspección'];
    readonly nextActions = ['Facturar', 'Solicitar reunión con cliente', 'En revisión por cliente'];
    readonly actionOwners = ['Asesor', 'Área técnica', 'Contabilidad'];


    constructor(private fb: FormBuilder, private route: ActivatedRoute) {
        this.ticketForm = this.fb.group({
            client_id: ['', Validators.required],
            ubication_id: ['', Validators.required],
            contact: ['', Validators.required],
            case_type: ['', Validators.required],
            priority: [null, Validators.required],
            management_status: [null, Validators.required],
            next_action: [null, Validators.required],
            commitment_date: ['', Validators.required],
            ticket_glpi: [null, Validators.required],
            responsible: [null, Validators.required],
            requires_material: [false],
            requires_monitoring: [false],
            observations: [''],
        });
    }
    
    ngOnInit() {
        const ticketId = this.route.snapshot.paramMap.get('ticket');
        this.ticketForm.patchValue({
            ticket_glpi: ticketId,
            // responsible
        })
        console.log(ticketId)

        this.fetchClients();
    }

    fetchClients() {
        this.glpiService.getClients().subscribe({
            next: (data: any) => {
                this.clientsOptions = data?.data;
            },
            error: (error: any) => {
                console.error('Error fetching clients:', error);
                this.utilsService.onError('Error al obtener los clientes. Por favor, inténtelo de nuevo más tarde.');
            }
        });
    }

    changeClient(id_client: number) {
        this.ubicationsOptions = [];

        if (id_client) {
            this.glpiService.getLocationsClient(id_client).subscribe({
                next: (data: any) => {
                    this.ubicationsOptions = data?.data;
                },
                error: (error: any) => {
                    console.error('Error fetching locations:', error);
                    this.utilsService.onError('Error al obtener las ubicaciones. Por favor, inténtelo de nuevo más tarde.');
                }
            });
        }
    }

    saveTicket() {
        if (this.ticketForm.valid) {
            const ticketData = this.ticketForm.value;
            console.log('Ticket data to save:', ticketData);
            // Here you would typically send the ticketData to your backend service

            this.glpiService.saveTicketTechnical(ticketData).subscribe({
                next: (data: any) => {
                    console.log(data)
                },
                error: (error: any) => {
                    console.log(error)
                }
            })


            this.utilsService.onSuccess('Ticket registrado exitosamente.');
        } else {
            this.utilsService.onWarn('Por favor, complete todos los campos requeridos.');
        }   
    }
        
}