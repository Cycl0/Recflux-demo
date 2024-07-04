import fs from 'fs';
import path from 'path';

export async function GET(req) {
  const dirRelativeToPublicFolder = 'images';
  const dir = path.resolve('./public', dirRelativeToPublicFolder);

  try {
    const filenames = fs.readdirSync(dir);
    const images = filenames.map(name => path.join('/', dirRelativeToPublicFolder, name));
    return new Response(JSON.stringify(images), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to read JSON file" }), { status: 500 });
  }
}
