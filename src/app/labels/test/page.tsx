'use client';

import { useState } from 'react';
import type { LabelShipment, PrinterType } from '@/lib/labelGenerator';

// Sample test data
const sampleShipments: LabelShipment[] = [
    {
        shipmentId: 'KRS2510180278',
        buyerFullName: 'Theresa Nguyen',
        buyerAddress1: '835 W Sunnyside Ave Apt 307',
        buyerAddress2: '',
        buyerCity: 'Chicago',
        buyerState: 'IL',
        buyerZip: '60640',
        buyerCountry: 'United States',
        saleRecordNumber: '2194',
        clientCode: 'K0016794',
        totalWeight: 110,
        packageDesc: 'photocard, sticker, postcard',
        serviceName: 'PP',
    },
    {
        shipmentId: 'KRS2510180279',
        buyerFullName: 'John Smith',
        buyerAddress1: '123 Main Street',
        buyerAddress2: 'Suite 100',
        buyerCity: 'New York',
        buyerState: 'NY',
        buyerZip: '10001',
        buyerCountry: 'United States',
        saleRecordNumber: '2195',
        clientCode: 'K0016794',
        totalWeight: 250,
        packageDesc: 'album, photocards, poster',
        serviceName: 'EMS',
    },
    {
        shipmentId: 'KRS2510180280',
        buyerFullName: 'Emma Wilson',
        buyerAddress1: '456 Oak Avenue',
        buyerAddress2: '',
        buyerCity: 'Los Angeles',
        buyerState: 'CA',
        buyerZip: '90001',
        buyerCountry: 'United States',
        saleRecordNumber: '2196',
        clientCode: 'K0016794',
        totalWeight: 80,
        packageDesc: 'stickers, postcards',
        serviceName: 'PP',
    },
    {
        shipmentId: 'KRS2510180281',
        buyerFullName: 'Maria Garcia',
        buyerAddress1: '789 Pine Road',
        buyerAddress2: 'Apt 5B',
        buyerCity: 'Miami',
        buyerState: 'FL',
        buyerZip: '33101',
        buyerCountry: 'United States',
        saleRecordNumber: '2197',
        clientCode: 'K0016794',
        totalWeight: 320,
        packageDesc: 'lightstick, photobook',
        serviceName: 'EMS',
    },
    {
        shipmentId: 'KRS2510180282',
        buyerFullName: 'Yuki Tanaka',
        buyerAddress1: '1-2-3 Shibuya',
        buyerAddress2: 'Shibuya-ku',
        buyerCity: 'Tokyo',
        buyerState: '',
        buyerZip: '150-0002',
        buyerCountry: 'Japan',
        saleRecordNumber: '2198',
        clientCode: 'K0016794',
        totalWeight: 150,
        packageDesc: 'photocards, keychain',
        serviceName: 'K-Packet',
    },
];

