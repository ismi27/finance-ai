import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function parseTransactionText(text: string) {
  if (!text || !text.trim()) {
    throw new Error("Teks transaksi kosong.");
  }

  const prompt = `
Kamu adalah parser transaksi keuangan pribadi.

Ubah teks transaksi pengguna menjadi JSON dengan struktur berikut:

{
  "type": "expense" | "income",
  "amount": number,
  "category": string,
  "subCategory": string,
  "account": string,
  "merchant": string,
  "note": string,
  "tag": string
}

ATURAN:
- amount harus berupa angka murni.
- "35rb" berarti 35000.
- "1,5 juta" berarti 1500000.
- type hanya boleh "expense" atau "income".
- Jika uang masuk gunakan "income".
- Jika uang keluar gunakan "expense".
- category harus singkat dan masuk akal.
- account gunakan nama rekening jika disebutkan.
- Jika informasi tidak disebutkan, gunakan "".
- Jangan membuat informasi yang tidak ada di teks.
- Hanya kembalikan JSON.
- Jangan gunakan markdown.

Teks pengguna:
"${text.trim()}"
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite", 
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const resultText = response.text;

  if (!resultText) {
    throw new Error("Gemini tidak memberikan hasil.");
  }

  return JSON.parse(resultText);
}