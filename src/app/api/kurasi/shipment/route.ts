import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Get order details with related data
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        buyer: true,
        package: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Get Kurasi auth token from environment or cookies
    let authToken = process.env.KURASI_TOKEN || process.env.X_SHIP_AUTH_TOKEN || '89068218-5dec-47b7-9e91-a582ac0836f1';
    
    // If not in env, try to get from cookies
    if (!authToken) {
      const cookies = request.cookies;
      const kurasiCookie = cookies.get('kurasi_auth_token');
      if (kurasiCookie) {
        authToken = kurasiCookie.value;
      }
    }

    if (!authToken) {
      return NextResponse.json(
        { error: "Kurasi auth token not found" },
        { status: 401 }
      );
    }

    // Prepare shipment data for Kurasi API
    const shipmentData = {
      buyerFullName: order.buyer.buyerFullName,
      buyerAddress1: order.buyer.buyerAddress1,
      buyerAddress2: order.buyer.buyerAddress2 || "",
      buyerCity: order.buyer.buyerCity,
      buyerState: order.buyer.buyerState,
      buyerZip: order.buyer.buyerZip,
      buyerCountry: order.buyer.buyerCountry,
      buyerPhone: order.buyer.buyerPhone,
      serviceName: order.package.service.toUpperCase(), // Convert to uppercase
      packageDesc: "Package", // Default description
      saleRecordNumber: order.buyer.saleRecordNumber,
      totalWeight: order.package.weightGrams?.toString() || "100",
      totalValue: order.quotedAmountMinor ? order.quotedAmountMinor / 100 : 7,
      currency: order.currency || "USD",
      phoneCode: order.buyer.phoneCode || "1",
      hsCode: (order.package as any).hsCode || "",
      shipmentRemark: order.notes || "",
      companyName: "",
      buyerEmail: "",
      isNoPhone: false,
      shipmentCategory: "M",
      collectTaxId: [],
      valueAddedServiceInsurance: [],
      valueAddedServiceSignature: [],
      contentItem: [
        {
          description: "Package",
          quantity: "1",
          value: order.quotedAmountMinor ? (order.quotedAmountMinor / 100).toString() : "7",
          itemWeight: order.package.weightGrams?.toString() || "100",
          currency: order.currency || "USD",
          sku: (order.package as any).sku || "",
          hsCode: (order.package as any).hsCode || "490900",
          countryOfOrigin: (order.package as any).countryOfOrigin || "ID",
        },
      ],
      saleChannel: "",
      ioss: "",
      iossCheck: false,
    };

    // Log the payload being sent to Kurasi
    console.log("Kurasi shipment payload:", JSON.stringify(shipmentData, null, 2));
    
    // Make API call to Kurasi
    const response = await axios.post(
      "https://api.kurasi.app/api/v1/createShipment",
      shipmentData,
      {
        headers: {
          accept: "application/json, text/plain, */*, text/csv",
          "content-type": "application/json; charset=UTF-8",
          origin: "https://kurasi.app",
          referer: "https://kurasi.app/",
          "x-requested-with": "XMLHttpRequest",
          "x-ship-auth-token": authToken,
        },
      }
    );

    // Extract tracking number from response
    const trackingNumber = response.data.kurasiShipmentId || response.data.trackingNumber;

    if (!trackingNumber) {
      return NextResponse.json(
        { error: "No tracking number received from Kurasi" },
        { status: 500 }
      );
    }

    // Update order with tracking number
    await prisma.order.update({
      where: { id: orderId },
      data: {
        krsTrackingNumber: trackingNumber,
        deliveryStatus: "label_confirmed",
      } as any,
    });

    return NextResponse.json({
      success: true,
      trackingNumber,
      shipmentData: response.data,
    });
  } catch (error: any) {
    console.error("Error creating Kurasi shipment:", error);
    
    // Provide more detailed error information
    let errorMessage = "Failed to create shipment";
    if (error.response) {
      errorMessage = `Kurasi API error: ${error.response.data?.message || error.response.statusText}`;
    } else if (error.request) {
      errorMessage = "No response from Kurasi API";
    } else {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}