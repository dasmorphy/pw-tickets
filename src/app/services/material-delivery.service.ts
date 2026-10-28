import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment.development";

// Producto nuevo (del registro técnico o de la proforma) que aún no existe en el catálogo
export interface PendingMaterialInfo {
    id_pending_material: number;
    // 'Pendiente' | 'Creado' | 'Eliminado de proforma'
    status: string;
    name_material: string | null;
    description: string | null;
    model: string | null;
    quantity: number;
    base_price: number | null;
    profit_margin: number | null;
    profit_margin_dollar: number | null;
}

// Fila de la lista de productos pendientes de logística
export interface PendingMaterialRow extends PendingMaterialInfo {
    // 'Técnico': nació en el registro técnico; 'Proforma': lo agregó el comercial
    origin: string;
    inspection_id: number;
    inspection_code: string | null;
    title_ticket: string | null;
    client_name: string | null;
    material_tech_ticket_id: number | null;
    // null mientras la proforma no se apruebe
    quote_id: number | null;
    quote_number: string | null;
    quotation_item_id: number | null;
    material_id: number | null;
    created_at: string;
    created_by: string | null;
    resolved_at: string | null;
    resolved_by: string | null;
}

// Línea de la proforma a entregar: un ítem o un componente de "Materiales varios"
export interface ProjectMaterial {
    // Clave estable de la línea: item-{id} o additional-{id}
    key: string;
    quotation_item_id: number | null;
    additional_material_id: number | null;
    // null mientras el producto nuevo no se cree en el catálogo
    material_id: number | null;
    product: string;
    model: string | null;
    code: string | null;
    unit: string | null;
    // Cantidad aprobada en la proforma
    quantity: number;
    delivered: number;
    pending: number;
    // null cuando el producto aún no existe en el catálogo
    stock: number | null;
    is_new: boolean;
    // Ítem "Materiales varios" del que proviene el material
    group: string | null;
    pending_material: PendingMaterialInfo | null;
}

export interface DeliveryItem {
    key: string;
    material_id: number | null;
    pending_material_id: number | null;
    quantity: number;
}

export interface MaterialDelivery {
    id_delivery: number;
    technician: string;
    technician_name: string;
    delivered_by: string;
    created_at: string;
    observations: string | null;
    status: string;
    items: DeliveryItem[];
}

export interface ProjectTechnician {
    user: string;
    fullname_user: string;
}

export interface ProjectMaterialsResponse {
    project_id: number;
    quote_id: number;
    proforma_code: string | null;
    technicians: ProjectTechnician[];
    materials: ProjectMaterial[];
    deliveries: MaterialDelivery[];
}

export interface SaveDeliveryPayload {
    task_id: number;
    delivered_to: string;
    observation: string | null;
    items: {
        quotation_item_id: number | null;
        additional_material_id: number | null;
        // Solo enteros: el stock del catálogo es entero
        quantity: number;
    }[];
    user: string;
}

export interface ResolvePendingPayload {
    product: string;
    code: string | null;
    model: string | null;
    unit: string | null;
    description: string | null;
    provider_id: number | null;
    base_price: number | null;
    // Fracción: 30 % -> 0.3
    profit_margin: number | null;
    profit_margin_dollar: number | null;
    price: number | null;
    // Stock recibido; mínimo la cantidad de la proforma aprobada (0 si aún no tiene)
    stock: number;
    user: string;
}

@Injectable({
    providedIn: 'root'
})
export class MaterialDeliveryService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiTicket}/rest/proxy-glpi-api/v1.0`;

    getProjectMaterials(projectId: number): Observable<{ data: ProjectMaterialsResponse }> {
        return this.http.get<{ data: ProjectMaterialsResponse }>(`${this.baseUrl}/project-materials/${projectId}`);
    }

    saveDelivery(data: SaveDeliveryPayload): Observable<{ message: string; data: { id_history: number } }> {
        return this.http.post<{ message: string; data: { id_history: number } }>(`${this.baseUrl}/material-delivery`, { data });
    }

    getPendingMaterials(filters?: { quote_id?: number; inspection_id?: number; status?: string }): Observable<{ data: PendingMaterialRow[] }> {
        let params = new HttpParams();
        if (filters?.quote_id != null) {
            params = params.set('quote_id', filters.quote_id);
        }
        if (filters?.inspection_id != null) {
            params = params.set('inspection_id', filters.inspection_id);
        }
        if (filters?.status) {
            params = params.set('status', filters.status);
        }
        return this.http.get<{ data: PendingMaterialRow[] }>(`${this.baseUrl}/pending-material`, { params });
    }

    resolvePendingMaterial(idPendingMaterial: number, data: ResolvePendingPayload): Observable<{ message: string; data: { id_equipment: number } }> {
        return this.http.post<{ message: string; data: { id_equipment: number } }>(
            `${this.baseUrl}/pending-material/${idPendingMaterial}/resolve`,
            { data }
        );
    }
}
