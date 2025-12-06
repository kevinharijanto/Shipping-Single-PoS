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

    // Get order details to check if it has a KRS tracking number
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        krsTrackingNumber: true,
        deliveryStatus: true,
        srnId: true,
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
    
    console.log("Kurasi delete API headers:", JSON.stringify(headers, null, 2));

    // Prepare delete shipment data for Kurasi API
    const deleteData = {
      shipmentIdList: [
        { 
          ShipmentID: order.krsTrackingNumber, 
          Remark: "Deleted from PoS system" 
        }
      ]
    };

    console.log("Kurasi delete payload:", JSON.stringify(deleteData, null, 2));
    
    // Make API call to Kurasi to delete shipment
    const response = await axios.post(
      "https://api.kurasi.app/api/v1/deleteShipment",
      deleteData,
      { headers }
    );

    // Check if deletion was successful
    if (response.data?.status !== "SUCCESS") {
      console.error("Kurasi delete API error:", JSON.stringify(response.data, null, 2));
      return NextResponse.json(
        {
          error: "Failed to delete shipment from Kurasi",
          details: {
            response: response.data,
            message: "Kurasi API returned non-success status"
          }
        },
        { status: 500 }
      );
    }

    // Update order to remove KRS tracking number and reset status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        krsTrackingNumber: null,
        deliveryStatus: "submitted_to_Kurasi", // Reset to submitted state
      } as any,
    });

    // Also update the SRN record to remove the KRS number
    if (order.srnId) {
      await prisma.buyerSRN.update({
        where: { saleRecordNumber: order.srnId },
        data: {
          kurasiShipmentId: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Shipment deleted successfully from Kurasi",
      krsNumber: order.krsTrackingNumber,
    });
  } catch (error: any) {
    console.error("Error deleting Kurasi shipment:", error);
    
    // Provide more detailed error information
    let errorMessage = "Failed to delete shipment";
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