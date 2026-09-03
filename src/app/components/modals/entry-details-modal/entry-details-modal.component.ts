import { Component, computed, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { DispatchService } from 'src/app/services/dispatch.service';
import { TableModule } from 'primeng/table';

@Component({
    selector: 'app-entry-details-modal',
    standalone: true,
    imports: [
        CommonModule,
        DialogModule,
        ButtonModule,
        ProgressSpinnerModule,
        InputTextModule,
        TableModule
    ],
    templateUrl: './entry-details-modal.component.html',
    styleUrls: ['./entry-details-modal.component.sass']
})
export class EntryDetailsModalComponent {
    @Input() showModal: any;

    public readonly dispatchService = inject(DispatchService);

    entrySelected = computed(() => this.dispatchService.showModalSummaryEntry());

    entryImages = computed(() => 
        (this.entrySelected()?.images || []).filter(img => img.type_process === 'entry')
    );

    outImages = computed(() => 
        (this.entrySelected()?.images || []).filter(img => img.type_process === 'out')
    );

    closeModal() {
        this.dispatchService.closeSummaryEntry();
    }
 
}