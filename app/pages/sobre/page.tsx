'use client';
import NavBar from '@/components/NavBar';
import { useSupabaseUser } from '@/utils/useSupabaseUser';
import NavStyledDropdown from '@/components/NavStyledDropdown';
import TesteAgoraButton from '@/components/TesteAgoraButton';

export default function SobrePage() {
  const { user, loading } = useSupabaseUser();
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

  return (
    <>
      <NavBar extra={navExtra} />
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#15171c] via-[#232733] to-[#0e7490] dark:from-[#15171c] dark:via-[#232733] dark:to-[#0e7490] p-8">
        <div className="max-w-2xl w-full rounded-2xl shadow-2xl p-8 text-center border border-cyan-700/30 bg-[#181c23]/80 dark:bg-[#181c23]/80 backdrop-blur-xl backdrop-saturate-150">
          <h1 className="text-4xl font-bold mb-4 text-cyan-300 drop-shadow-lg">Sobre o Recflux</h1>
          <p className="text-lg text-cyan-100 mb-6">
            O Recflux é uma plataforma moderna para criação, edição e gestão de projetos de código, pensada para desenvolvedores, estudantes e equipes que buscam produtividade, aprendizado e criatividade em um só lugar.
          </p>
          <p className="text-md text-cyan-200 mb-4">
            Com o Recflux, você pode criar projetos, editar arquivos de código com um editor avançado, acompanhar o histórico de versões, e contar com assistência inteligente via chat para dúvidas ou geração de código. O sistema de planos permite acesso a recursos premium para quem busca ainda mais poder e flexibilidade.
          </p>
          <ul className="text-left text-cyan-100 mb-6 list-disc list-inside mx-auto max-w-md">
            <li><b>Criação e organização de projetos</b> pessoais ou colaborativos</li>
            <li><b>Editor de código</b> moderno e intuitivo</li>
            <li><b>Controle de versões</b> para acompanhar o progresso</li>
            <li><b>Assistente de chat com IA</b> para dúvidas e geração de código</li>
            <li><b>Planos premium</b> para recursos avançados</li>
          </ul>
          <p className="text-md text-cyan-200">
            Nosso objetivo é tornar o desenvolvimento mais acessível, produtivo e colaborativo. Seja bem-vindo ao Recflux!
          </p>
        </div>
      </div>
    </>
  );
} 