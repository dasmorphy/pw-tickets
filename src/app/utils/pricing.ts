// Precio de venta con margen sobre la venta (no sobre el costo):
//   PVP = costo / (1 - margen)      ganancia $ = PVP - costo
// Así la ganancia es el % indicado del PVP (30 % de margen => 30 % del precio de venta).

// El margen debe ser menor a 100 %: con 100 % el precio sería infinito
export const MAX_MARGIN_PERCENT = 99.99;

function round(value: number, decimals = 2): number {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Precio de venta y ganancia en $ a partir del costo y el margen (fracción: 0.3 = 30 %). */
export function priceFromMargin(basePrice: number, margin: number | null | undefined) {
    const rate = Math.min(Math.max(margin ?? 0, 0), MAX_MARGIN_PERCENT / 100);
    const price = round(basePrice / (1 - rate));
    return { price, profit_margin_dollar: round(price - basePrice) };
}