export default function LabelTestPage() {
    const [printerType, setPrinterType] = useState<PrinterType>('Thermal');
    const [selectedCount, setSelectedCount] = useState<number>(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGeneratePreview = async () => {
        setIsGenerating(true);
        setError(null);
        setPreviewUrl(null);

        try {
            // Dynamic import to avoid SSR issues
            const { getLabelPDFDataUrl } = await import('@/lib/labelGenerator');

            const selectedShipments = sampleShipments.slice(0, selectedCount);
            const dataUrl = getLabelPDFDataUrl(selectedShipments, printerType);
            setPreviewUrl(dataUrl);
        } catch (err) {
            console.error('Error generating preview:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate preview');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = async () => {
        setIsGenerating(true);
        setError(null);

        try {
            // Dynamic import to avoid SSR issues
            const { downloadLabelPDF } = await import('@/lib/labelGenerator');

            const selectedShipments = sampleShipments.slice(0, selectedCount);
            downloadLabelPDF(selectedShipments, printerType);
        } catch (err) {
            console.error('Error downloading PDF:', err);
            setError(err instanceof Error ? err.message : 'Failed to download PDF');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-2">Label Generator Test</h1>
                <p className="text-gray-400 mb-8">
                    Test the shipping label generation functionality (Kurasi-style)
                </p>

                {/* Controls */}
                <div className="bg-gray-800 rounded-lg p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">Configuration</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Printer Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Printer Type
                            </label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="printerType"
                                        value="Thermal"
                                        checked={printerType === 'Thermal'}
                                        onChange={() => setPrinterType('Thermal')}
                                        className="w-4 h-4 text-blue-500"
                                    />
                                    <span>Thermal (A6 - 1 label/page)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="printerType"
                                        value="A4"
                                        checked={printerType === 'A4'}
                                        onChange={() => setPrinterType('A4')}
                                        className="w-4 h-4 text-blue-500"
                                    />
                                    <span>A4 (4 labels/page)</span>
                                </label>
                            </div>
                        </div>

                        {/* Number of Labels */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Number of Labels
                            </label>
                            <select
                                value={selectedCount}
                                onChange={(e) => setSelectedCount(Number(e.target.value))}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                            >
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <option key={n} value={n}>
                                        {n} label{n > 1 ? 's' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4 mt-6">
                        <button
                            onClick={handleGeneratePreview}
                            disabled={isGenerating}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                        >
                            {isGenerating ? 'Generating...' : 'Generate Preview'}
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={isGenerating}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                        >
                            {isGenerating ? 'Generating...' : 'Download PDF'}
                        </button>
                    </div>

                    {error && (
                        <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
                            {error}
                        </div>
                    )}
                </div>

                {/* Sample Data Preview */}
                <div className="bg-gray-800 rounded-lg p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">
                        Sample Shipments ({selectedCount} selected)
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="text-left py-2 px-3">Shipment ID</th>
                                    <th className="text-left py-2 px-3">Recipient</th>
                                    <th className="text-left py-2 px-3">City</th>
                                    <th className="text-left py-2 px-3">Country</th>
                                    <th className="text-left py-2 px-3">Service</th>
                                    <th className="text-left py-2 px-3">Weight</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sampleShipments.slice(0, selectedCount).map((shipment, idx) => (
                                    <tr
                                        key={shipment.shipmentId}
                                        className="border-b border-gray-700/50 hover:bg-gray-700/30"
                                    >
                                        <td className="py-2 px-3 font-mono text-blue-400">
                                            {shipment.shipmentId}
                                        </td>
                                        <td className="py-2 px-3">{shipment.buyerFullName}</td>
                                        <td className="py-2 px-3">{shipment.buyerCity}</td>
                                        <td className="py-2 px-3">{shipment.buyerCountry}</td>
                                        <td className="py-2 px-3">
                                            <span className="px-2 py-1 bg-purple-600/30 text-purple-300 rounded text-xs font-medium">
                                                {shipment.serviceName}
                                            </span>
                                        </td>
                                        <td className="py-2 px-3">{shipment.totalWeight}g</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* PDF Preview */}
                {previewUrl && (
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">PDF Preview</h2>
                        <div className="bg-white rounded-lg overflow-hidden">
                            <iframe
                                src={previewUrl}
                                className="w-full h-[800px]"
                                title="Label PDF Preview"
                            />
                        </div>
                    </div>
                )}

                {/* Usage Example */}
                <div className="bg-gray-800 rounded-lg p-6 mt-8">
                    <h2 className="text-xl font-semibold mb-4">Usage Example</h2>
                    <pre className="bg-gray-900 rounded-lg p-4 overflow-x-auto text-sm">
                        {`import { downloadLabelPDF, getLabelPDFDataUrl } from '@/lib/labelGenerator';
import type { LabelShipment } from '@/lib/labelGenerator';

// Your shipment data
const shipment: LabelShipment = {
  shipmentId: 'KRS2510180278',
  buyerFullName: 'Theresa Nguyen',
  buyerAddress1: '835 W Sunnyside Ave Apt 307',
  buyerAddress2: '',
  buyerCity: 'Chicago',
  buyerState: 'IL',
  buyerZip: '60640',
  buyerCountry: 'United States',
  saleRecordNumber: '2194',
  clientCode: 'K0016794',
  totalWeight: 110,
  packageDesc: 'photocard, sticker, postcard',
  serviceName: 'PP',
};

// Download PDF
downloadLabelPDF([shipment], 'Thermal');

// Or get data URL for preview
const dataUrl = getLabelPDFDataUrl([shipment], 'Thermal');`}
                    </pre>
                </div>
            </div>
        </div>
    );
}
