import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';

/**
 * Shipment data structure for label generation
 */
export interface LabelShipment {
    shipmentId: string;        // Unique tracking number (used for barcode + filename)
    buyerFullName: string;     // Recipient name
    buyerAddress1: string;     // Address line 1
    buyerAddress2?: string;    // Address line 2 (optional)
    buyerCity: string;         // City
    buyerState: string;        // State or province
    buyerZip: string;          // ZIP or postal code
    buyerCountry: string;      // Country
    saleRecordNumber?: string | number;  // Internal sale number
    clientCode?: string;       // Your account code
    totalWeight: number;       // Weight (grams)
    packageDesc: string;       // Short description
    serviceName: string;       // Service or shipping method (shows in top-right)
}

export type PrinterType = 'Thermal' | 'A4';

/**
 * Generate label PDF for shipments
 * Replicates Kurasi's exact label layout
 * 
 * @param shipments - Array of shipment objects
 * @param printerType - 'Thermal' (A6) or 'A4'
 * @param logoBase64 - Optional base64 encoded logo image
 * @returns The generated PDF document (can be used for preview or download)
 */
export function generateLabelPDF(
    shipments: LabelShipment[],
    printerType: PrinterType = 'Thermal',
    logoBase64?: string
): jsPDF {
    // Create document: A4 or A6 (thermal)
    const doc = printerType === 'A4'
        ? new jsPDF('p', 'mm', 'a4')
        : new jsPDF('p', 'mm', 'a6');

    // Label dimensions (A6 size: 105mm x 148mm)
    const labelWidth = 102;
    const labelHeight = 145;

    shipments.forEach((shipment, i) => {
        // For A4: 4 labels per page (2x2 grid), for Thermal: 1 label per page
        let position = i % 4;
        if (printerType === 'Thermal') position = 0;

        // Add new page if needed (for A4: every 4 labels, for Thermal: every label except first)
        if (i !== 0 && position === 0) {
            doc.addPage();
        }

        // Calculate offset based on position in 2x2 grid
        // n = horizontal offset, s = vertical offset
        const n = (position === 0 || position === 2) ? 0 : 105;
        const s = (position === 0 || position === 1) ? 0 : 148;

        // Margins
        const marginLeft = 4 + n;
        const marginTop = 4 + s;

        // Generate barcode on canvas
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, shipment.shipmentId, {
            displayValue: true,
            width: 2,
            height: 50,
            margin: 5,
            fontSize: 16,
            font: 'monospace',
            textMargin: 3,
        });

        // Draw border
        doc.setDrawColor(0);
        doc.setLineWidth(0.8);
        doc.rect(2 + n, 2 + s, labelWidth, labelHeight);

        // ============ HEADER SECTION ============
        // Logo - draw text logo or use provided image
        if (logoBase64) {
            try {
                doc.addImage(logoBase64, 'PNG', marginLeft + 8, marginTop + 6, 35, 12);
            } catch (e) {
                console.warn('Failed to add logo:', e);
                drawKurasiLogo(doc, marginLeft + 8, marginTop + 14);
            }
        } else {
            drawKurasiLogo(doc, marginLeft + 8, marginTop + 14);
        }

        // Service name in top-right (large, blue)
        doc.setTextColor(0, 120, 180);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(28);
        doc.text(shipment.serviceName, 95 + n, marginTop + 16, { align: 'right' });
        doc.setTextColor(0, 0, 0);

        // ============ SHIP TO SECTION ============
        // "Ship To" centered header
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        const centerX = 53 + n;
        doc.text('Ship To', centerX, 38 + s, { align: 'center' });

        // Recipient name (bold)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(shipment.buyerFullName, marginLeft + 8, 48 + s);

        // Address lines
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);

        let yPos = 56 + s;
        const lineHeight = 6;
        const maxWidth = 85;

        // Address line 1
        const address1Lines = doc.splitTextToSize(shipment.buyerAddress1, maxWidth);
        address1Lines.forEach((line: string) => {
            doc.text(line, marginLeft + 8, yPos);
            yPos += lineHeight;
        });

        // Address line 2 (if exists)
        if (shipment.buyerAddress2 && shipment.buyerAddress2.trim()) {
            const address2Lines = doc.splitTextToSize(shipment.buyerAddress2, maxWidth);
            address2Lines.forEach((line: string) => {
                doc.text(line, marginLeft + 8, yPos);
                yPos += lineHeight;
            });
        }

        // City, State, Zip (no comma, matching Kurasi style)
        const cityStateZip = shipment.buyerState
            ? `${shipment.buyerCity} ${shipment.buyerState} ${shipment.buyerZip}`
            : `${shipment.buyerCity} ${shipment.buyerZip}`;
        doc.text(cityStateZip, marginLeft + 8, yPos);
        yPos += lineHeight;

        // Country
        doc.text(shipment.buyerCountry, marginLeft + 8, yPos);

        // ============ BARCODE SECTION ============
        const barcodeDataUrl = canvas.toDataURL('image/png');
        const barcodeY = 88 + s;
        doc.addImage(barcodeDataUrl, 'PNG', marginLeft + 4, barcodeY, 90, 28);

        // ============ BOTTOM INFO SECTION ============
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);

        let bottomY = 124 + s;
        const bottomLineHeight = 5;

        // Sale record number (just the number, no label)
        if (shipment.saleRecordNumber) {
            doc.text(String(shipment.saleRecordNumber), marginLeft + 8, bottomY);
            bottomY += bottomLineHeight;
        }

        // Client code
        if (shipment.clientCode) {
            doc.text(shipment.clientCode, marginLeft + 8, bottomY);
            bottomY += bottomLineHeight;
        }

        // Weight with "g." suffix
        doc.text(`${shipment.totalWeight} g.`, marginLeft + 8, bottomY);
        bottomY += bottomLineHeight + 2;

        // Product description
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const descLines = doc.splitTextToSize(`Product Description: ${shipment.packageDesc}`, 85);
        doc.text(descLines, marginLeft + 8, bottomY);
    });

    return doc;
}

