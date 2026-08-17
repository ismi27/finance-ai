import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/* =========================================================
   PARSE TRANSACTION FROM TEXT
   ========================================================= */

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
  "date": string,
  "note": string,
  "location": string,
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
- account gunakan nama rekening atau metode pembayaran jika disebutkan.
- merchant gunakan nama toko, restoran, perusahaan, atau pihak transaksi jika disebutkan.
- date gunakan format YYYY-MM-DD jika tanggal lengkap disebutkan.
- Jika tanggal tidak lengkap atau tidak disebutkan, gunakan "".
- location gunakan lokasi atau alamat merchant jika disebutkan.
- Jika informasi tidak disebutkan, gunakan "".
- note gunakan deskripsi singkat mengenai transaksi.
- Jika terdapat daftar barang atau makanan yang dibeli, masukkan nama barang tersebut ke dalam note.
- Jika terdapat beberapa item, gabungkan dengan kata "dan".
- Jangan membuat informasi yang tidak ada di teks.
- Jangan menebak informasi yang tidak disebutkan.
- Hanya kembalikan JSON.
- Jangan gunakan markdown.

CONTOH:

Jika teks:
"Makan di Luuca, beli Ferrara Dubai Chewy dan Romeo Chocolate, total 53000, bayar BCA QR"

Maka hasilnya:

{
  "type": "expense",
  "amount": 53000,
  "category": "Makanan",
  "subCategory": "Restoran",
  "account": "BCA QR",
  "merchant": "Luuca Indonesia",
  "date": "",
  "note": "Ferrara Dubai Chewy dan Romeo Chocolate",
  "location": "Luuca Indonesia, Jl. Letjen S. Parman, Jakarta Barat",
  "tag": ""
}

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


/* =========================================================
   PARSE TRANSACTION FROM IMAGE / RECEIPT
   ========================================================= */

