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
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("home");

  const [transactions, setTransactions] = useState<Transaction[]>([]);

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
            }) => ({
              id: transaction.id,
              type: transaction.type,
              amount: transaction.amount,
              category: transaction.category,
              account: transaction.account,
              date: transaction.date,
              note: transaction.note || "",
            })
          );

        setTransactions(loadedTransactions);
      } catch (error) {
        console.error("Load transactions error:", error);
      }
    };

    loadTransactions();
  }, []);

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const formatInputAmount = (value: string) => {
    const numbersOnly = value.replace(/\D/g, "");

    if (!numbersOnly) {
      return "";
    }

    return Number(numbersOnly).toLocaleString("id-ID");
  };
  const [category, setCategory] = useState("Makanan");
  const [account, setAccount] = useState("BNI");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [note, setNote] = useState("");

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  };


  const totalIncome = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce(
      (total, transaction) => total + transaction.amount,
      0
    );

  const totalExpense = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce(
      (total, transaction) => total + transaction.amount,
      0
    );

  const totalBalance = totalIncome - totalExpense;

  const saveTransaction = async () => {
    const numericAmount = Number(amount.replace(/\./g, ""));

    if (!numericAmount || numericAmount <= 0) {
      alert("Masukkan nominal transaksi.");
      return;
    }

    try {
      const response = await fetch("/api/transactions", {
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
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Gagal menyimpan transaksi.");
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

      alert("Transaksi berhasil disimpan! ✅");
    } catch (error) {
      console.error("Save transaction error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan transaksi."
      );
    }
  };

  const renderHome = () => (
    <>
      {/* GREETING */}
      <section className="pt-7">
        <p className="text-sm text-gray-500">
          Selamat datang 👋
        </p>

        <h2 className="mt-1 text-2xl font-bold">
          Keuanganmu
        </h2>
      </section>

      {/* BALANCE */}
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

      {/* QUICK ACTIONS */}
      <section className="mt-6">
        <h3 className="text-sm font-semibold">
          Quick Actions
        </h3>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            onClick={() => setActiveTab("scan")}
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
            onClick={() => setActiveTab("input")}
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

      {/* RECENT TRANSACTIONS */}
      <section className="mt-7">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Transaksi Terbaru
          </h3>

          <button
            onClick={() => setActiveTab("data")}
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
            {transactions.slice(0, 5).map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                    {transaction.type === "expense"
                      ? "💸"
                      : "💰"}
                  </div>

                  <div>
                    <p className="text-sm font-semibold">
                      {transaction.note ||
                        transaction.category}
                    </p>

                    <p className="text-xs text-gray-500">
                      {transaction.category} ·{" "}
                      {transaction.account}
                    </p>
                  </div>
                </div>

                <p
                  className={`text-sm font-semibold ${transaction.type === "expense"
                    ? "text-red-500"
                    : "text-green-600"
                    }`}
                >
                  {transaction.type === "expense"
                    ? "-"
                    : "+"}
                  {formatRupiah(transaction.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );

  const renderInput = () => (
    <section className="pt-7">
      <button
        onClick={() => setActiveTab("home")}
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

      {/* TYPE */}
      <div className="mt-6">
        <label className="text-sm font-semibold">
          Tipe Transaksi
        </label>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => setType("expense")}
            className={`rounded-xl border p-3 text-sm font-medium ${type === "expense"
              ? "border-black bg-black text-white"
              : "border-black/10 bg-white"
              }`}
          >
            💸 Pengeluaran
          </button>

          <button
            onClick={() => setType("income")}
            className={`rounded-xl border p-3 text-sm font-medium ${type === "income"
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
            value={amount}
            onChange={(event) => {
              setAmount(
                formatInputAmount(event.target.value)
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
          value={category}
          onChange={(event) =>
            setCategory(event.target.value)
          }
          className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3 outline-none"
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {/* ACCOUNT */}
      <div className="mt-5">
        <label className="text-sm font-semibold">
          Rekening
        </label>

        <select
          value={account}
          onChange={(event) =>
            setAccount(event.target.value)
          }
          className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3 outline-none"
        >
          {accounts.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {/* DATE */}
      <div className="mt-5">
        <label className="text-sm font-semibold">
          Tanggal
        </label>

        <input
          type="date"
          value={date}
          onChange={(event) =>
            setDate(event.target.value)
          }
          className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3 outline-none"
        />
      </div>

      {/* NOTE */}
      <div className="mt-5">
        <label className="text-sm font-semibold">
          Catatan
        </label>

        <textarea
          value={note}
          onChange={(event) =>
            setNote(event.target.value)
          }
          placeholder="Contoh: Nasi Padang depan kampus"
          rows={3}
          className="mt-2 w-full resize-none rounded-xl border border-black/10 bg-white p-3 outline-none"
        />
      </div>

      {/* SAVE */}
      <button
        onClick={saveTransaction}
        className="mt-6 w-full rounded-xl bg-[#ffa500] p-4 font-bold text-black shadow-sm transition active:scale-[0.98]"
      >
        Simpan Transaksi
      </button>
    </section>
  );

  const renderScan = () => (
    <section className="pt-7">
      <h2 className="text-2xl font-bold">
        Scan Nota
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        Fitur OCR akan kita sambungkan setelah Quick Add.
      </p>

      <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
        <div className="text-5xl">
          📷
        </div>

        <p className="mt-4 font-semibold">
          Scan Nota
        </p>

        <p className="mt-1 text-sm text-gray-500">
          Upload atau ambil foto nota.
        </p>

        <button className="mt-5 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white">
          Pilih Foto
        </button>
      </div>
    </section>
  );

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
          transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
            >
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">
                    {transaction.note ||
                      transaction.category}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {transaction.category} ·{" "}
                    {transaction.account}
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    {transaction.date}
                  </p>
                </div>

                <p
                  className={`font-semibold ${transaction.type === "expense"
                    ? "text-red-500"
                    : "text-green-600"
                    }`}
                >
                  {transaction.type === "expense"
                    ? "-"
                    : "+"}
                  {formatRupiah(transaction.amount)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );

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

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#171717]">

      {/* HEADER */}
      <header className="sticky top-0 z-10 border-b border-black/5 bg-[#f7f7f5]/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-4">
          <button
            onClick={() => setActiveTab("home")}
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

        {activeTab === "home" && renderHome()}

        {activeTab === "input" && renderInput()}

        {activeTab === "scan" && renderScan()}

        {activeTab === "data" && renderData()}

      </div>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">

          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs transition ${activeTab === item.id
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