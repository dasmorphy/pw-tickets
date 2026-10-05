import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ToastModule } from 'primeng/toast';
import { GlpiService } from 'src/app/services/glpi.service';
import { UserService } from 'src/app/services/user.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
    selector: 'app-register-ticket-financial',
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
    templateUrl: './register-ticket-financial.component.html',
    styleUrls: ['./register-ticket-financial.component.sass']
})
export class RegisterTicketFinancialComponent {
    private glpiService = inject(GlpiService);
    private utilsService = inject(UtilsService);
    private userService = inject(UserService);

    ticketForm: FormGroup;

    origins: any = [];
    typeManagement: any = ['Orden de compra', 'Factura'];
    status: any = [];
    // valueInvoice = ['1 mes', '3 meses', '6 meses', '9 meses'];
    user_session: any;


    readonly nextActions = ['Facturar', 'Solicitar reunión con cliente', 'En revisión por cliente'];
    readonly actionOwners = ['Asesor', 'Área técnica', 'Contabilidad'];


    constructor(private fb: FormBuilder, private route: ActivatedRoute, private router: Router) {
        this.ticketForm = this.fb.group({
            type_management: ['', Validators.required],
            status: ['', Validators.required],
            amount_pending: [{ value: null, disabled: true }],
            amount_paid: [null],
            invoice_price: [null],
            date_document: [null],
            number_document: [null],
            ticket_id: [null, Validators.required],
            observations: [null],
        });
    }


    ngOnInit() {
        this.user_session = this.userService.getDataSession();
        const ticketId = this.route.snapshot.paramMap.get('inspection_id');
        if (ticketId) {
            this.ticketForm.patchValue({
                ticket_id: parseInt(ticketId, 10),
                // responsible
            })
        }
    }


    onChangeTypeManagement(type: string) {
        if (type == 'Orden de compra') {
            this.status = ['Solicitado', 'Recibido']
        }else {
            this.status = ['Emitida', 'Cobrada']
        }
    }


    calculateAmountPending(): void {
        const invoicePrice = this.ticketForm.get('invoice_price')?.value ?? 0;
        const amountPaid = this.ticketForm.get('amount_paid')?.value ?? 0;

        if (invoicePrice > 0 && amountPaid > 0) {
            const amountPending = invoicePrice - amountPaid;

            this.ticketForm.patchValue({
                amount_pending: amountPending
            });
        }

        if (!amountPaid) {
            this.ticketForm.patchValue({
                amount_pending: null
            });
        }
    }

    saveTicket() {
        console.log(this.ticketForm)
        if (this.ticketForm.valid) {
            const ticketData = {
                ...this.ticketForm.value,
                user: this.user_session?.user
            };

            console.log('Ticket data to save:', ticketData);
            // Here you would typically send the ticketData to your backend service

            this.glpiService.saveTicketFinancial(ticketData).subscribe({
                next: (data: any) => {
                    console.log(data)
                    this.utilsService.onSuccess('Ticket registrado exitosamente.');
                    this.router.navigate(['/tickets-financieros'])
                },
                error: (error: any) => {
                    console.log(error)
                    this.utilsService.onError(error?.error?.message ?? 'Hubo un error al guardar, por favor intente nuevamente')
                }
            })


        } else {
            this.utilsService.onWarn('Por favor, complete todos los campos requeridos.');
        }
    }

}