/**
 * Draw Kurasi-style text logo
 */
function drawKurasiLogo(doc: jsPDF, x: number, y: number): void {
    // Draw icon part (stylized triangle/arrow)
    doc.setFillColor(0, 120, 180);
    // Simple triangle approximation for the icon
    doc.triangle(x - 2, y - 2, x + 6, y - 8, x + 6, y + 4, 'F');

    // Draw "kurasi" text in blue
    doc.setTextColor(0, 120, 180);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('kurasi', x + 10, y);
    doc.setTextColor(0, 0, 0);
}

/**
 * Generate and download label PDF
 */
export function downloadLabelPDF(
    shipments: LabelShipment[],
    printerType: PrinterType = 'Thermal',
    logoBase64?: string
): void {
    const doc = generateLabelPDF(shipments, printerType, logoBase64);

    // Generate filename
    const fileName = shipments.length === 1
        ? `${shipments[0].shipmentId}.pdf`
        : `labels_${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}.pdf`;

    doc.save(fileName);
}

/**
 * Get PDF as data URL (for preview)
 */
export function getLabelPDFDataUrl(
    shipments: LabelShipment[],
    printerType: PrinterType = 'Thermal',
    logoBase64?: string
): string {
    const doc = generateLabelPDF(shipments, printerType, logoBase64);
    return doc.output('dataurlstring');
}

/**
 * Get PDF as Blob (for custom handling)
 */
export function getLabelPDFBlob(
    shipments: LabelShipment[],
    printerType: PrinterType = 'Thermal',
    logoBase64?: string
): Blob {
    const doc = generateLabelPDF(shipments, printerType, logoBase64);
    return doc.output('blob');
}
