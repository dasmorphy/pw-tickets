export interface Provider {
    id_provider: number;
    name: string;
    ruc: string | null;
    seller: string | null;
    status: string | null;
}

export interface Material {
    id_equipment: number;
    code: string | null;
    product: string | null;
    model: string | null;
    provider: string | null;
    description: string | null;
    unit: string | null;
    stock: number | null;
    base_price: number | null;
    profit_margin: number | null;
    profit_margin_dollar: number | null;
    price: number | null;
    provider_id: number | null;
    images?: MaterialImage[];
    created_at: string | null;
    created_by: string | null;
    updated_at: string | null;
    updated_by: string | null;
}

export interface MaterialImage {
    id_image: number;
    image_path: string;
}