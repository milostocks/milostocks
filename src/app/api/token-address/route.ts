import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "token-address.json");

function getStoredAddress(): string {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      if (data && data.address) {
        return data.address;
      }
    }
  } catch (err) {
    console.error("Error reading token address file:", err);
  }
  return "0x0000000000000000000000000000000000000000";
}

function saveStoredAddress(address: string) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify({ address, updatedAt: Date.now() }), "utf-8");
  } catch (err) {
    console.error("Error saving token address file:", err);
  }
}

export async function GET() {
  const address = getStoredAddress();
  return NextResponse.json({ address });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { address, password } = body;

    if (password !== "Sony123") {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "Invalid contract address" }, { status: 400 });
    }

    saveStoredAddress(address.trim());
    return NextResponse.json({ success: true, address: address.trim() });
  } catch (err) {
    console.error("Error updating token address:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
