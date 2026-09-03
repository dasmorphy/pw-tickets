import { Component, computed, effect, ElementRef, inject, Input, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MenuItem, SelectItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { Router } from '@angular/router';
import { MultiSelectModule } from 'primeng/multiselect';
import { CalendarModule } from 'primeng/calendar';
import { TimelineModule } from 'primeng/timeline';
import { SplitButtonModule } from 'primeng/splitbutton';
import { NgxTippyModule } from 'ngx-tippy-wrapper';
import { DashboardService } from 'src/app/services/dashboard.service';
import { UserService } from 'src/app/services/user.service';
import { validate } from 'uuid';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { LogbookService } from 'src/app/services/logbook.service';
import { UtilsService } from 'src/app/services/utils.service';
import { TabViewModule } from 'primeng/tabview';
import { LogbookDetailOutComponent } from '../../logbook/logbook-detail-out/logbook-detail-out.component';
import { LogbookDetailEntryComponent } from '../../logbook/logbook-detail-entry/logbook-detail-entry.component';

@Component({
    selector: 'app-logbook-details-modal',
    standalone: true,
    imports: [
        CommonModule,
        DialogModule,
        FormsModule,
        ButtonModule,
        ProgressSpinnerModule,
        ToastModule,
        DropdownModule,
        TableModule,
        InputTextModule,
        ReactiveFormsModule,
        TagModule,
        CalendarModule,
        MultiSelectModule,
        TimelineModule,
        SplitButtonModule,
        NgxTippyModule,
        TieredMenuModule,
        TabViewModule,
        LogbookDetailOutComponent,
        LogbookDetailEntryComponent
    ],
    templateUrl: './logbook-details-modal.component.html',
    styleUrls: ['./logbook-details-modal.component.sass']
})
export class LogBookDetailsModalComponent {
    @Input() showModal: boolean = false;

    public readonly logbookService = inject(LogbookService);

    logbookSelected = computed(() => this.logbookService.showModalSummary());

    closeModal() {
        this.logbookService.closeSummary();
    }
 
}