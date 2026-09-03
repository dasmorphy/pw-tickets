import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MenuService } from 'src/app/services/menu.service';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { LogbookService } from 'src/app/services/logbook.service';
import { UserService } from 'src/app/services/user.service';
import { DialogModule } from 'primeng/dialog';
import { DispatchService } from 'src/app/services/dispatch.service';
import { TableModule } from 'primeng/table';
import { NgxTippyModule } from 'ngx-tippy-wrapper';
import { TagModule } from 'primeng/tag';
import { SplitButtonModule } from 'primeng/splitbutton';
import { forkJoin, catchError, of, Subscription } from 'rxjs';
import { EntryDetailsModalComponent } from '../../modals/entry-details-modal/entry-details-modal.component';
import { DispatchDetailsModalComponent } from '../../modals/dispatch-details-modal/dispatch-details-modal.component';
import { EventSourceService } from 'src/app/services/event-source.service';
import { UtilsService } from 'src/app/services/utils.service';
import { ImageGalleryComponent } from "../../modals/shared/preview-image/preview-image.component";

@Component({
    selector: 'app-biomar-dashboard',
    standalone: true,
    imports: [
    CommonModule,
    ButtonModule,
    AvatarModule,
    InputTextModule,
    DropdownModule,
    InputNumberModule,
    FormsModule,
    ReactiveFormsModule,
    ToastModule,
    ProgressSpinnerModule,
    DialogModule,
    NgxTippyModule,
    TableModule,
    TagModule,
    SplitButtonModule,
    EntryDetailsModalComponent,
    DispatchDetailsModalComponent,
    ImageGalleryComponent
],
    templateUrl: './biomar-dashboard.component.html',
    styleUrls: ['./biomar-dashboard.component.sass'],
})
export class BiomarDashboardComponent {
    private readonly menuService = inject(MenuService);
    private readonly logbookService = inject(LogbookService);
    private readonly dispatchService = inject(DispatchService);
    private readonly userService = inject(UserService);
    private readonly eventSourceService = inject(EventSourceService);
    private readonly utilsService = inject(UtilsService);

    private sseSub?: Subscription;
    private sseSubDispatch?: Subscription;

    toggle = computed(() => this.menuService.toggle());
    graphs = computed(() => this.dispatchService.graphsDispatch());
    entrySelected = computed(() => this.dispatchService.showModalSummaryEntry());
    dispatchSelected = computed(() => this.dispatchService.showModalSummary());
    openModalImages = computed(() => this.utilsService.showModalImage());

    user_session: any;
    isLoading: boolean = false;
    selectedDispatch: any = null;
    audio = new Audio('./assets/sound-notification.mp3');

    dataBiomar: any [] = [];

    items: any = [
        {
            label: 'Ver detalles',
            icon: 'pi pi-eye',
            command: () => this.viewDispatchDetails(this.selectedDispatch!)
        },
    ];

    ngOnInit() {
        this.user_session = this.userService.getDataSession();
        this.dispatchService.getGraphs()
        this.fetchAllData();
        this.sseSub = this.eventSourceService.connectEntries(0).subscribe({
            next: (data: any) => {
                console.log('SSE Entry Access:', data);
                this.audio.play().catch(err => {
                    console.warn('No se pudo reproducir el sonido:', err);
                });
                this.utilsService.onSuccess(`Se ha recibido un nuevo ingreso del área ${data?.entry?.area_name ?? 'N/A'}`)
                this.dataBiomar.unshift(data?.entry);
            },
            error: (err: any) => {
                console.error('Error SSE:', err);
            }
        });

        this.sseSubDispatch = this.eventSourceService.connectDispatch(0).subscribe({
            next: (data: any) => {
                console.log('SSE Dispatch:', data);
                this.audio.play().catch(err => {
                    console.warn('No se pudo reproducir el sonido:', err);
                });
                this.utilsService.onSuccess(`Se ha recibido un nuevo despacho`)
                this.dataBiomar.unshift(data?.dispatch);
            },
            error: (err: any) => {
                console.error('Error SSE:', err);
            }
        });
    }

    ngOnDestroy() {
        this.sseSub?.unsubscribe();
        this.sseSubDispatch?.unsubscribe();
    }

    getStatusStyles(statusName: string) {
        switch (statusName) {
            case 'En tránsito':
                return {
                    background: '#f3e178',
                    color: '#8a9019'
                };
            case 'Ingresado en bodega':
                return {
                    background: '#9df18a',
                    color: '#158308'
                };
            case 'Listo para despacho':
                return {
                    background: '#bfdaec',
                    color: '#3b6d89'
                };
            default:
                return {
                    background: '#F3F4F6',
                    color: '#374151'
                };
        }
    }

    fetchAllData() {
        forkJoin({
            entryAccess: this.dispatchService.getAllEntryAccess().pipe(catchError(() => of([]))),
            dispatchs: this.dispatchService.getAllDispatchs().pipe(catchError(() => of([])))
        }).subscribe({
            next: ({ entryAccess, dispatchs }: any) => {
                this.dataBiomar = [
                    ...(entryAccess?.data || []),
                    ...(dispatchs?.data || [])
                ].sort((a: any, b: any) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
            },
            error: (error: any) => {
                console.log(error);
            }
        });
    }


    getSeverity(status: string) {
        switch (status) {
        case "Ingresado en bodega":
            return 'success';
        case "En tránsito":
            return 'warning';
        case "Listo para despacho":
            return 'info';
        case "Finalizado":
            return 'success';
        case "Pendiente Salida":
            return 'warning';
        default:
            return 'info';
        }
    }


    optionsDispatch(loogbook: any) {
        this.selectedDispatch = loogbook
    }


    viewDispatchDetails(data: any) {
        if (data?.id_access_control) {
            this.dispatchService.openSummaryEntry(data);
        }else{
            this.dispatchService.openSummary(data);
        }
    }


}