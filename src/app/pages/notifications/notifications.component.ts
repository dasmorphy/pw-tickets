import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { InputTextModule } from "primeng/inputtext";
import { PaginatorModule } from "primeng/paginator";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { SelectButtonModule } from "primeng/selectbutton";
import { TagModule } from "primeng/tag";
import { TooltipModule } from "primeng/tooltip";
import { NotificationFilter, NotificationItem } from "src/app/models/notification";
import { NotificationService } from "src/app/services/notification.service";

@Component({
    selector: 'app-notifications',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        CardModule,
        InputTextModule,
        PaginatorModule,
        ProgressSpinnerModule,
        SelectButtonModule,
        TagModule,
        TooltipModule
    ],
    templateUrl: './notifications.component.html',
    styleUrls: ['./notifications.component.sass'],
})
export class NotificationsComponent implements OnInit {
    public readonly notificationService = inject(NotificationService);
    private readonly route = inject(ActivatedRoute);

    filterOptions: any[] = [
        { label: 'Todas', value: 'all' },
        { label: 'No leídas', value: 'unread' },
        { label: 'Leídas', value: 'read' }
    ];

    selectedFilter = signal<NotificationFilter>('all');
    search = signal<string>('');
    first = signal<number>(0);
    rows: number = 10;

    /** Notificación que llega resaltada desde el panel de la campana */
    highlightId = signal<string | null>(null);

    filteredNotifications = computed(() => {
        const filter = this.selectedFilter();
        const term = this.search().trim().toLowerCase();

        return this.notificationService.notifications().filter((notification) => {
            const matchFilter =
                filter === 'all' ||
                (filter === 'unread' && !notification.is_read) ||
                (filter === 'read' && notification.is_read);

            if (!matchFilter) {
                return false;
            }

            if (!term) {
                return true;
            }

            return `${notification.title} ${notification.body}`.toLowerCase().includes(term);
        });
    });

    pagedNotifications = computed(() =>
        this.filteredNotifications().slice(this.first(), this.first() + this.rows)
    );

    ngOnInit() {
        this.highlightId.set(this.route.snapshot.queryParamMap.get('id'));
        // Reutiliza la caché local, solo consulta si está vencida o vacía
        this.notificationService.loadNotifications();
    }

    changeFilter(value: NotificationFilter) {
        this.selectedFilter.set(value ?? 'all');
        this.first.set(0);
    }

    onSearch(value: string) {
        this.search.set(value ?? '');
        this.first.set(0);
    }

    onPageChange(event: any) {
        this.first.set(event.first);
        this.rows = event.rows;
    }

    reloadNotifications() {
        this.notificationService.loadNotifications(true);
        this.first.set(0);
    }

    markAllAsRead() {
        this.notificationService.markAllAsRead();
    }

    toggleRead(notification: NotificationItem, event: any) {
        event?.stopPropagation?.();
        this.notificationService.markAsRead(notification);
    }

    deleteNotification(notification: NotificationItem, event: any) {
        event?.stopPropagation?.();
        this.notificationService.deleteNotification(notification);
    }

    selectNotification(notification: NotificationItem) {
        this.highlightId.set(notification.id_notification);
        this.notificationService.markAsRead(notification);
    }

    formatType(notification_type: string): string {
        if (!notification_type) {
            return 'General';
        }

        const text = notification_type.replace(/_/g, ' ').toLowerCase();
        return text.charAt(0).toUpperCase() + text.slice(1);
    }
}
