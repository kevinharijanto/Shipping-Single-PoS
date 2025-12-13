// src/lib/feeCalculator.ts
/**
 * Calculate local handling fee based on weight and destination country.
 * 
 * Logic:
 * - Weight brackets: 0-1500g = tier 1, 1501-2500g = tier 2, 2501-3500g = tier 3, etc.
 * - Base rate: 10,000 IDR per tier
 * - USA surcharge: +10,000 IDR
 * 
 * @param weightGrams Package weight in grams
 * @param buyerCountry ISO-2 country code (e.g., "US", "DE")
 * @returns Fee in IDR minor units (e.g., 10000 = Rp 10.000)
 */
export function calculateFee(weightGrams: number, buyerCountry: string): number {
    if (!weightGrams || weightGrams <= 0) return 0;

    // Calculate tier: 0-1500g = tier 1, 1501-2500g = tier 2, etc.
    let tier: number;
    if (weightGrams <= 1500) {
        tier = 1;
    } else {
        tier = 1 + Math.ceil((weightGrams - 1500) / 1000);
    }

    // Base fee: tier × 10,000 IDR
    let fee = tier * 10000;

    // USA surcharge
    if (buyerCountry === "US") {
        fee += 10000;
    }

    return fee;
}

/**
 * Format fee as IDR currency string
 */
export function formatFee(feeMinor: number | null | undefined): string {
    if (feeMinor === null || feeMinor === undefined) return "-";
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(feeMinor);
}
