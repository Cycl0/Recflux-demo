'use client';
import VideoBackground from "@/components/VideoBackground";
import PlanCard from "@/components/PlanCard";
import NavBar from "@/components/NavBar";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from "@/utils/supabaseClient";

export default function PlanosPage() {
    const router = useRouter();
    const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStripeCustomerId() {
            const { data: authUserData, error: authUserError } = await supabase.auth.getUser();
            if (authUserError || !authUserData?.user?.email) {
                setStripeCustomerId(null);
                setLoading(false);
                return;
            }
            const userEmail = authUserData.user.email;
            const { data: customUser, error: customUserError } = await supabase
                .from('users')
                .select('stripe_customer_id')
                .eq('email', userEmail)
                .single();
            if (customUserError || !customUser) {
                setStripeCustomerId(null);
            } else {
                setStripeCustomerId(customUser.stripe_customer_id);
            }
            setLoading(false);
        }
        fetchStripeCustomerId();
    }, []);

    const handleSubscribe = async (priceId: string) => {
        if (!stripeCustomerId) {
            alert('Usuário não autenticado ou Stripe Customer ID não encontrado. Faça login novamente.');
            return;
        }
        const res = await fetch('/api/stripe/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                priceId,
                customerId: stripeCustomerId,
            }),
        });
        const data = await res.json();
        if (data.url) {
            window.location.href = data.url;
        } else {
            alert('Erro ao criar sessão de pagamento');
        }
    };

    return (
        <>
            <NavBar extra={null} />
            <div className="relative min-h-screen text-white pt-24">
                <VideoBackground />
                <div className="relative container mx-auto px-4 z-10">
                    <h1 className="text-3xl sm:text-4x1 font-bold text-center mb-8 sm:mb-12 text-white">
                        Nossos Planos
                    </h1>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 md:gap-8 lg:gap-10">
                        <PlanCard
                            title="Basic"
                            price="free"
                            color="bg-gradient-to-r from-teal-600 to-teal-800"
                            features={[
                                { text: "feature 1", available: true },
                                { text: "feature 2", available: true },
                                { text: "restriction 1", available: false },
                            ]}
                        />
                        <PlanCard
                            title="Premium"
                            price="$59"
                            color="bg-gradient-to-r from-purple-600 to-purple-800"
                            features={[
                                { text: "feature 1", available: true },
                                { text: "feature 2", available: true },
                                { text: "feature 3", available: true },
                            ]}
                            priceId="price_1RWQ6t2LODbcMK9P2MS9ljZm" // replace with your real Stripe Price ID
                            onSubscribe={() => handleSubscribe('price_1RWQ6t2LODbcMK9P2MS9ljZm')}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
