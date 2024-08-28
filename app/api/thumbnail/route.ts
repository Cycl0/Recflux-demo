// app/api/thumbnail/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  const apiKey = process.env.THUMBNAIL_API_KEY;
  console.log('API Key:', apiKey);
  if (!apiKey) {
    console.error('API key is not set');
    return NextResponse.json({ error: 'API key is not configured' }, { status: 500 });
  }

  const thumbnailUrl = `https://api.thumbnail.ws/api/${apiKey}/thumbnail/get?url=${encodeURIComponent(url)}&width=640`;

  try {
    console.log('Fetching thumbnail from:', thumbnailUrl);
    const response = await fetch(thumbnailUrl);

    if (!response.ok) {
      console.error('Thumbnail API responded with:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response body:', text);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (error) {
    console.error('Error fetching thumbnail:', error);
    return NextResponse.json({ error: 'Failed to fetch thumbnail', details: error.message }, { status: 500 });
  }
}
