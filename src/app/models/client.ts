export interface ClientCompany {
    id_company: number;
    company_name: string | null;
    type_document: string | null;
    identity: string | null;
    created_by: string | null;
    created_at: string | null;
}

export interface Client {
    id_client: number;
    name: string;
    client_company_id: number | null;
    client_company: ClientCompany | null;
    created_by: string | null;
    updated_by: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface NewClientCompany {
    company_name: string;
    type_document: string;
    identity: string;
}

export interface NewClient {
    name: string;
    client_company_id: number | null;
    client_company: NewClientCompany | null;
    user: string;
}
