"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PlanCard from "@/components/PlanCard"; // Adjusted path
import { CheckCircle, Cancel } from '@mui/icons-material';

interface LineItem {
  description: string;
}

interface PaymentDetails {
  id: string;
  amount_total: number;
  currency: string;
  customer_email: string;
  status: string;
  line_items: LineItem[];
}


function SuccessPageContent() {
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
        console.log("Fetched payment details:", data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [sessionId]);

  const purchasedPlanDescriptions = details?.line_items?.map(item => item.description.toLowerCase()) || [];

  const purchasedPlans = {
    premium: purchasedPlanDescriptions.some(desc => desc.includes('assinatura')),
    credits: purchasedPlanDescriptions.some(desc => desc.includes('créditos')),
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-indigo-900 text-white px-4 py-8">
      <div className="bg-white/10 backdrop-blur-2xl border border-blue-300/30 shadow-2xl rounded-3xl p-8 max-w-4xl w-full relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none rounded-3xl border-2 border-blue-400/40 blur-[2px] animate-pulse" style={{boxShadow: '0 0 40px 10px rgba(59,130,246,0.15)'}} />
        <h1 className="text-3xl font-bold mb-4 text-center drop-shadow-lg">Pagamento realizado com sucesso!</h1>
        {loading && <p className="text-center">Carregando detalhes do pagamento...</p>}
        {error && <p className="text-red-400 text-center">Erro: {error}</p>}

        {details && (
          <div className="mt-8 flex flex-col md:flex-row gap-8 justify-center items-center">
            {purchasedPlans.premium && (
              <PlanCard
                title="Premium"
                price="Adquirido"
                priceSubtext=""
                features={[
                  { text: "10 Projetos", available: true },
                  { text: "500 Créditos por mês", available: true },
                  { text: "Suporte 24h", available: true },
                ]}
                color=""
                hasButton={false}
                buttonText="Adquirido"
              />
            )}
            {purchasedPlans.credits && (
              <PlanCard
                title="Créditos"
                price="Adquirido"
                priceSubtext=""
                features={[
                    { text: "200 Créditos", available: true },
                    { text: "Não expira", available: true },
                    { text: "Uso imediato", available: true },
                ]}
                color=""
                hasButton={false}
                buttonText="Adquirido"
                isSpecial
              />
            )}
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
        <button
            className="w-full sm:w-auto py-3 px-6 rounded-xl bg-gradient-to-r from-blue-500/80 to-indigo-600/80 text-white font-semibold shadow-lg hover:from-blue-400 hover:to-indigo-500 transition-all duration-200 border border-blue-300/40 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-blue-300/60 focus:ring-offset-2 focus:ring-offset-blue-900"
          onClick={() => router.push('/pages/editor')}
        >
          Voltar para o Editor
        </button>
          <button
            className="w-full sm:w-auto py-3 px-6 rounded-xl bg-gradient-to-r from-white/20 to-white/10 text-white font-semibold shadow-lg hover:from-white/30 hover:to-white/20 transition-all duration-200 border border-white/30 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-blue-900"
            onClick={() => router.push('/pages/planos')}
          >
            Ver Planos
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-indigo-900 text-white px-4">
        <div className="bg-white/10 backdrop-blur-2xl border border-blue-300/30 shadow-2xl rounded-3xl p-8 max-w-md w-full relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none rounded-3xl border-2 border-blue-400/40 blur-[2px] animate-pulse" style={{boxShadow: '0 0 40px 10px rgba(59,130,246,0.15)'}} />
          <h1 className="text-3xl font-bold mb-4 text-center drop-shadow-lg">Carregando...</h1>
          <p className="text-center">Verificando detalhes do pagamento...</p>
        </div>
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  );
} 