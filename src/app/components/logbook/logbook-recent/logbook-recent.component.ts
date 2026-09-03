import { CommonModule } from "@angular/common";
import { Component, computed, inject, OnDestroy, OnInit } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { AvatarModule } from "primeng/avatar";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { DropdownModule } from "primeng/dropdown";
import { InputNumberModule } from "primeng/inputnumber";
import { InputTextModule } from "primeng/inputtext";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { EventSourceService } from "src/app/services/event-source.service";
import { LogbookService } from "src/app/services/logbook.service";
import { UtilsService } from "src/app/services/utils.service";
import { LogBookDetailsModalComponent } from "../../modals/logbook-details-modal/logbook-details-modal.component";
import { filter, Subscription } from "rxjs";
import { AuthService } from "src/app/services/auth.service";
import { UserService } from "src/app/services/user.service";

@Component({
    selector: 'app-logbook-recent',
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
        ProgressSpinnerModule,
        DialogModule,
        LogBookDetailsModalComponent
    ],
    templateUrl: './logbook-recent.component.html',
    styleUrls: ['./logbook-recent.component.sass'],
})

export class LogbookRecentComponent implements OnInit, OnDestroy {
    private readonly logbookService = inject(LogbookService);
    private readonly eventSourceService = inject(EventSourceService);
    private readonly utilsService = inject(UtilsService);
    private readonly authService = inject(AuthService);
    private readonly userService = inject(UserService);

    logbookSelected = computed(() => this.logbookService.showModalSummary());
    user_permissions_signal = computed(() => this.authService.user_permissions_signal());

    private sseSub?: Subscription;

    dataHistory: any = [];
    dataComplete: any[] = [];
    user_session: any;
    // showDetail: boolean = false;
    isLoading: boolean = false;
    log_selected: any;
    audio = new Audio('./assets/sound-notification.mp3');

    ngOnInit() {
        this.fetchHistoryLogbook();

        this.sseSub = this.eventSourceService.connect(0).subscribe({
            next: (data: any) => {
                this.audio.play().catch(err => {
                    console.warn('No se pudo reproducir el sonido:', err);
                });
                this.utilsService.onSuccess(`Se ha recibido una nueva bitácora de la finca ${data?.logbook?.group_name ?? 'N/A'}`)
                const dataLogbook = data?.logbook;
                if (dataLogbook) {
                    dataLogbook?.id_logbook_out ? data.logbook.record_type = "out" : data.logbook.record_type = "entry"
                }
                this.dataComplete.unshift(data?.logbook);
                this.dataHistory = this.mapHistory(this.dataComplete).slice(0, 5);

            },
            error: (err: any) => {
                console.error('Error SSE:', err);
            }
        });
    }

    ngOnDestroy() {
        this.sseSub?.unsubscribe();
    }


    fetchHistoryLogbook() {
        this.isLoading = true;
        const headers: any = {}
        this.user_session = this.userService.getDataSession();
        const attributes = this.user_session?.attributes
        const today = new Date();

        // Función para formatear
        const formatDate = (date: any) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            return `${year}-${month}-${day}T00:00:00`;
        };

        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        const filters: any = {
            start_date: formatDate(today),
            end_date: formatDate(tomorrow),
        };

        if (this.user_session?.role !== 'admin') {
            headers['user'] = this.user_session?.user
            filters.user = this.user_session?.user
        }

        if (this.user_permissions_signal().includes('DATA_BY_GROUP_BUSINESS')) {
            filters.groups_business_id = attributes?.group_business?.toString()
        }

        if (this.user_permissions_signal().includes('DATA_BY_SECTOR')) {
            filters.sectors = attributes?.sector?.join(',') || '';
        }

        this.logbookService.getHistoryLogbook(filters).subscribe({
            next: (data: any) => {
                this.isLoading = false;
                this.dataComplete = data?.data;
                this.dataHistory = this.mapHistory(this.dataComplete).slice(0, 5);
            },
            error: (error: any) => {
                this.isLoading = false;
                console.log(error)
            }
        })
    }

    reloadHistoryLogbook() {
        this.fetchHistoryLogbook();
    }


    onSearch(event: Event) {
        const value = (event.target as HTMLInputElement).value.toLowerCase().trim();

        if (!value) {
            // si no hay búsqueda, vuelve a mostrar los últimos 5
            this.dataHistory = this.mapHistory(this.dataComplete).slice(0, 5);
            return;
        }

        const filtered = this.dataComplete.filter((item: any) => {
            return (
                item.shipping_guide?.toLowerCase().includes(value) ||
                item.group_name?.toLowerCase().includes(value) ||
                item.created_by?.toLowerCase().includes(value) ||
                item.truck_license?.toLowerCase().includes(value) ||
                item.name_category?.toLowerCase().includes(value)
            );
        });

        this.dataHistory = this.mapHistory(filtered);
    }

    mapHistory(data: any[]) {
        return data.map((item: any) => {
            return {
                user: item.created_by,
                id: item.record_id,
                guide: item.shipping_guide,
                name_category: item.name_category,
                type: item.record_type === 'entry' ? 'entrada' : 'salida',
                group: item.group_name,
                truck_license: item.truck_license,
                date: item.created_at
            };
        });
    }



    viewLogbookDetails(log: any) {
        const log_found = this.dataComplete.find(
            (item: any) => item.record_id === log.id
        );
        
        this.log_selected = log_found;
        this.logbookService.openSummary(log_found);
    }    
}