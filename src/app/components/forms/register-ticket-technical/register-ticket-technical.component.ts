import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { EditorModule } from 'primeng/editor';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { catchError, forkJoin, of } from 'rxjs';
import { GlpiService } from 'src/app/services/glpi.service';
import { UtilsService } from 'src/app/services/utils.service';
import { UserService } from 'src/app/services/user.service';
import { ProjectTechnicalService } from 'src/app/services/project-technical.service';

@Component({
    selector: 'app-register-ticket-technical',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ButtonModule,
        DropdownModule,
        EditorModule,
        InputNumberModule,
        InputTextModule,
        ToastModule,
        FormsModule,
        ReactiveFormsModule
    ],
    templateUrl: './register-ticket-technical.component.html',
    styleUrls: ['./register-ticket-technical.component.sass']
})
export class RegisterTicketTechnicalComponent {
    @Input() ticketIdEdit: number;

    private glpiService = inject(GlpiService);
    private utilsService = inject(UtilsService);
    private userService = inject(UserService);
    private readonly projectTechnicalService = inject(ProjectTechnicalService);

    ticketForm: FormGroup;

    user_session: any;

    materialsOptions: any[] = [];
    selectedMaterials: any[] = [];
    materialSelected: any = null;
    materialQuantity: number | null = null;
    isNewMaterial = false;
    newMaterialName = '';
    newMaterialDescription = '';

    ticketDetails: any = null;
    codeManagement: string | null = null;
    loadingTicket = false;

    readonly ticket = `#${this.route.snapshot.paramMap.get('inspection_id') ?? 'N/A'}`;


    constructor(private fb: FormBuilder, private route: ActivatedRoute, private router: Router) {
        this.ticketForm = this.fb.group({
            inspection_id: [null, Validators.required],
            description: [''],
        });
    }

    ngOnInit() {
        this.user_session = this.userService.getDataSession();

        const inspectionId = this.route.snapshot.paramMap.get('inspection_id');
        if (inspectionId) {
            const ticketIdRouteParam = parseInt(inspectionId, 10);
            this.ticketForm.patchValue({
                inspection_id: ticketIdRouteParam,
            })
            this.getDetailTicket(ticketIdRouteParam);
        }
    }

    // Busca la inspección de la ruta; si ya tiene registro técnico (technical_id) se carga para editarlo.
    // El catálogo se carga a la par para mostrar el nombre de cada material.
    getDetailTicket(inspectionId: number): void {
        this.loadingTicket = true;
        forkJoin({
            materials: this.projectTechnicalService.getMaterials().pipe(
                catchError((error: any) => {
                    console.error('Error fetching materials:', error);
                    this.utilsService.onError('Error al obtener los materiales. Por favor, inténtelo de nuevo más tarde.');
                    return of({ data: [] });
                })
            ),
            inspection: this.glpiService.getInspectionTechnical({ id_inspection: inspectionId }),
        }).subscribe({
            next: ({ materials, inspection }: any) => {
                this.materialsOptions = materials?.data ?? [];
                this.ticketDetails = inspection?.data?.[0] || {};

                const technicalId = this.ticketDetails?.technical_id;
                if (!technicalId) {
                    this.loadingTicket = false;
                    return;
                }

                this.ticketIdEdit = technicalId;
                this.loadTechnicalRegister(technicalId);
            },
            error: (error: any) => {
                console.error('Error fetching ticket details:', error);
                this.loadingTicket = false;
                this.utilsService.onError('Error al obtener los detalles del ticket, por favor inténtelo de nuevo más tarde.');
            }
        });
    }

    loadTechnicalRegister(technicalId: number): void {
        this.glpiService.getTicketsTechnical({ ticket_technical_id: technicalId }).subscribe({
            next: (response: any) => {
                this.loadingTicket = false;
                const register = response?.data?.[0];

                if (!register) {
                    this.utilsService.onError('No se encontró el registro técnico');
                    return;
                }

                this.setTicketEdit(register);
            },
            error: (error: any) => {
                console.error('Error fetching technical register:', error);
                this.loadingTicket = false;
                this.utilsService.onError('No se pudo obtener la información del registro técnico');
            }
        });
    }

