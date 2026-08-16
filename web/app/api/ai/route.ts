import { NextResponse } from "next/server";
import { parseTransactionText } from "../../services/AIService";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = body?.text;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Teks transaksi kosong.",
        },
        { status: 400 }
      );
    }

    const transaction = await parseTransactionText(text);

    return NextResponse.json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error("AI parsing error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal memproses transaksi dengan AI.",
      },
      { status: 500 }
    );
  }
}