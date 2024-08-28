// app/api/url/route.ts
import { promises as fs } from "fs";
import path from "path";

export async function GET() {
  const jsonFilePath = path.join(process.cwd(), "public", "url.json");
  try {
    const fileContents = await fs.readFile(jsonFilePath, "utf8");
    const data = JSON.parse(fileContents);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to read JSON file" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