    addMaterial() {
        const newName = this.newMaterialName.trim();

        if (this.isNewMaterial ? !newName : !this.materialSelected) {
            this.utilsService.onWarn(this.isNewMaterial ? 'Ingrese el nombre del producto.' : 'Seleccione un material.');
            return;
        }

        if (!this.materialQuantity || this.materialQuantity <= 0) {
            this.utilsService.onWarn('Ingrese una cantidad mayor a 0.');
            return;
        }

        if (this.isNewMaterial) {
            this.selectedMaterials.push({
                is_new: true,
                product: newName,
                description: this.newMaterialDescription.trim(),
                quantity: this.materialQuantity
            });

            this.newMaterialName = '';
            this.newMaterialDescription = '';
            this.materialQuantity = null;
            return;
        }

        const existing = this.selectedMaterials.find(x => !x.is_new && x.id_equipment === this.materialSelected.id_equipment);

        if (existing) {
            existing.quantity = (existing.quantity ?? 0) + this.materialQuantity;
        } else {
            this.selectedMaterials.push({
                id_equipment: this.materialSelected.id_equipment,
                product: this.materialSelected.product,
                provider: this.materialSelected.provider,
                unit: this.materialSelected.unit,
                quantity: this.materialQuantity
            });
        }

        this.materialSelected = null;
        this.materialQuantity = null;
    }

    removeMaterial(index: number) {
        this.selectedMaterials.splice(index, 1);
    }

    saveTicket() {
        if (this.ticketForm.invalid) {
            this.utilsService.onWarn('Por favor, complete todos los campos requeridos.');
            return;
        }

        if (!this.selectedMaterials.length && !this.ticketForm.value.description) {
            this.utilsService.onWarn('Agregue al menos un material o una descripción.');
            return;
        }

        if (this.selectedMaterials.some(x => !x.quantity || x.quantity <= 0)) {
            this.utilsService.onWarn('La cantidad de cada material debe ser mayor a 0.');
            return;
        }

        const ticketData = {
            ...this.ticketForm.value,
            materials: this.selectedMaterials.map(x => x.is_new
                ? {
                    material_id: null,
                    other: x.product,
                    material_description: x.description || null,
                    quantity: x.quantity
                }
                : {
                    material_id: x.id_equipment,
                    other: null,
                    material_description: null,
                    quantity: x.quantity
                }),
            user: this.user_session?.user
        };

        if (this.ticketIdEdit) {
            this.updateTicket({ ...ticketData, id_management_technical: this.ticketIdEdit });
        } else {
            this.glpiService.saveTicketTechnical(ticketData).subscribe({
                next: () => {
                    this.utilsService.onSuccess('Ticket registrado exitosamente.');
                    this.router.navigate(['/tickets-tecnicos'])
                },
                error: (error: any) => {
                    console.log(error)
                    this.utilsService.onError(error?.error?.message ?? 'Error al crear el registro, por favor intente nuevamente');
                }
            })
        }
    }

    updateTicket(data: any) {
        this.glpiService.updateTicketTechnical(data).subscribe({
            next: () => {
                this.utilsService.onSuccess('Ticket actualizado exitosamente.');
                this.router.navigate(['/tickets-tecnicos'])
            },
            error: (error: any) => {
                console.log(error)
                this.utilsService.onError(error?.error?.message ?? 'Error al actualizar el registro, por favor intente nuevamente');
            }
        })
    }

    setTicketEdit(dataTicket: any) {
        this.ticketForm.patchValue({
            inspection_id: dataTicket?.id_inspection ?? this.ticketForm.value.inspection_id,
            description: dataTicket?.description ?? '',
        })

        this.codeManagement = dataTicket?.code_management ?? null;

        this.selectedMaterials = (dataTicket?.materials ?? []).map((x: any) => {
            if (!x.material_id) {
                return {
                    is_new: true,
                    product: x.other ?? '',
                    description: x.material_description ?? '',
                    quantity: x.quantity
                };
            }

            const material = this.materialsOptions.find(m => m.id_equipment === x.material_id);
            return {
                id_equipment: x.material_id,
                product: material?.product ?? `Material #${x.material_id}`,
                provider: material?.provider,
                unit: material?.unit,
                quantity: x.quantity
            };
        });
    }

}
