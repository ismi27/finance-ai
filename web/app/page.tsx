"use client";

import { useEffect, useState } from "react";
import QuickAddAI from "./components/QuickAddAI";

type Transaction = {
  id: string;
  type: "expense" | "income";
  amount: number;
  category: string;
  account: string;
  date: string;
  note: string;
  merchant?: string;
  location?: string;
};

type ScanTransaction = {
  type: "expense" | "income";
  amount: number | null;
  category: string;
  subCategory: string;
  account: string;
  merchant: string;
  location: string;
  date: string;
  note: string;
  tag: string;
};

type ScanResult = {
  success: boolean;
  status: "invalid" | "incomplete" | "ready";
  confidence: number;
  transaction: ScanTransaction | null;
  missingFields: string[];
  message: string;
};

const categories = [
  "Makanan",
  "Transport",
  "Belanja",
  "Tagihan",
  "Hiburan",
  "Kesehatan",
  "Lainnya",
];

const accounts = [
  "BNI",
  "Wallet",
  "Credit Card",
  "BCA QR",
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("home");

  // =========================
  // SCAN STATE
  // =========================

  const [scanImage, setScanImage] = useState<File | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState("");

  // Form hasil OCR yang bisa diedit user
  const [scanType, setScanType] =
    useState<"expense" | "income">("expense");

  const [scanAmount, setScanAmount] = useState("");
  const [scanCategory, setScanCategory] = useState("Makanan");
  const [scanAccount, setScanAccount] = useState("BNI");
  const [scanMerchant, setScanMerchant] = useState("");
  const [scanLocation, setScanLocation] = useState("");
  const [scanDate, setScanDate] = useState("");
  const [scanNote, setScanNote] = useState("");

  const [isSavingScan, setIsSavingScan] = useState(false);

  // =========================
  // MANUAL INPUT STATE
  // =========================

  const [type, setType] =
    useState<"expense" | "income">("expense");

  const [amount, setAmount] = useState("");

  const [category, setCategory] =
    useState("Makanan");

  const [account, setAccount] =
    useState("BNI");

  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [note, setNote] = useState("");

  // =========================
  // TRANSACTIONS
  // =========================

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const response = await fetch("/api/transactions", {
          method: "GET",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "Gagal mengambil transaksi."
          );
        }

        const loadedTransactions: Transaction[] =
          result.transactions.map(
            (transaction: {
              id: string;
              type: "expense" | "income";
              amount: number;
              category: string;
              account: string;
              date: string;
              note: string;
              merchant?: string;
              location?: string;
            }) => ({
              id: transaction.id,
              type: transaction.type,
              amount: transaction.amount,
              category: transaction.category,
              account: transaction.account,
              date: transaction.date,
              note: transaction.note || "",
              merchant: transaction.merchant || "",
              location: transaction.location || "",
            })
          );

        setTransactions(loadedTransactions);
      } catch (error) {
        console.error(
          "Load transactions error:",
          error
        );
      }
    };

    loadTransactions();
  }, []);

  // =========================
  // HELPERS
  // =========================

  const formatInputAmount = (value: string) => {
    const numbersOnly = value.replace(/\D/g, "");

    if (!numbersOnly) {
      return "";
    }

    return Number(numbersOnly).toLocaleString("id-ID");
  };

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // =========================
  // SCAN IMAGE
  // =========================

  const handleScanImage = (file: File) => {
    setScanImage(file);

    const previewUrl = URL.createObjectURL(file);
    setScanPreview(previewUrl);

    // Reset hasil scan sebelumnya
    setScanResult(null);
    setScanError("");
  };

  // =========================
  // SCAN
  // =========================

  const handleScan = async () => {
    if (!scanImage) {
      return;
    }

    setIsScanning(true);
    setScanError("");
    setScanResult(null);

    try {
      const formData = new FormData();

      formData.append("image", scanImage);

      const response = await fetch("/api/scan", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Gagal membaca nota."
        );
      }

      setScanResult(result);

      // Kalau AI menemukan transaksi,
      // masukkan hasilnya ke form editable.
      if (result.transaction) {
        const transaction = result.transaction;

        setScanType(
          transaction.type === "income"
            ? "income"
            : "expense"
        );

        setScanAmount(
          transaction.amount != null
            ? Number(
                transaction.amount
              ).toLocaleString("id-ID")
            : ""
        );

        setScanCategory(
          transaction.category || "Lainnya"
        );

        setScanAccount(
          transaction.account || ""
        );

        setScanMerchant(
          transaction.merchant || ""
        );

        setScanLocation(
          transaction.location || ""
        );

        setScanDate(
          transaction.date || ""
        );

        setScanNote(
          transaction.note || ""
        );
      }
    } catch (error) {
      console.error(
        "Scan error:",
        error
      );

      setScanError(
        error instanceof Error
          ? error.message
          : "Gagal membaca nota."
      );
    } finally {
      setIsScanning(false);
    }
  };

  // =========================
  // SAVE SCANNED TRANSACTION
  // =========================

  const saveScannedTransaction = async () => {
    const numericAmount = Number(
      scanAmount.replace(/\./g, "")
    );

    if (!numericAmount || numericAmount <= 0) {
      alert("Nominal transaksi belum benar.");
      return;
    }

    if (!scanDate) {
      alert("Tanggal transaksi belum diisi.");
      return;
    }

    setIsSavingScan(true);

    try {
      const response = await fetch(
        "/api/transactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: scanType,
            amount: numericAmount,
            category: scanCategory,
            account: scanAccount,
            date: scanDate,
            note: scanNote,

            merchant: scanMerchant,
            location: scanLocation,

            source: "scan",
            status: "confirmed",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Gagal menyimpan transaksi."
        );
      }

      const newTransaction: Transaction = {
        id: result.id,
        type: scanType,
        amount: numericAmount,
        category: scanCategory,
        account: scanAccount,
        date: scanDate,
        note: scanNote,
        merchant: scanMerchant,
        location: scanLocation,
      };

      setTransactions((current) => [
        newTransaction,
        ...current,
      ]);

      // Reset scan
      setScanImage(null);
      setScanPreview(null);
      setScanResult(null);
      setScanError("");

      setScanAmount("");
      setScanCategory("Makanan");
      setScanAccount("BNI");
      setScanMerchant("");
      setScanLocation("");
      setScanDate("");
      setScanNote("");

      setActiveTab("home");

      alert(
        "Transaksi hasil scan berhasil disimpan! ✅"
      );
    } catch (error) {
      console.error(
        "Save scanned transaction error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan transaksi."
      );
    } finally {
      setIsSavingScan(false);
    }
  };

  // =========================
  // MANUAL SAVE
  // =========================

  const saveTransaction = async () => {
    const numericAmount = Number(
      amount.replace(/\./g, "")
    );

    if (!numericAmount || numericAmount <= 0) {
      alert("Masukkan nominal transaksi.");
      return;
    }

    try {
      const response = await fetch(
        "/api/transactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type,
            amount: numericAmount,
            category,
            account,
            date,
            note,
            source: "manual",
            status: "confirmed",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Gagal menyimpan transaksi."
        );
      }

      const newTransaction: Transaction = {
        id: result.id,
        type,
        amount: numericAmount,
        category,
        account,
        date,
        note,
      };

      setTransactions((current) => [
        newTransaction,
        ...current,
      ]);

      setAmount("");
      setNote("");
      setActiveTab("home");

      alert(
        "Transaksi berhasil disimpan! ✅"
      );
    } catch (error) {
      console.error(
        "Save transaction error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan transaksi."
      );
    }
  };

  // =========================
  // CALCULATIONS
  // =========================

  const totalIncome = transactions
    .filter(
      (transaction) =>
        transaction.type === "income"
    )
    .reduce(
      (total, transaction) =>
        total + transaction.amount,
      0
    );

  const totalExpense = transactions
    .filter(
      (transaction) =>
        transaction.type === "expense"
    )
    .reduce(
      (total, transaction) =>
        total + transaction.amount,
      0
    );

  const totalBalance =
    totalIncome - totalExpense;

  // =========================
  // HOME
  // =========================

  const renderHome = () => (
    <>
      <section className="pt-7">
        <p className="text-sm text-gray-500">
          Selamat datang 👋
        </p>

        <h2 className="mt-1 text-2xl font-bold">
          Keuanganmu
        </h2>
      </section>

      <section className="mt-6 rounded-2xl bg-[#171717] p-5 text-white shadow-sm">
        <p className="text-sm text-gray-400">
          Total Balance
        </p>

        <p className="mt-2 text-3xl font-bold">
          {formatRupiah(totalBalance)}
        </p>

        <p className="mt-3 text-xs text-gray-400">
          {transactions.length} transaksi
        </p>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold">
          Quick Actions
        </h3>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            onClick={() =>
              setActiveTab("scan")
            }
            className="rounded-2xl border border-black/5 bg-white p-4 text-left shadow-sm transition active:scale-[0.98]"
          >
            <div className="text-2xl">
              📷
            </div>

            <p className="mt-3 font-semibold">
              Scan Nota
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Foto nota & otomatis baca
            </p>
          </button>

          <button
            onClick={() =>
              setActiveTab("input")
            }
            className="rounded-2xl border border-black/5 bg-white p-4 text-left shadow-sm transition active:scale-[0.98]"
          >
            <div className="text-2xl">
              ➕
            </div>

            <p className="mt-3 font-semibold">
              Quick Add
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Input transaksi manual
            </p>
          </button>

          <QuickAddAI
            onSaved={() => {
              window.location.reload();
            }}
          />
        </div>
      </section>

      <section className="mt-7">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Transaksi Terbaru
          </h3>

          <button
            onClick={() =>
              setActiveTab("data")
            }
            className="text-xs text-gray-500"
          >
            Lihat semua
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-black/5 bg-white p-5 text-center shadow-sm">
            <div className="text-3xl">
              🧾
            </div>

            <p className="mt-3 text-sm font-medium">
              Belum ada transaksi
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Tambahkan transaksi pertama kamu.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {transactions
              .slice(0, 5)
              .map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                      {transaction.type ===
                      "expense"
                        ? "💸"
                        : "💰"}
                    </div>

                    <div>
                      <p className="text-sm font-semibold">
                        {transaction.note ||
                          transaction.merchant ||
                          transaction.category}
                      </p>

                      <p className="text-xs text-gray-500">
                        {transaction.category} ·{" "}
                        {transaction.account}
                      </p>
                    </div>
                  </div>

                  <p
                    className={`text-sm font-semibold ${
                      transaction.type ===
                      "expense"
                        ? "text-red-500"
                        : "text-green-600"
                    }`}
                  >
                    {transaction.type ===
                    "expense"
                      ? "-"
                      : "+"}
                    {formatRupiah(
                      transaction.amount
                    )}
                  </p>
                </div>
              ))}
          </div>
        )}
      </section>
    </>
  );

  // =========================
  // MANUAL INPUT
  // =========================

  const renderInput = () => (
    <section className="pt-7">
      <button
        onClick={() =>
          setActiveTab("home")
        }
        className="mb-5 text-sm text-gray-500"
      >
        ← Kembali
      </button>

      <h2 className="text-2xl font-bold">
        Tambah Transaksi
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        Catat transaksi secara manual.
      </p>

      <div className="mt-6">
        <label className="text-sm font-semibold">
          Tipe Transaksi
        </label>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={() =>
              setType("expense")
            }
            className={`rounded-xl border p-3 text-sm font-medium ${
              type === "expense"
                ? "border-black bg-black text-white"
                : "border-black/10 bg-white"
            }`}
          >
            💸 Pengeluaran
          </button>

          <button
            onClick={() =>
              setType("income")
            }
            className={`rounded-xl border p-3 text-sm font-medium ${
              type === "income"
                ? "border-black bg-black text-white"
                : "border-black/10 bg-white"
            }`}
          >
            💰 Pemasukan
          </button>
        </div>
      </div>

      <div className="mt-5">
        <label className="text-sm font-semibold">
          Nominal
        </label>

        <div className="mt-2 flex items-center rounded-xl border border-black/10 bg-white px-4">
          <span className="text-gray-500">
            Rp
          </span>

          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(event) => {
              setAmount(
                formatInputAmount(
                  event.target.value
                )
              );
            }}
            placeholder="0"
            className="w-full bg-transparent p-3 text-lg font-semibold outline-none"
          />
        </div>
      </div>

      <div className="mt-5">
        <label className="text-sm font-semibold">
          Kategori
        </label>

        <select
          value={category}
          onChange={(event) =>
            setCategory(
              event.target.value
            )
          }
          className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3 outline-none"
        >
          {categories.map((item) => (
            <option
              key={item}
              value={item}
            >
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        <label className="text-sm font-semibold">
          Rekening
        </label>

        <select
          value={account}
          onChange={(event) =>
            setAccount(
              event.target.value
            )
          }
          className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3 outline-none"
        >
          {accounts.map((item) => (
            <option
              key={item}
              value={item}
            >
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        <label className="text-sm font-semibold">
          Tanggal
        </label>

        <input
          type="date"
          value={date}
          onChange={(event) =>
            setDate(
              event.target.value
            )
          }
          className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3 outline-none"
        />
      </div>

      <div className="mt-5">
        <label className="text-sm font-semibold">
          Catatan
        </label>

        <textarea
          value={note}
          onChange={(event) =>
            setNote(
              event.target.value
            )
          }
          placeholder="Contoh: Nasi Padang depan kampus"
          rows={3}
          className="mt-2 w-full resize-none rounded-xl border border-black/10 bg-white p-3 outline-none"
        />
      </div>

      <button
        onClick={saveTransaction}
        className="mt-6 w-full rounded-xl bg-[#ffa500] p-4 font-bold text-black shadow-sm transition active:scale-[0.98]"
      >
        Simpan Transaksi
      </button>
    </section>
  );

  // =========================
  // SCAN
  // =========================

  const renderScan = () => (
    <section className="pt-7">
      <h2 className="text-2xl font-bold">
        Scan Nota
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        Scan nota untuk membuat transaksi
        secara otomatis.
      </p>

      {/* UPLOAD / PREVIEW */}
      <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center">
        {!scanPreview ? (
          <>
            <div className="text-5xl">
              📷
            </div>

            <p className="mt-4 font-semibold">
              Scan Nota
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Upload atau ambil foto nota.
            </p>

            <label className="mt-5 inline-block cursor-pointer rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white">
              Pilih Foto

              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                  const file =
                    event.target.files?.[0];

                  if (file) {
                    handleScanImage(file);
                  }
                }}
              />
            </label>
          </>
        ) : (
          <>
            <img
              src={scanPreview}
              alt="Preview nota"
              className="mx-auto max-h-80 w-full rounded-xl object-contain"
            />

            <div className="mt-5 flex gap-3">
              <label className="flex-1 cursor-pointer rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold">
                Ganti Foto

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => {
                    const file =
                      event.target.files?.[0];

                    if (file) {
                      handleScanImage(file);
                    }
                  }}
                />
              </label>

              <button
                type="button"
                disabled={isScanning}
                className="flex-1 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                onClick={handleScan}
              >
                {isScanning
                  ? "Membaca Nota..."
                  : "Scan Nota"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* LOADING */}
      {isScanning && (
        <div className="mt-4 rounded-2xl bg-white p-5 text-center shadow-sm">
          <div className="text-3xl">
            🔍
          </div>

          <p className="mt-3 font-semibold">
            Sedang membaca nota...
          </p>

          <p className="mt-1 text-sm text-gray-500">
            AI sedang mencoba mengenali transaksi.
          </p>
        </div>
      )}

      {/* ERROR */}
      {scanError && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="font-semibold text-red-700">
            Gagal membaca nota
          </p>

          <p className="mt-1 text-sm text-red-600">
            {scanError}
          </p>
        </div>
      )}

      {/* INVALID */}
      {scanResult?.status === "invalid" && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="text-3xl">
            ⚠️
          </div>

          <p className="mt-3 font-semibold text-red-700">
            Gambar tidak dikenali sebagai transaksi
          </p>

          <p className="mt-1 text-sm text-red-600">
            {scanResult.message}
          </p>

          <label className="mt-4 inline-block cursor-pointer rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white">
            Pilih Foto Lain

            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                const file =
                  event.target.files?.[0];

                if (file) {
                  handleScanImage(file);
                }
              }}
            />
          </label>
        </div>
      )}

      {/* RESULT / EDIT FORM */}
      {scanResult?.transaction && (
        <div className="mt-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">
                Periksa Hasil Scan
              </p>

              <p className="mt-1 text-xs text-gray-500">
                AI membaca dengan confidence{" "}
                {Math.round(
                  scanResult.confidence * 100
                )}
                %
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                scanResult.status ===
                "ready"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {scanResult.status ===
              "ready"
                ? "Siap"
                : "Perlu Dicek"}
            </span>
          </div>

          {scanResult.message && (
            <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
              {scanResult.message}
            </div>
          )}

          {/* TYPE */}
          <div className="mt-5">
            <label className="text-sm font-semibold">
              Tipe Transaksi
            </label>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setScanType("expense")
                }
                className={`rounded-xl border p-3 text-sm font-medium ${
                  scanType === "expense"
                    ? "border-black bg-black text-white"
                    : "border-black/10 bg-white"
                }`}
              >
                💸 Pengeluaran
              </button>

              <button
                type="button"
                onClick={() =>
                  setScanType("income")
                }
                className={`rounded-xl border p-3 text-sm font-medium ${
                  scanType === "income"
                    ? "border-black bg-black text-white"
                    : "border-black/10 bg-white"
                }`}
              >
                💰 Pemasukan
              </button>
            </div>
          </div>

          {/* AMOUNT */}
          <div className="mt-5">
            <label className="text-sm font-semibold">
              Nominal
            </label>

            <div className="mt-2 flex items-center rounded-xl border border-black/10 bg-white px-4">
              <span className="text-gray-500">
                Rp
              </span>

              <input
                type="text"
                inputMode="numeric"
                value={scanAmount}
                onChange={(event) => {
                  setScanAmount(
                    formatInputAmount(
                      event.target.value
                    )
                  );
                }}
                placeholder="0"
                className="w-full bg-transparent p-3 text-lg font-semibold outline-none"
              />
            </div>
          </div>

          {/* CATEGORY */}
          <div className="mt-5">
            <label className="text-sm font-semibold">
              Kategori
            </label>

            <select
              value={scanCategory}
              onChange={(event) =>
                setScanCategory(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3 outline-none"
            >
              {categories.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* ACCOUNT */}
          <div className="mt-5">
            <label className="text-sm font-semibold">
              Rekening / Metode Pembayaran
            </label>

            <input
              type="text"
              value={scanAccount}
              onChange={(event) =>
                setScanAccount(
                  event.target.value
                )
              }
              placeholder="Contoh: BCA QR"
              className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3 outline-none"
            />
          </div>

          {/* MERCHANT */}
          <div className="mt-5">
            <label className="text-sm font-semibold">
              Merchant
            </label>

            <input
              type="text"
              value={scanMerchant}
              onChange={(event) =>
                setScanMerchant(
                  event.target.value
                )
              }
              placeholder="Nama merchant"
              className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3 outline-none"
            />
          </div>

          {/* LOCATION */}
          <div className="mt-5">
            <label className="text-sm font-semibold">
              Lokasi
            </label>

            <input
              type="text"
              value={scanLocation}
              onChange={(event) =>
                setScanLocation(
                  event.target.value
                )
              }
              placeholder="Alamat merchant"
              className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3 outline-none"
            />
          </div>

          {/* DATE */}
          <div className="mt-5">
            <label className="text-sm font-semibold">
              Tanggal
            </label>

            <input
              type="date"
              value={scanDate}
              onChange={(event) =>
                setScanDate(
                  event.target.value
                )
              }
              className={`mt-2 w-full rounded-xl border bg-white p-3 outline-none ${
                !scanDate
                  ? "border-red-300"
                  : "border-black/10"
              }`}
            />

            {!scanDate && (
              <p className="mt-1 text-xs text-red-500">
                Tanggal belum terbaca. Silakan isi
                manual.
              </p>
            )}
          </div>

          {/* DESCRIPTION */}
          <div className="mt-5">
            <label className="text-sm font-semibold">
              Deskripsi
            </label>

            <textarea
              value={scanNote}
              onChange={(event) =>
                setScanNote(
                  event.target.value
                )
              }
              placeholder="Contoh: Ferrara Dubai Chewy dan Romeo Chocolate"
              rows={3}
              className="mt-2 w-full resize-none rounded-xl border border-black/10 bg-white p-3 outline-none"
            />
          </div>

          {/* MISSING FIELDS */}
          {scanResult.missingFields.length >
            0 && (
            <div className="mt-5 rounded-xl bg-yellow-50 p-4">
              <p className="text-sm font-semibold text-yellow-800">
                Beberapa data perlu diperiksa:
              </p>

              <ul className="mt-2 list-disc pl-5 text-xs text-yellow-700">
                {scanResult.missingFields.map(
                  (field) => (
                    <li key={field}>
                      {field}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

          {/* SAVE */}
          <button
            type="button"
            disabled={
              isSavingScan ||
              !scanAmount ||
              !scanDate
            }
            onClick={
              saveScannedTransaction
            }
            className="mt-6 w-full rounded-xl bg-[#ffa500] p-4 font-bold text-black shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSavingScan
              ? "Menyimpan..."
              : "Simpan Transaksi"}
          </button>
        </div>
      )}
    </section>
  );

  // =========================
  // DATA
  // =========================

  const renderData = () => (
    <section className="pt-7">
      <h2 className="text-2xl font-bold">
        Semua Transaksi
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        {transactions.length} transaksi
      </p>

      <div className="mt-5 space-y-2">
        {transactions.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center">
            <div className="text-3xl">
              🧾
            </div>

            <p className="mt-3 text-sm">
              Belum ada transaksi.
            </p>
          </div>
        ) : (
          transactions.map(
            (transaction) => (
              <div
                key={transaction.id}
                className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
              >
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-semibold">
                      {transaction.note ||
                        transaction.merchant ||
                        transaction.category}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {transaction.category} ·{" "}
                      {transaction.account}
                    </p>

                    {transaction.location && (
                      <p className="mt-1 text-xs text-gray-400">
                        📍{" "}
                        {transaction.location}
                      </p>
                    )}

                    <p className="mt-1 text-xs text-gray-400">
                      {transaction.date}
                    </p>
                  </div>

                  <p
                    className={`font-semibold ${
                      transaction.type ===
                      "expense"
                        ? "text-red-500"
                        : "text-green-600"
                    }`}
                  >
                    {transaction.type ===
                    "expense"
                      ? "-"
                      : "+"}
                    {formatRupiah(
                      transaction.amount
                    )}
                  </p>
                </div>
              </div>
            )
          )
        )}
      </div>
    </section>
  );

  // =========================
  // MENU
  // =========================

  const menuItems = [
    {
      id: "home",
      icon: "🏠",
      label: "Home",
    },
    {
      id: "input",
      icon: "➕",
      label: "Input",
    },
    {
      id: "scan",
      icon: "📷",
      label: "Scan",
    },
    {
      id: "data",
      icon: "📊",
      label: "Data",
    },
  ];

  // =========================
  // MAIN
  // =========================

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#171717]">

      {/* HEADER */}
      <header className="sticky top-0 z-10 border-b border-black/5 bg-[#f7f7f5]/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-4">
          <button
            onClick={() =>
              setActiveTab("home")
            }
            className="flex items-center gap-3 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffa500] text-xl">
              💰
            </div>

            <div>
              <h1 className="text-base font-bold">
                Finance AI
              </h1>

              <p className="text-xs text-gray-500">
                Personal Finance
              </p>
            </div>
          </button>

          <button className="text-xl">
            ☰
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="mx-auto max-w-md px-5 pb-28">
        {activeTab === "home" &&
          renderHome()}

        {activeTab === "input" &&
          renderInput()}

        {activeTab === "scan" &&
          renderScan()}

        {activeTab === "data" &&
          renderData()}
      </div>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() =>
                setActiveTab(item.id)
              }
              className={`flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs transition ${
                activeTab === item.id
                  ? "font-semibold text-[#171717]"
                  : "text-gray-400"
              }`}
            >
              <span className="text-lg">
                {item.icon}
              </span>

              <span>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}