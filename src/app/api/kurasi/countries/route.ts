import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://api.kurasi.app/api/v1/ship/allCountry', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Ship-Auth-Token': '0ce805fa-d3c1-4349-9f74-59b40bc60c19',
        'Origin': 'https://kurasi.app',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== 'SUCCESS') {
      throw new Error(data.errorMessage || 'Failed to fetch countries');
    }

    // Transform the data to a more usable format (shortName -> country mapping)
    const countryMap: Record<string, string> = {};
    data.data.forEach((country: any) => {
      countryMap[country.shortName] = country.country;
    });

    return NextResponse.json({
      countries: data.data,
      countryMap,
    });
  } catch (error) {
    console.error('Error fetching countries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countries' },
      { status: 500 }
    );
  }
}
