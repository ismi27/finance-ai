import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const appsScriptUrl = process.env.APPS_SCRIPT_URL;

    if (!appsScriptUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "APPS_SCRIPT_URL belum dikonfigurasi.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const response = await fetch(appsScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await response.text();

    let result;

    try {
      result = JSON.parse(text);
    } catch {
      result = {
        success: response.ok,
        data: text,
      };
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result?.error || "Apps Script gagal memproses transaksi.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Transaction API error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan tidak dikenal.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const appsScriptUrl = process.env.APPS_SCRIPT_URL;

    if (!appsScriptUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "APPS_SCRIPT_URL belum dikonfigurasi.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(appsScriptUrl, {
      method: "GET",
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Gagal mengambil transaksi.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error("Get transactions error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil transaksi.",
      },
      { status: 500 }
    );
  }
}