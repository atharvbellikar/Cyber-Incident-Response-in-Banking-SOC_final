import { NextRequest, NextResponse } from "next/server";

const BACKEND = "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  const authorization = req.headers.get("Authorization") || "";
  
  try {
    const res = await fetch(`${BACKEND}/auth/logout`, {
      method: "POST",
      headers: {
        "Authorization": authorization,
        "Content-Type": "application/json"
      },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ message: "Logout failed" }, { status: 500 });
  }
}
