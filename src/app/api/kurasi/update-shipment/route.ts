import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
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

    if (!order.krsTrackingNumber) {
      return NextResponse.json(
        { error: "No KRS tracking number found for this order" },
        { status: 400 }
      );
    }

    // Get Kurasi auth token from cookies
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

    // Prepare headers for Kurasi API
    const headers = {
      accept: "application/json, text/plain, */*, text/csv",
      "content-type": "application/json; charset=UTF-8",
      origin: "https://kurasi.app",
      referer: "https://kurasi.app/",
      "x-requested-with": "XMLHttpRequest",
      "x-ship-auth-token": authToken,
    };
    
    console.log("Kurasi update API headers:", JSON.stringify(headers, null, 2));

    // Prepare update shipment data for Kurasi API
    const updateData = {
      shipmentId: order.krsTrackingNumber,
      pickupId: null,
      clientCode: "K0016794", // You may need to make this configurable
      buyerFullName: order.buyer.buyerFullName,
      buyerAddress1: order.buyer.buyerAddress1,
      buyerAddress2: order.buyer.buyerAddress2 || "",
      buyerCity: order.buyer.buyerCity,
      buyerState: order.buyer.buyerState,
      buyerZip: order.buyer.buyerZip,
      buyerCountry: order.buyer.buyerCountry,
      buyerPhone: order.buyer.buyerPhone,
      serviceName: order.package.service.toUpperCase(),
      packageDesc: order.package.packageDescription || "Package",
      saleRecordNumber: order.srnId?.toString() || "",
      currency: order.package.currency || "USD",
      totalWeight: order.package.weightGrams || 100,
      totalValue: String(Number(order.package.totalValue) || 7),
      ioss: "",
      countryShortName: order.buyer.buyerCountry,
      totalShipment: null,
      id: order.krsTrackingNumber,
      isFromOrderTab: false,
      channel: null,
      storeId: null,
      orderId: null,
      shippingMethod: null,
      branchName: "",
      clientCountry: "Indonesia",
      clientBranchName: "",
      phoneCode: order.buyer.phoneCode || "+1",
      customStoreName: null,
      createdDate: new Date().toLocaleString("en-US", { 
        year: "numeric", 
        month: "2-digit", 
        day: "2-digit", 
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit",
        hour12: false 
      }).replace(",", ""),
      updatedDate: null,
      createdPickupDate: null,
      shipmentStatus: "New",
      labelCreated: 0,
      requestType: null,
      requestPickupDate: null,
      shipmentReceivedDate: null,
      shipmentCategory: "M",
      buyerEmail: order.buyer.buyerEmail || "",
      hsCode: order.package.hsCode || "",
      contentItem: [
        {
          countryOfOrigin: order.package.countryOfOrigin || "ID",
          currency: order.package.currency || "USD",
          description: order.package.packageDescription || "Package",
          hsCode: order.package.hsCode || "490900",
          number: "1",
          quantity: 1,
          sku: order.package.sku || "",
          value: Number(order.package.totalValue) || 7,
          itemWeight: order.package.weightGrams || 100,
          length: order.package.lengthCm ? Number(order.package.lengthCm) : null,
          width: order.package.widthCm ? Number(order.package.widthCm) : null,
          height: order.package.heightCm ? Number(order.package.heightCm) : null,
          rowNumber: null,
          productId: null
        }
      ],
      valueAddedServiceInsurance: [],
      valueAddedServiceSignature: [],
      shipmentRemark: order.notes || "",
      collectTaxId: [],
      companyName: "",
      isNoPhone: false,
      saleChannel: order.saleChannel || "",
      isDocConfirm: false,
      shipmentSource: "Web",
      senderName: ""
    };

    console.log("Kurasi update payload:", JSON.stringify(updateData, null, 2));
    
    // Make API call to Kurasi to update shipment
    const response = await axios.post(
      "https://api.kurasi.app/api/v1/modifyShipment",
      updateData,
      { headers }
    );

    // Check if update was successful
    if (response.data?.status !== "SUCCESS") {
      console.error("Kurasi update API error:", JSON.stringify(response.data, null, 2));
      return NextResponse.json(
        {
          error: "Failed to update shipment in Kurasi",
          details: {
            response: response.data,
            message: "Kurasi API returned non-success status"
          }
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Shipment updated successfully in Kurasi",
      krsNumber: order.krsTrackingNumber,
      shipmentData: response.data,
    });
  } catch (error: any) {
    console.error("Error updating Kurasi shipment:", error);
    
    // Provide more detailed error information
    let errorMessage = "Failed to update shipment";
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