import { readdirSync } from 'fs';
import path from 'path';

export async function GET() {
  const dirRelativeToPublicFolder = 'images';
  const dir = path.resolve('./public', dirRelativeToPublicFolder);

  try {
    const filenames = readdirSync(dir);
    const images = filenames.map(name => path.join('/', dirRelativeToPublicFolder, name));
    return new Response(JSON.stringify(images), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error reading directory:', error);
    return new Response(JSON.stringify({ error: "Failed to read directory" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
