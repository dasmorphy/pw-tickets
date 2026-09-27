import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
import { UserService } from 'src/app/services/user.service';
import { MultiSelectModule } from 'primeng/multiselect';

@Component({
    selector: 'app-inspection-form',
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
        InputTextModule,
        MultiSelectModule
    ],
    templateUrl: './inspection-form.component.html',
    styleUrls: ['./inspection-form.component.sass']
})
export class InspectionFormComponent {
    @Input() ticketIdEdit: number;
    
    private glpiService = inject(GlpiService);
    private utilsService = inject(UtilsService);
    private userService = inject(UserService);

    ticketForm: FormGroup;

    clientsOptions: any[] = [];
    ubicationsOptions: any[] = [];
    user_session: any;

    caseTypeOptions = ['Requiere cotización', 'Interno', 'Garantía', 'Aprobado directo'];
    priorityOptions = ['Urgente', 'Alta', 'Media', 'Baja'];
    managementStatusOptions = ['No iniciado', 'En proceso', 'Completado', 'No aplica'];
    statusOptions = ['Nuevo', 'En levantamiento', 'Pendiente de información', 'Listo para cotizar', 'En cotización',
        'Listo para ejecutar', 'En ejecución', 'Cerrado', 'Cancelado'
    ];
    nextActionsOptions = ['Cotización', 'Inspección'];
    readonly nextActions = ['Facturar', 'Solicitar reunión con cliente', 'En revisión por cliente'];
    readonly actionOwners = ['Asesor', 'Área técnica', 'Contabilidad'];
    users_intern: any = [];


    constructor(private fb: FormBuilder, private route: ActivatedRoute, private router: Router) {
        this.ticketForm = this.fb.group({
            client_id: ['', Validators.required],
            client_name: ['', Validators.required],
            ubication_name: ['', Validators.required],
            ubication_id: ['', Validators.required],
            contact: ['', Validators.required],
            case_type: ['', Validators.required],
            priority: [null, Validators.required],
            management_status: [null, Validators.required],
            status: [null, Validators.required],
            commitment_date: ['', Validators.required],
            requires_material: [false],
            requires_monitoring: [false],
            responsible_id: ['', Validators.required],
            responsible_name: [''],
            observations: [''],
        });
    }
    
    ngOnInit() {
        this.user_session = this.userService.getDataSession();
        this.fetchClients();
        this.fetchUsers();
    }

    fetchUsers() {
        const filters = {
            roles: ['jefe_sistemas', 'asiste_sistemas', 'jefe_tecnico', 'tecnico']
        }
        this.userService.getUsers(filters).subscribe({
            next: (data: any) => {
                this.users_intern = (data?.data ?? []).map((user: any) => ({
                ...user,
                fullname: user.attributes?.fullname
                }));
            },
            error: (error: any) => {
                console.log(error);
            }
        });
    }

    changeResponsible(value: string) {
        const name_responsible = this.users_intern.find((user: any) => user.id_user == value);
        
        console.log(name_responsible)
        this.ticketForm.patchValue({
            responsible_name: name_responsible?.fullname ?? ''
        })

    }

    loadTicket(): void {
        console.log(this.ticketIdEdit)

        this.glpiService.getTicketsTechnical({'ticket_technical_id': this.ticketIdEdit}).subscribe({
            next: (data: any) => {
                console.log(data)
                const dataTicket = data?.data?.data?.[0]
                this.setTicketEdit(dataTicket)
            },
            error: (error: any) => {
                console.log(error)
                this.utilsService.onError('No se pudo obtener la información del ticket técnico')
            }
        })


    }

    fetchClients() {
        this.glpiService.getClients().subscribe({
            next: (data: any) => {
                this.clientsOptions = data?.data;
                if (this.ticketIdEdit) {
                    console.log('modo edit')
                    this.loadTicket()
                }else{
                    console.log('modo new')
                }
            },
            error: (error: any) => {
                console.error('Error fetching clients:', error);
                this.utilsService.onError('Error al obtener los clientes. Por favor, inténtelo de nuevo más tarde.');
            }
        });
    }

    changeClient(value: any) {
        this.ubicationsOptions = [];
        const client = typeof value === 'object'
            ? value
            : this.clientsOptions.find(x => String(x.id_client) === String(value));

        if (client?.id_client) {
            this.ticketForm.patchValue({
                client_id: client.id_client,
                client_name: client.name
            })
            this.glpiService.getLocationsClient(client.id_client).subscribe({
                next: (data: any) => {
                    this.ubicationsOptions = data?.data;
                    const currentUbicationId = this.ticketForm.get('ubication_id')?.value;                    
                    if (currentUbicationId) {
                        const ubication = this.ubicationsOptions.find(x => String(x.id_location) === String(currentUbicationId));
                        if (ubication) {
                            this.changeUbication(ubication);
                        }
                    }
                },
                error: (error: any) => {
                    console.error('Error fetching locations:', error);
                    this.utilsService.onError('Error al obtener las ubicaciones. Por favor, inténtelo de nuevo más tarde.');
                }
            });
        }
    }

    changeUbication(value: any) {
        const ubication = typeof value === 'object'
            ? value
            : this.ubicationsOptions.find(x => String(x.id_location) === String(value));

        this.ticketForm.patchValue({
            ubication_id: ubication?.id_location,
            ubication_name: ubication?.name
        })
    }

    saveTicket() {
        if (this.ticketForm.valid) {
            const ticketData = {
                ...this.ticketForm.value,
                user: this.user_session?.user
            };

            console.log('Ticket data to save:', ticketData);

            // if (this.ticketIdEdit) {
            //     this.updateTicket(ticketData);
            // }else{
                this.glpiService.saveInspectionTechnical(ticketData).subscribe({
                    next: (data: any) => {
                        console.log(data)
                        this.utilsService.onSuccess('Inspección registrado exitosamente.');
                        this.router.navigate(['/inspecciones'])
                    },
                    error: (error: any) => {
                        console.log(error)
                        this.utilsService.onError(error?.error?.message ?? 'Error al crear el registro, por favor intente nuevamente');
                    }
                })
            // }

        } else {
            this.utilsService.onWarn('Por favor, complete todos los campos requeridos.');
        }   
    }

    updateTicket(data: any) {
        this.glpiService.updateTicketTechnical(data).subscribe({
            next: (data: any) => {
                console.log(data)
                this.utilsService.onSuccess('Ticket actualizado exitosamente.');
                this.router.navigate(['/tickets-tecnicos'])
            },
            error: (error: any) => {
                console.log(error)
                this.utilsService.onError(error?.error?.message ?? 'Error al crear el registro, por favor intente nuevamente');
            }
        })
    }

    setTicketEdit(dataTicket: any) {
        const commitmentDate = dataTicket?.commitment_date
            ? new Date(dataTicket.commitment_date)
            : null;

        this.ticketForm.patchValue({
            client_id: dataTicket?.client_id,
            ubication_id: dataTicket?.ubication_id,
            contact: dataTicket?.contact,
            case_type: dataTicket?.case_type,
            priority: dataTicket?.priority,
            management_status: dataTicket?.management_status,
            status: dataTicket?.status,
            next_action: dataTicket?.next_action,
            commitment_date: commitmentDate,
            // ticket_glpi: dataTicket?.ticket_glpi,
            requires_material: dataTicket?.requires_material,
            requires_monitoring: dataTicket?.requires_monitoring,
            observations: dataTicket?.observations,
        })

        const client = this.clientsOptions.find( x => x.id_client === dataTicket?.client_id );
        
        if (client) { 
            this.changeClient(client);
        }
    }
        
}