export async function parseTransactionImage(
  base64Image: string,
  mimeType: string
) {
  if (!base64Image) {
    throw new Error("Gambar nota kosong.");
  }

  const prompt = `
Kamu adalah AI OCR untuk membaca bukti transaksi keuangan pribadi.

Analisis gambar yang diberikan dan tentukan apakah gambar tersebut
merupakan nota, struk, invoice, bukti pembayaran, atau bukti transaksi
keuangan lainnya.

Tujuan utama kamu adalah mengambil informasi transaksi SEAKURAT mungkin
dari gambar dan mengubahnya menjadi data transaksi yang nantinya akan
dicek dan dapat diedit oleh pengguna sebelum disimpan.

Kembalikan JSON DENGAN STRUKTUR PERSIS berikut:

{
  "status": "invalid" | "incomplete" | "ready",
  "confidence": number,
  "transaction": {
    "type": "expense" | "income",
    "amount": number | null,
    "category": string,
    "subCategory": string,
    "account": string,
    "merchant": string,
    "date": string,
    "note": string,
    "location": string,
    "tag": string
  } | null,
  "missingFields": string[],
  "message": string
}


ATURAN VALIDASI:


1. VALIDASI GAMBAR

Jika gambar BUKAN nota, struk, invoice, bukti pembayaran,
atau bukti transaksi keuangan:

- status = "invalid"
- transaction = null
- jangan membuat transaksi berdasarkan tebakan.

Contoh gambar invalid:

- foto makanan tanpa struk
- foto orang
- foto pemandangan
- screenshot yang bukan transaksi
- gambar random
- dokumen yang bukan transaksi keuangan


2. TRANSAKSI TIDAK LENGKAP

Jika gambar merupakan bukti transaksi tetapi beberapa informasi
tidak dapat dibaca:

- status = "incomplete"
- transaction tetap diisi
- field yang tidak diketahui harus ""
- amount yang tidak diketahui harus null
- masukkan field yang kosong ke missingFields.

Jangan menganggap gambar invalid hanya karena tanggal,
rekening, lokasi, atau informasi lain tidak terbaca.


3. TRANSAKSI SIAP

Jika gambar merupakan bukti transaksi dan informasi utama
berhasil dibaca:

- status = "ready"


4. JANGAN MENGARANG

Jangan pernah membuat informasi yang tidak terlihat pada gambar.

Jika tidak yakin terhadap suatu informasi, kosongkan field tersebut.


5. NOMINAL

amount harus berupa angka murni tanpa simbol mata uang.

Contoh:

Rp35.000 -> 35000
Rp1.500.000 -> 1500000

Jika terdapat:

Subtotal
Tax / PPN
Service charge
Rounding
Total

Gunakan nilai TOTAL transaksi sebagai amount.

Jangan menggunakan subtotal jika total tersedia.

Jika nominal total tidak dapat dipastikan:

- amount = null
- tambahkan "amount" ke missingFields.


6. TIPE TRANSAKSI

Jika uang keluar:

"type": "expense"

Jika uang masuk:

"type": "income"


7. KATEGORI

category harus singkat dan masuk akal.

Gunakan kategori seperti:

Makanan
Belanja
Transport
Tagihan
Hiburan
Kesehatan
Pendidikan
Investasi
Gaji
Transfer
Lainnya

Pilih kategori berdasarkan isi transaksi.


8. SUBCATEGORY

Gunakan subCategory jika jenis transaksi dapat diketahui
dengan lebih spesifik.

Contoh:

Makanan -> Restoran
Makanan -> Minuman
Transport -> Bensin
Transport -> Tol
Belanja -> Groceries

Jika tidak dapat ditentukan:

"subCategory": ""


9. ACCOUNT / METODE PEMBAYARAN

account hanya diisi jika rekening atau metode pembayaran
terlihat pada bukti transaksi.

Contoh:

BCA
BNI
Mandiri
BCA QR
GoPay
OVO
Dana
Cash

Jika tidak terlihat:

"account": ""


10. MERCHANT

merchant harus berisi nama toko, restoran, perusahaan,
atau pihak yang menerima/membayar transaksi.

Contoh:

Luuca Indonesia
Indomaret
Tokopedia
Grab
Shopee

Gunakan nama merchant yang terlihat pada bukti.


11. ITEM BARANG / MAKANAN

Ini sangat penting.

Jika nota memiliki daftar barang atau makanan yang dibeli,
ambil nama item tersebut.

Masukkan nama item ke dalam field "note".

Contoh:

Ferrara Dubai Chewy
Romeo Chocolate

Maka:

"note": "Ferrara Dubai Chewy dan Romeo Chocolate"

Jika ada 3 item:

"note": "Nasi Goreng, Es Teh dan Ayam Bakar"

Jika ada lebih dari 3 item, tetap masukkan item-item penting
yang terlihat pada nota.

Jangan memasukkan harga item ke dalam note
kecuali memang diperlukan untuk membedakan item.


12. LOCATION

Jika nota menampilkan alamat merchant, masukkan alamat tersebut
ke dalam field "location".

Contoh:

Merchant:
"Luuca Indonesia"

Alamat:
"Jl. Letjen S. Parman, Jakarta Barat"

Maka:

"merchant": "Luuca Indonesia",
"location": "Luuca Indonesia, Jl. Letjen S. Parman, Jakarta Barat"

Location boleh berisi:

- nama merchant + alamat
- nama gedung + alamat
- alamat lengkap merchant

Gunakan informasi lokasi yang benar-benar terlihat pada nota.

Jangan membuat alamat yang tidak terlihat.

Jika alamat tidak tersedia:

"location": ""


13. DATE

Gunakan format:

YYYY-MM-DD

Contoh:

8 Agustus 2026 -> 2026-08-08

Jika hanya tertulis:

"Agu 2026"

dan tanggal/hari tidak terlihat dengan jelas:

"date": ""

Jangan menebak tanggal.


14. CONFIDENCE

confidence adalah angka antara 0 dan 1.

Contoh:

0.95 = sangat yakin
0.80 = cukup yakin
0.60 = masih ada keraguan

Confidence harus mencerminkan keyakinan terhadap keseluruhan
hasil pembacaan transaksi.


15. STATUS

Gunakan:

"invalid"
jika bukan bukti transaksi.

"incomplete"
jika merupakan bukti transaksi tetapi ada informasi penting
yang belum terbaca.

"ready"
jika informasi utama transaksi sudah berhasil dibaca.


16. MISSING FIELDS

Masukkan nama field yang kosong dan penting ke dalam:

"missingFields"

Contoh:

[
  "date"
]

Jika tidak ada informasi penting yang hilang:

[]


17. MESSAGE

message harus berupa penjelasan singkat kepada pengguna.

Contoh:

"Struk berhasil dibaca dan siap diperiksa."

atau:

"Struk berhasil dibaca, tetapi tanggal transaksi belum dapat dipastikan."


18. HASIL AKHIR

Hanya kembalikan JSON.

Jangan gunakan markdown.

Jangan memberikan penjelasan di luar JSON.

Jangan membuat informasi yang tidak terlihat pada gambar.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const resultText = response.text;

  if (!resultText) {
    throw new Error("Gemini tidak memberikan hasil scan.");
  }

  return JSON.parse(resultText);
}