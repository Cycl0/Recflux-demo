'use client';

import { useState, useEffect } from 'react';
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Image } from "@heroui/image";
import { Badge } from "@heroui/badge";
import { Chip } from "@heroui/chip";
import { Progress } from "@heroui/progress";
import { Link } from "@heroui/link";
import { Divider } from "@heroui/divider";
import { motion } from 'framer-motion';
import CTAButton from '@/components/CTAButton';

export default function NFTGameHome() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const nftCollections = [
    {
      id: 1,
      name: "Pixel Warriors",
      price: "0.5 ETH",
      image: "https://cdn-magnific.freepik.com/result_FLUX_DEV_95aae44b-bf23-497b-9e05-8bd8f14b088c_0.jpeg?token=exp=1757115616~hmac=f550f16aec4e18582b6081f25a7c21cd02a094c71b75dc9c433c5d1bd1fba269",
      rarity: "Legendary",
      progress: 85
    },
    {
      id: 2,
      name: "Cyber Knights",
      price: "0.3 ETH",
      image: "https://cdn-magnific.freepik.com/result_FLUX_DEV_a0b90c80-975c-496d-b1fb-14d58208847c_0.jpeg?token=exp=1757115635~hmac=927ec00ddfc84137e631d7ea91f2414732c569f76be478cbf083f155c658bc92",
      rarity: "Epic",
      progress: 92
    },
    {
      id: 3,
      name: "Mystic Mages",
      price: "0.8 ETH",
      image: "https://cdn-magnific.freepik.com/result_FLUX_DEV_1d46f621-049a-4e8b-ab3a-a0d421108d6b_0.jpeg?token=exp=1757115647~hmac=569b125f47286aad5e306a86bc2dcbe5990a97dc11e55f4cd6066189c451d35a",
      rarity: "Mythic",
      progress: 78
    }
  ];

  const gameFeatures = [
    {
      title: "Play-to-Earn",
      description: "Ganhe recompensas em criptomoedas jogando e completando missões",
      icon: "gamepad"
    },
    {
      title: "NFTs Únicos",
      description: "Colecione personagens e itens exclusivos com propriedades raras",
      icon: "gem"
    },
    {
      title: "Batalhas PvP",
      description: "Compita contra outros jogadores em arenas épicas",
      icon: "swords"
    },
    {
      title: "Crafting",
      description: "Forje novos itens e melhore seus equipamentos",
      icon: "hammer"
    },
    {
      title: "Guildas",
      description: "Junte-se a guildas e participe de guerras territoriais",
      icon: "castle"
    },
    {
      title: "Eventos",
      description: "Participe de eventos especiais e torneios semanais",
      icon: "trophy"
    }
  ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f23]">
      {/* Hero Section with Video Background */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            muted
            loop
            className="w-full h-full object-cover opacity-30"
          >
            <source src="https://videos.pexels.com/video-files/11063871/11063871-hd_1280_720_60fps.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e]/80 via-[#16213e]/60 to-[#0f0f23]/90"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-6xl md:text-8xl font-bold text-white mb-6">
              <span className="bg-gradient-to-r from-[#ff4500] via-[#8a2be2] to-[#4169e1] bg-clip-text text-transparent">
                Pixel Quest
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Entre no mundo dos NFTs e conquiste o reino dos pixels. 
              Colecione personagens únicos, batalhe contra outros jogadores 
              e ganhe recompensas em criptomoedas.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <CTAButton 
                text="Começar Jornada" 
                href="#mint" 
                glowingColor="#ff4500"
              />
              <Button
                as={Link}
                href="#gameplay"
                variant="bordered"
                size="lg"
                className="border-[#8a2be2] text-[#8a2be2] hover:bg-[#8a2be2]/20"
              >
                Ver Gameplay
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-[#4169e1]">10K+</div>
                <div className="text-gray-400 text-sm">Jogadores</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#ff4500]">5K+</div>
                <div className="text-gray-400 text-sm">NFTs Mintados</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#8a2be2]">50+</div>
                <div className="text-gray-400 text-sm">Personagens</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#ff8c00]">100K+</div>
                <div className="text-gray-400 text-sm">ETH em Recompensas</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-gray-400 rounded-full mt-2 animate-bounce"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="gameplay" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              <span className="bg-gradient-to-r from-[#ff4500] to-[#8a2be2] bg-clip-text text-transparent">
                Recursos do Jogo
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Descubra todas as funcionalidades que tornam Pixel Quest único no mundo dos jogos NFT
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {gameFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="bg-[#1a1a1a]/80 border border-[#8a2be2]/20 hover:border-[#8a2be2]/40 transition-all duration-300 hover:transform hover:scale-105">
                  <CardBody className="p-6 text-center">
                    <div className="text-4xl mb-4">{feature.icon}</div>
                    <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                    <p className="text-gray-300">{feature.description}</p>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* NFT Collections Section */}
      <section id="mint" className="py-20 px-4 bg-[#16213e]/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              <span className="bg-gradient-to-r from-[#4169e1] to-[#8a2be2] bg-clip-text text-transparent">
                Colecionáveis NFT
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Colecione personagens únicos com habilidades especiais e propriedades raras
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {nftCollections.map((nft, index) => (
              <motion.div
                key={nft.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="bg-[#1a1a1a]/80 border border-gray-700 hover:border-[#ff4500]/50 transition-all duration-300 overflow-hidden">
                  <CardHeader className="p-0">
                    <Image
                      src={nft.image}
                      alt={nft.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-4 right-4">
                      <Badge
                        color={nft.rarity === 'Legendary' ? 'warning' : nft.rarity === 'Epic' ? 'secondary' : 'primary'}
                        variant="solid"
                      >
                        {nft.rarity}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardBody className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{nft.name}</h3>
                        <p className="text-[#4169e1] font-semibold">{nft.price}</p>
                      </div>
                      <Chip color="success" variant="dot">
                        Disponível
                      </Chip>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-300 mb-2">
                        <span>Raridade</span>
                        <span>{nft.progress}%</span>
                      </div>
                      <Progress
                        value={nft.progress}
                        color={nft.rarity === 'Legendary' ? 'warning' : nft.rarity === 'Epic' ? 'secondary' : 'primary'}
                        size="sm"
                      />
                    </div>

                    <Button
                      color="primary"
                      variant="shadow"
                      className="w-full bg-gradient-to-r from-[#ff4500] to-[#8a2be2] text-white font-semibold"
                    >
                      Mintar Agora
                    </Button>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <CTAButton 
              text="Ver Todos NFTs" 
              href="/nfts" 
              glowingColor="#8a2be2"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-[#ff4500]/20 via-[#8a2be2]/20 to-[#4169e1]/20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Pronto para Começar?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Junte-se a milhares de jogadores e comece sua jornada no mundo dos NFTs hoje mesmo.
              Colecione, batalhe e ganhe!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <CTAButton 
                text="Criar Conta" 
                href="/signup" 
                glowingColor="#4169e1"
              />
              <Button
                as={Link}
                href="/whitepaper"
                variant="bordered"
                size="lg"
                className="border-[#4169e1] text-[#4169e1] hover:bg-[#4169e1]/20"
              >
                Ler Whitepaper
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f0f23] py-12 px-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-bold text-white mb-4">Pixel Quest</h3>
              <p className="text-gray-400 mb-4">
                O jogo NFT definitivo com estilo pixel art. Colecione, batalhe e ganhe 
                no mundo dos criptogames.
              </p>
              <div className="flex gap-4">
                <Link href="#" className="text-gray-400 hover:text-[#ff4500] transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </Link>
                <Link href="#" className="text-gray-400 hover:text-[#8a2be2] transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </Link>
                <Link href="#" className="text-gray-400 hover:text-[#4169e1] transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.300 24 12c0-6.627-5.373-12-12-12z"/>
                  </svg>
                </Link>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Jogo</h4>
              <ul className="space-y-2">
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Personagens</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Marketplace</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Batalhas</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Guildas</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Comunidade</h4>
              <ul className="space-y-2">
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Discord</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Twitter</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Fórum</Link></li>
              </ul>
            </div>
          </div>
          
          <Divider className="my-8 bg-gray-800" />
          
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 Pixel Quest. Todos os direitos reservados.
            </p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                Termos de Serviço
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                Política de Privacidade
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}