import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hsCode = searchParams.get('hsCode');

    if (!hsCode) {
      return NextResponse.json(
        { error: 'HS Code is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`https://api.kurasi.app/api/v1/validate/hsCode/${hsCode}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'origin': 'https://kurasi.app',
        'referer': 'https://kurasi.app/',
        'x-ship-auth-token': '89068218-5dec-47b7-9e91-a582ac0836f1',
      },
    });

    const data = await response.json();
    
    // Check if the API response status is FAIL
    if (data.status === 'FAIL') {
      return NextResponse.json(
        {
          error: data.returnMessage || 'HS Code validation failed',
          returnCode: data.returnCode,
          returnMessage: data.returnMessage
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error validating HS Code:', error);
    return NextResponse.json(
      { error: 'Failed to validate HS Code' },
      { status: 500 }
    );
  }
}