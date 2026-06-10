import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://ws.smn.gob.ar/map_items/weather', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!res.ok) {
      throw new Error(`SMN returned ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in SMN proxy:", error);
    return NextResponse.json({ error: "Failed to fetch from SMN" }, { status: 500 });
  }
}
