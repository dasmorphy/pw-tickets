import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
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
    @Input() ticketIdEdit: number;
    
    private glpiService = inject(GlpiService);
    private utilsService = inject(UtilsService);

    ticketForm: FormGroup;

    origins: any = [];
    solutionTypes: any = [];
    status: any = [];
    readonly nextActions = ['Facturar', 'Solicitar reunión con cliente', 'En revisión por cliente'];
    readonly actionOwners = ['Asesor', 'Área técnica', 'Contabilidad'];


    constructor(private fb: FormBuilder, private route: ActivatedRoute) {
        this.ticketForm = this.fb.group({
            origin_id: ['', Validators.required],
            type_solution_id: ['', Validators.required],
            quotedValue: [null],
            status_id: ['', Validators.required],
            probability_closing: [null],
            closing_date: [null],
            next_action: [null],
            ticket_id: [null, Validators.required],
            // nextActionOwner: ['', Validators.required],
            requires_technical: [false],
            requires_material: [false],
            scheduled_start_date: [null],
            contract_received: [false],
            observations: [null],
            reason_loss: [null]
        });
    }


    ngOnInit() {
        const ticketId = this.route.snapshot.paramMap.get('ticket_glpi');
        if (ticketId) {
            this.ticketForm.patchValue({
                ticket_id: parseInt(ticketId, 10),
                // responsible
            })
        }
        this.fetchOrigin();
        this.fetchStatus();
        this.fetchTypeSolution();

        if (this.ticketIdEdit) {
            console.log('modo edit')
            this.loadTicket()
        }else{
            console.log('modo new')
        }
    }

    loadTicket(): void {
        console.log(this.ticketIdEdit)

        this.glpiService.getTicketsCommercial({'ticket_commercial_id': this.ticketIdEdit}).subscribe({
            next: (data: any) => {
                console.log(data)
                const dataTicket = data?.data?.[0]
                this.setTicketEdit(dataTicket)
            },
            error: (error: any) => {
                console.log(error)
                this.utilsService.onError('No se pudo obtener la información del ticket comercial')
            }
        })
    }

    setTicketEdit(dataTicket: any) {
        this.ticketForm.patchValue({
            origin_id: dataTicket?.origin_id,
            type_solution_id: dataTicket?.type_solution_id,
            quotedValue: dataTicket?.quoted_amount,
            status_id: dataTicket?.status_id,
            probability_closing: dataTicket?.probability_closing,
            closing_date: dataTicket?.closing_date,
            next_action: dataTicket?.next_action,
            scheduled_start_date: dataTicket?.scheduled_start_date,
            requires_technical: dataTicket?.requires_technical,
            requires_material: dataTicket?.requires_material,
            contract_received: dataTicket?.contract_received,
            reason_loss: dataTicket?.reason_loss,
            observations: dataTicket?.observations,
        })
    }

    fetchOrigin() {
        this.glpiService.getCommercialOrigin().subscribe({
            next: (data: any) => {
                this.origins = data?.data;
            },
            error: (error: any) => {
                console.log(error);
                this.utilsService.onError('No se pudo obtener los origenes, por favor intente nuevamente')
            }
        })
    }

    fetchStatus() {
        this.glpiService.getCommercialStatus().subscribe({
            next: (data: any) => {
                this.status = data?.data;
            },
            error: (error: any) => {
                console.log(error);
                this.utilsService.onError('No se pudo obtener los estados, por favor intente nuevamente')
            }
        })
    }

    fetchTypeSolution() {
        this.glpiService.getCommercialTypeSolution().subscribe({
            next: (data: any) => {
                this.solutionTypes = data?.data;
            },
            error: (error: any) => {
                console.log(error);
                this.utilsService.onError('No se pudo obtener las soluciones, por favor intente nuevamente')
            }
        })
    }

    saveTicket() {
        console.log(this.ticketForm)
        if (this.ticketForm.valid) {
            const ticketData = this.ticketForm.value;
            console.log('Ticket data to save:', ticketData);
            // Here you would typically send the ticketData to your backend service
            if (this.ticketIdEdit) {
                this.updateTicket(ticketData);
            }else{
                this.glpiService.saveTicketCommercial(ticketData).subscribe({
                    next: (data: any) => {
                        console.log(data)
                        this.utilsService.onSuccess('Ticket registrado exitosamente.');
                    },
                    error: (error: any) => {
                        console.log(error)
                        this.utilsService.onError(error?.error?.message ?? 'Hubo un error al guardar, por favor intente nuevamente')
                    }
                })
            }
        } else {
            this.utilsService.onWarn('Por favor, complete todos los campos requeridos.');
        }   
    }

    updateTicket(data: any) {
        this.glpiService.updateTicketCommercial(data).subscribe({
            next: (data: any) => {
                console.log(data)
                this.utilsService.onSuccess('Ticket actualizado exitosamente.');
            },
            error: (error: any) => {
                console.log(error)
                this.utilsService.onError(error?.error?.message ?? 'Error al crear el registro, por favor intente nuevamente');
            }
        })
    }

}