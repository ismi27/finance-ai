import { NextResponse } from "next/server";
import { parseTransactionImage } from "../../services/AIService";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const image = formData.get("image");

    if (!image || !(image instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Foto nota tidak ditemukan.",
        },
        { status: 400 }
      );
    }

    // Validasi tipe file
    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        {
          success: false,
          error: "File yang dipilih bukan gambar.",
        },
        { status: 400 }
      );
    }

    // Batasi ukuran file, misalnya 10 MB
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: "Ukuran gambar terlalu besar. Maksimal 10 MB.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await image.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    const result = await parseTransactionImage(
      base64Image,
      image.type
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Scan error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal membaca foto nota.",
      },
      { status: 500 }
    );
  }
}