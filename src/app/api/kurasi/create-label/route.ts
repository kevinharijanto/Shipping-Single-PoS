import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import axios from "axios";
import { Buffer } from "buffer";

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

    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if (!order.krsTrackingNumber) {
      return NextResponse.json(
        { error: "No KRS tracking number found. Please create a shipment first." },
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

    // Prepare data for Kurasi API
    const labelData = {
      shipmentIdList: [order.krsTrackingNumber],
    };

    console.log("Kurasi create label payload:", JSON.stringify(labelData, null, 2));
    
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
    
    // Make API call to Kurasi with responseType set to arraybuffer to handle binary data
    const response = await axios.post(
      "https://api.kurasi.app/api/v1/createLabel",
      labelData,
      {
        headers,
        responseType: 'arraybuffer' // Better for handling binary data in Node.js
      }
    );

    // Log response details for debugging
    console.log("Response headers:", response.headers);
    console.log("Response data type:", typeof response.data);
    console.log("Response data constructor:", response.data.constructor.name);
    
    // Check if the response is a PDF (content-type includes 'application/pdf')
    const contentType = response.headers['content-type'];
    console.log("Content-Type:", contentType);
    
    if (contentType && contentType.includes('application/pdf')) {
      // Update order status to label_confirmed
      await prisma.order.update({
        where: { id: orderId },
        data: { deliveryStatus: "label_confirmed" } as any,
      });

      // Create a new Response with the PDF data and appropriate headers
      const pdfData = response.data;
      const headers = new Headers();
      headers.set('Content-Type', 'application/pdf');
      headers.set('Content-Disposition', `attachment; filename="label-${order.krsTrackingNumber}.pdf"`);
      
      return new NextResponse(pdfData, {
        status: 200,
        headers,
      });
    } else {
      // If it's not a PDF, the response is binary data but contains JSON
      // Convert the binary data to text and then parse as JSON
      const responseText = Buffer.from(response.data).toString('utf8');
      console.log("Response text (first 200 chars):", responseText.substring(0, 200));
      
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error("Non-PDF response that isn't valid JSON:", responseText);
        return NextResponse.json(
          { error: "Unexpected response format from Kurasi API" },
          { status: 500 }
        );
      }

      // Extract label information from response
      const labelInfo = responseData.data;

      if (!labelInfo) {
        console.error("No label information in Kurasi response:", JSON.stringify(responseData, null, 2));
        return NextResponse.json(
          {
            error: "No label information received from Kurasi",
            details: {
              response: responseData,
              message: "Kurasi API response does not contain label information"
            }
          },
          { status: 500 }
        );
      }

      // Update order status to label_confirmed
      await prisma.order.update({
        where: { id: orderId },
        data: { deliveryStatus: "label_confirmed" } as any,
      });

      // Extract tracking link if available
      const trackingLink = labelInfo.trackingLink || null;
      const labelId = labelInfo.labelId || null;

      // Update order with label information
      await prisma.order.update({
        where: { id: orderId },
        data: {
          trackingLink,
          labelId,
        } as any,
      });

      return NextResponse.json({
        success: true,
        labelInfo,
        trackingLink,
        labelId,
      });
    }
  } catch (error: any) {
    console.error("Error creating Kurasi label:", error);
    
    // Provide more detailed error information
    let errorMessage = "Failed to create label";
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