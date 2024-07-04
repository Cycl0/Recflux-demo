// app/api/code/route.ts
import { promises as fs } from "fs";
import path from "path";

export async function GET(req) {
  const jsonFilePath = path.join(process.cwd(), "public", "code.json");
  try {
    const fileContents = await fs.readFile(jsonFilePath, "utf8");
    const data = JSON.parse(fileContents);
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to read JSON file" }), { status: 500 });
  }
}