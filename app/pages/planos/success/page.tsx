"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface PaymentDetails {
  id: string;
  amount_total: number;
  currency: string;
  customer_email: string;
  status: string;
}

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<PaymentDetails | null>(null);

  useEffect(() => {
    async function fetchDetails() {
      if (!sessionId) {
        setError("No session ID found.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/stripe/session?session_id=${sessionId}`);
        if (!res.ok) throw new Error("Failed to fetch payment details");
        const data = await res.json();
        setDetails(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [sessionId]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-indigo-900 text-white px-4">
      <div className="bg-white/10 backdrop-blur-2xl border border-blue-300/30 shadow-2xl rounded-3xl p-8 max-w-md w-full relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none rounded-3xl border-2 border-blue-400/40 blur-[2px] animate-pulse" style={{boxShadow: '0 0 40px 10px rgba(59,130,246,0.15)'}} />
        <h1 className="text-3xl font-bold mb-4 text-center drop-shadow-lg">Pagamento realizado com sucesso!</h1>
        {loading && <p>Carregando detalhes do pagamento...</p>}
        {error && <p className="text-red-400">Erro: {error}</p>}
        {details && (
          <div className="space-y-2 mt-4">
            <p><span className="font-semibold">Email:</span> {details.customer_email}</p>
            <p><span className="font-semibold">Valor:</span> {(details.amount_total / 100).toLocaleString("pt-BR", { style: "currency", currency: details.currency.toUpperCase() })}</p>
            <p><span className="font-semibold">Status:</span> {details.status}</p>
          </div>
        )}
        <button
          className="mt-8 w-full py-3 rounded-xl bg-gradient-to-r from-blue-500/80 to-indigo-600/80 text-white font-semibold shadow-lg hover:from-blue-400 hover:to-indigo-500 transition-all duration-200 border border-blue-300/40 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-blue-300/60 focus:ring-offset-2 focus:ring-offset-blue-900"
          onClick={() => router.push('/pages/editor')}
        >
          Voltar para o Editor
        </button>
      </div>
    </div>
  );
} 