"use client";

import { useState } from "react";

type Transaction = {
    type: "expense" | "income";
    amount: number;
    category: string;
    subCategory: string;
    account: string;
    merchant: string;
    note: string;
    tag: string;
};

export default function QuickAddAI({
    onSaved,
}: {
    onSaved?: () => void;
}) {
    const [text, setText] = useState("");
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const analyze = async () => {
        if (!text.trim()) return;

        setLoading(true);
        setError("");
        setTransaction(null);

        try {
            const response = await fetch("/api/ai", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text: text.trim(),
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Gagal menganalisis transaksi.");
            }

            setTransaction(result.transaction);
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Gagal menganalisis transaksi."
            );
        } finally {
            setLoading(false);
        }
    };

    const saveTransaction = async () => {
        if (!transaction) return;

        setSaving(true);
        setError("");

        try {
            const now = new Date();

            const date = now.toISOString().split("T")[0];

            const time = now.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            });

            const response = await fetch("/api/transactions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...transaction,
                    date,
                    time,
                    source: "ai",
                    status: "confirmed",
                }),
            });

            const responseText = await response.text();

            let result;

            try {
                result = JSON.parse(responseText);
            } catch {
                throw new Error(
                    responseText.startsWith("<")
                        ? "Server mengembalikan halaman HTML, bukan response transaksi. Cek Apps Script deployment."
                        : "Response server tidak valid."
                );
            }

            if (!response.ok || !result.success) {
                throw new Error(
                    result.error || "Gagal menyimpan transaksi."
                );
            }

            setText("");
            setTransaction(null);

            if (onSaved) {
                onSaved();
            } else {
                window.location.reload();
            }
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Gagal menyimpan transaksi."
            );
        } finally {
            setSaving(false);
        }
    };

    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="mb-2 block text-sm font-medium">
                    Tulis transaksi
                </label>

                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder='Contoh: "tadi makan nasi padang 35rb pakai BNI"'
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
            </div>

            <button
                type="button"
                onClick={analyze}
                disabled={loading || !text.trim()}
                className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {loading ? "✨ Menganalisis..." : "✨ Analisis Transaksi"}
            </button>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            {transaction && (
                <div className="mt-6 border-t border-gray-100 pt-6">
                    <div className="mb-5">
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                            Hasil AI
                        </p>

                        <div className="mt-2 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {transaction.merchant ||
                                        transaction.note ||
                                        "Transaksi"}
                                </h3>

                                <p className="mt-1 text-sm text-gray-500">
                                    {transaction.type === "income"
                                        ? "Pemasukan"
                                        : "Pengeluaran"}
                                </p>
                            </div>

                            <div
                                className={`shrink-0 text-lg font-bold ${transaction.type === "income"
                                        ? "text-green-600"
                                        : "text-red-500"
                                    }`}
                            >
                                {transaction.type === "income" ? "+" : "-"}
                                {formatRupiah(transaction.amount)}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                        <div className="divide-y divide-gray-100">
                            <div className="flex items-center justify-between gap-4 px-4 py-3">
                                <span className="text-sm text-gray-500">
                                    Kategori
                                </span>

                                <span className="text-right text-sm font-medium text-gray-900">
                                    {transaction.category}
                                    {transaction.subCategory &&
                                        ` / ${transaction.subCategory}`}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-4 px-4 py-3">
                                <span className="text-sm text-gray-500">
                                    Rekening
                                </span>

                                <span className="text-sm font-medium text-gray-900">
                                    {transaction.account || "-"}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-4 px-4 py-3">
                                <span className="text-sm text-gray-500">
                                    Merchant
                                </span>

                                <span className="text-right text-sm font-medium text-gray-900">
                                    {transaction.merchant || "-"}
                                </span>
                            </div>

                            <div className="flex items-start justify-between gap-4 px-4 py-3">
                                <span className="shrink-0 text-sm text-gray-500">
                                    Catatan
                                </span>

                                <span className="text-right text-sm font-medium text-gray-900">
                                    {transaction.note || "-"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={saveTransaction}
                        disabled={saving}
                        className="mt-4 w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? "Menyimpan..." : "Simpan Transaksi"}
                    </button>
                </div>
            )}
        </div>
    );
}