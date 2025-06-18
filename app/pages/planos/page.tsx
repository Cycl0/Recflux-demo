'use client';
import VideoBackground from "@/components/VideoBackground";
import PlanCard from "@/components/PlanCard";
import NavBar from "@/components/NavBar";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from "@/utils/supabaseClient";
import { useSupabaseUser } from '@/utils/useSupabaseUser';
import NavStyledDropdown from '@/components/NavStyledDropdown';
import TesteAgoraButton from '@/components/TesteAgoraButton';
import SplineBackground from "@/components/SplineBackground";

export default function PlanosPage() {
    const router = useRouter();
    const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const { user, loading: userLoading } = useSupabaseUser();
    let navExtra = null;
    if (!userLoading) {
        if (user) {
            const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")?.[0] || "";
            const email = user.email;
            const avatarUrl = user.user_metadata?.avatar_url || "/images/icon.png";
            const handleLogout = async () => {
                await import('@/utils/supabaseClient').then(({ supabase }) => supabase.auth.signOut());
                if (typeof window !== 'undefined') window.location.reload();
            };
            navExtra = (
                <NavStyledDropdown
                    name={name}
                    email={email}
                    avatarUrl={avatarUrl}
                    onLogout={handleLogout}
                    mode="simple"
                />
            );
        } else {
            navExtra = <TesteAgoraButton />;
        }
    }

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
            <NavBar extra={navExtra} />
            <div className="relative min-h-screen text-white pt-24">
                <SplineBackground url="https://prod.spline.design/BKTBtT5vYVQ8pfce/scene.splinecode" />
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
                                { text: "1 Projeto", available: true },
                                { text: "5 Modificações", available: true },
                                { text: "Suporte 24h", available: false },
                            ]}
                            hasButton={false}
                        />
                        <PlanCard
                            title="Premium"
                            price="$59"
                            color="bg-gradient-to-r from-purple-600 to-purple-800"
                            features={[
                                { text: "10 Projetos", available: true },
                                { text: "50 Modificações", available: true },
                                { text: "Suporte 24h", available: true },
                            ]}
                            priceId="price_1RbUoL2LODbcMK9PfX6Ilsf3" // replace with your real Stripe Price ID
                            onSubscribe={() => handleSubscribe('price_1RbUoL2LODbcMK9PfX6Ilsf3')}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
