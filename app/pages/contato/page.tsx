'use client';
import { useState } from 'react';
import { useSupabaseUser } from '@/utils/useSupabaseUser';
import NavStyledDropdown from '@/components/NavStyledDropdown';
import TesteAgoraButton from '@/components/TesteAgoraButton';
import CreditsDisplay from '@/components/CreditsDisplay';
import NavBar from '@/components/NavBar';
import ProTag from '@/components/ProTag';
import { useRouter } from 'next/navigation';

export default function ContatoPage() {
  const { push } = useRouter();
  const { user, loading, credits, creditsLoading, subscriptionStatus } = useSupabaseUser();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  let navExtra = null;
  if (!loading) {
    if (user) {
      const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")?.[0] || "";
      const email = user.email;
      const avatarUrl = user.user_metadata?.avatar_url || "/images/icon.png";
      const handleLogout = async () => {
        await import('@/utils/supabaseClient').then(({ supabase }) => supabase.auth.signOut());
        if (typeof window !== 'undefined') window.location.reload();
      };
      navExtra = (
        <>
          <div className="flex items-center mr-4 cursor-pointer" onClick={() => {
            push('/pages/planos');
          }}>
            <CreditsDisplay credits={credits} loading={creditsLoading} />
            {subscriptionStatus === 'premium' && <ProTag />}
          </div>
          <NavStyledDropdown
            name={name}
            email={email}
            avatarUrl={avatarUrl}
            onLogout={handleLogout}
            mode="simple"
          />
        </>
      );
    } else {
      navExtra = <TesteAgoraButton />;
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      <NavBar extra={navExtra} />
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#15171c] via-[#232733] to-[#0e7490] dark:from-[#15171c] dark:via-[#232733] dark:to-[#0e7490] p-8">
        <div className="max-w-xl w-full rounded-2xl shadow-2xl p-8 text-center border border-cyan-700/30 bg-[#181c23]/80 dark:bg-[#181c23]/80 backdrop-blur-xl backdrop-saturate-150">
          <h1 className="text-4xl font-bold mb-4 text-cyan-300 drop-shadow-lg">Contato</h1>
          <p className="text-cyan-100 mb-6">Tem dúvidas, sugestões ou quer falar com a equipe do Recflux? Preencha o formulário abaixo e entraremos em contato!</p>
          {submitted ? (
            <div className="text-cyan-200 text-lg font-semibold py-8">Mensagem enviada com sucesso! Obrigado pelo contato.</div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <input
                type="text"
                name="name"
                placeholder="Seu nome"
                value={form.name}
                onChange={handleChange}
                required
                className="rounded-lg px-4 py-2 bg-white/90 dark:bg-white/10 text-gray-900 dark:text-cyan-100 border border-cyan-700/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 placeholder-gray-500 dark:placeholder-cyan-400"
              />
              <input
                type="email"
                name="email"
                placeholder="Seu e-mail"
                value={form.email}
                onChange={handleChange}
                required
                className="rounded-lg px-4 py-2 bg-white/90 dark:bg-white/10 text-gray-900 dark:text-cyan-100 border border-cyan-700/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 placeholder-gray-500 dark:placeholder-cyan-400"
              />
              <textarea
                name="message"
                placeholder="Sua mensagem"
                value={form.message}
                onChange={handleChange}
                required
                rows={5}
                className="rounded-lg px-4 py-2 bg-[#232733]/80 text-cyan-100 border border-cyan-700/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 placeholder-cyan-400 resize-none"
              />
              <button
                type="submit"
                className="mt-2 py-3 px-6 rounded-xl bg-cyan-600 text-white font-bold shadow-lg hover:bg-cyan-700 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              >
                Enviar
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
} 