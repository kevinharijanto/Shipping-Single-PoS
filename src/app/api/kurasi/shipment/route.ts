import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import axios from "axios";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";

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

    // Get Kurasi auth token from cookies (same approach as other Kurasi APIs)
    const cookieStore = await cookies();
    const authToken = cookieStore.get("kurasi_token")?.value || "";

    if (!authToken) {
      console.error("Kurasi auth token not found in cookies");
      return NextResponse.json(
        { error: "Kurasi auth token not found. Please log in at /kurasi first." },
        { status: 401 }
      );
    }

    console.log("Using auth token from cookie:", authToken ? `${authToken.slice(0, 6)}…${authToken.slice(-4)}` : "null");

    // Update order status to submitted_to_Kurasi first
    await prisma.order.update({
      where: { id: orderId },
      data: { deliveryStatus: "submitted_to_Kurasi" } as any,
    });

    // Prepare shipment data for Kurasi API
    const rawService = (order.package.service || "").toUpperCase();
    const ALLOWED_SERVICES = ["EP", "ES", "EX", "PP"] as const;
    const serviceName = ALLOWED_SERVICES.find(code => rawService.startsWith(code)) ?? "EX";
    const isExpress = serviceName === "EX";

    const countryHintRaw = (order.buyer.buyerCountry || "").toUpperCase();
    const defaultCountry: CountryCode | undefined = /^[A-Z]{2}$/.test(countryHintRaw) ? (countryHintRaw as CountryCode) : undefined;

    const parsedPhone = order.buyer.buyerPhone
      ? parsePhoneNumberFromString(
        order.buyer.buyerPhone,
        defaultCountry ? { defaultCountry } : undefined
      )
      : null;

    const buyerPhoneNational = parsedPhone && parsedPhone.isValid()
      ? parsedPhone.nationalNumber
      : (order.buyer.buyerPhone || "").replace(/\D/g, "");

    const phoneCodeDigits = (() => {
      const pcRaw = parsedPhone && parsedPhone.isValid() ? String(parsedPhone.countryCallingCode) : "";
      return String(pcRaw || "").replace(/^\+/, "").replace(/\D/g, "") || "1";
    })();

    const shipmentData = {
      buyerFullName: order.buyer.buyerFullName,
      buyerAddress1: order.buyer.buyerAddress1,
      buyerAddress2: order.buyer.buyerAddress2 || "",
      buyerCity: order.buyer.buyerCity,
      buyerState: order.buyer.buyerState,
      buyerZip: order.buyer.buyerZip,
      buyerCountry: order.buyer.buyerCountry,
      buyerPhone: buyerPhoneNational,
      serviceName: serviceName,
      packageDesc: order.package.packageDescription || "Package",
      saleRecordNumber: order.srnId?.toString() || "",
      totalWeight: order.package.weightGrams?.toString() || "100",
      // totalValue: number for Express, string for non-Express
      totalValue: isExpress ? (Number(order.package.totalValue) || 7) : String(Number(order.package.totalValue) || 7),
      currency: order.package.currency || "USD",
      phoneCode: phoneCodeDigits,
      // hsCode: empty for Express, default/value for non-Express
      hsCode: isExpress ? "" : (order.package.hsCode || "490900"),
      shipmentRemark: order.notes || "",
      companyName: "",
      buyerEmail: order.buyer.buyerEmail || "",
      isNoPhone: false,
      shipmentCategory: "M",
      collectTaxId: [],
      valueAddedServiceInsurance: [],
      valueAddedServiceSignature: [],
      // contentItem: one item for Express, empty array for non-Express
      contentItem: isExpress
        ? [
          {
            description: order.package.packageDescription || "Package",
            quantity: "1",
            value: String(Number(order.package.totalValue) || 7),
            itemWeight: order.package.weightGrams?.toString() || "100",
            currency: order.package.currency || "USD",
            sku: order.package.sku || "",
            hsCode: order.package.hsCode || "490900",
            countryOfOrigin: order.package.countryOfOrigin || "ID",
          },
        ]
        : [],
      saleChannel: order.saleChannel || "",
      ioss: "",
      iossCheck: false,
    };

    // Log the payload being sent to Kurasi
    console.log("Kurasi shipment payload:", JSON.stringify(shipmentData, null, 2));

    // Prepare headers for Kurasi API
    const headers = {
      accept: "application/json, text/plain, */*, text/csv",
      "content-type": "application/json; charset=UTF-8",
      origin: "https://kurasi.app",
      referer: "https://kurasi.app/",
      "x-requested-with": "XMLHttpRequest",
      "x-ship-auth-token": authToken,
    };

    console.log("Kurasi API headers:", JSON.stringify(headers, null, 2));

    // Make API call to Kurasi
    const response = await axios.post(
      "https://api.kurasi.app/api/v1/createShipment",
      shipmentData,
      { headers }
    );

    // Extract KRS number from response
    const krsNumber = response.data.data?.shipmentId;

    if (!krsNumber) {
      console.error("No KRS number in Kurasi response:", JSON.stringify(response.data, null, 2));
      return NextResponse.json(
        {
          error: "No KRS number received from Kurasi",
          details: {
            response: response.data,
            message: "Kurasi API response does not contain a shipmentId"
          }
        },
        { status: 500 }
      );
    }

    // Update order with KRS tracking number (keep status as submitted_to_Kurasi)
    await prisma.order.update({
      where: { id: orderId },
      data: {
        krsTrackingNumber: krsNumber,
        // deliveryStatus remains "submitted_to_Kurasi" until manually updated
      } as any,
    });

    // Also update the SRN record with the KRS number
    if (order.srnId) {
      await prisma.buyerSRN.update({
        where: { saleRecordNumber: order.srnId },
        data: {
          kurasiShipmentId: krsNumber,
        },
      });
    }

    return NextResponse.json({
      success: true,
      krsNumber,
      shipmentData: response.data,
    });
  } catch (error: any) {
    console.error("Error creating Kurasi shipment:", error);

    // Provide more detailed error information
    let errorMessage = "Failed to create shipment";
    let errorDetails: any = null;

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      errorMessage = `Kurasi API error: ${error.response.status} ${error.response.statusText}`;
      errorDetails = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      };
      console.error("Kurasi API error response:", JSON.stringify(errorDetails, null, 2));
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = "No response from Kurasi API";
      errorDetails = { request: error.request };
      console.error("No response from Kurasi API:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = error.message;
      errorDetails = { message: error.message, stack: error.stack };
      console.error("Request setup error:", error.message);
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails
      },
      { status: 500 }
    );
  }
}