"use client";

import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Badge } from "@heroui/badge";
import { Avatar } from "@heroui/avatar";
import { Progress } from "@heroui/progress";
import { Divider } from "@heroui/divider";
import { Code } from "@heroui/code";
import { motion } from "framer-motion";
import CTAButton from "@/components/CTAButton";

const MotionCard = motion.create(Card);
const MotionDiv = motion.create("div");

export default function Home() {
  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20, 
      scale: 0.98 
    },
    visible: (index: number) => ({
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        delay: index * 0.15,
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1], // Much smoother easing curve
        type: "tween" // Remove spring for smoother motion
      }
    })
  };

  const roadmapItems = [
    { phase: "Phase 1", title: "Foundation", description: "Core infrastructure and basic features", status: "completed", progress: 100 },
    { phase: "Phase 2", title: "Enhanced UI", description: "Advanced components and animations", status: "in-progress", progress: 75 },
    { phase: "Phase 3", title: "AI Integration", description: "Smart features and automation", status: "upcoming", progress: 25 },
    { phase: "Phase 4", title: "Global Scale", description: "Worldwide deployment and optimization", status: "planned", progress: 0 }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative px-6 py-20 md:py-32 text-center overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            crossOrigin="anonymous"
            className="w-full h-full object-cover"
            onError={(e) => {
              console.log('Video failed to load:', e);
              // Hide video and show gradient background instead
              e.currentTarget.style.display = 'none';
            }}
            onCanPlay={() => console.log('Video can play')}
            onLoadStart={() => console.log('Video loading started')}
          >
            {/* Try multiple sources */}
            <source src="https://videos.pexels.com/video-files/11548675/11548675-uhd_3840_2160.mp4" type="video/mp4" />
            <source src="https://videos.pexels.com/video-files/11548675/11548675-hd_1920_1080.mp4" type="video/mp4" />
            {/* Fallback for browsers that don't support video */}
            Your browser does not support the video tag.
          </video>
          {/* Fallback gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-success/20"></div>
          {/* Video overlay for better text readability - adaptive for dark/light theme */}
          <div className="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-[1px]"></div>
        </div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-10">
          <MotionDiv 
            className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <MotionDiv 
            className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl"
            animate={{ 
              scale: [1.2, 1, 1.2],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </div>

        <MotionDiv
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl mx-auto relative z-20"
        >
          <Badge content="New" color="primary" className="mb-4">
            <Chip size="sm" color="primary" variant="flat">🚀 Version 2.0</Chip>
          </Badge>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-6">
            Hello, <span className="animate-pulse">Beautiful</span> World!
          </h1>
          
          <p className="text-lg md:text-xl text-white/90 dark:text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed">
            Welcome to the future of web development. Experience stunning UI components, 
            smooth animations, and cutting-edge design that brings your ideas to life.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <CTAButton 
              text="Get Started" 
              href="#cards" 
              glowingColor="#0070f3"
              className="transform hover:scale-105 transition-all duration-300"
            />
            <Button 
              size="lg" 
              variant="bordered" 
              className="font-semibold border-primary/50 text-primary hover:border-primary hover:text-white hover:bg-primary hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 backdrop-blur-sm bg-primary/10"
            >
              Learn More
            </Button>
          </div>
          
          <div className="flex justify-center items-center gap-8 text-small text-white/70">
            <div className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-full backdrop-blur-sm">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span>Live & Ready</span>
            </div>
            <Divider orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-full backdrop-blur-sm">
              <Avatar src="https://i.pravatar.cc/24?img=1" size="sm" />
              <span>Trusted by 10K+ users</span>
            </div>
          </div>
        </MotionDiv>
      </section>

      {/* Cards Section */}
      <section id="cards" className="px-6 py-16 bg-background/50 dark:bg-background/80">
        <div className="max-w-7xl mx-auto">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-default-600 max-w-2xl mx-auto">
              Discover the amazing capabilities that make our platform stand out
            </p>
          </MotionDiv>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const cardData: Array<{
                icon: string;
                title: string;
                chip: string;
                chipColor: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
                description: string;
                progress?: number;
                progressLabel?: string;
                badge?: { content: string; text: string; label: string };
                avatar?: { src: string; label: string };
                avatarGroup?: string[];
                version?: string;
                gradient: string;
                border: string;
                shadow: string;
              }> = [
                {
                  icon: "⚡",
                  title: "Lightning Fast",
                  chip: "Performance",
                  chipColor: "primary",
                  description: "Experience blazing fast load times and smooth interactions with our optimized architecture.",
                  progress: 95,
                  progressLabel: "95% faster than competitors",
                  gradient: "from-primary/5 to-primary/10",
                  border: "border-primary/20",
                  shadow: "rgba(0,112,243,0.15)"
                },
                {
                  icon: "🔒",
                  title: "Ultra Secure",
                  chip: "Security",
                  chipColor: "success",
                  description: "Bank-level encryption and security protocols to keep your data safe and protected.",
                  badge: { content: "SSL", text: "256-bit", label: "Encryption" },
                  gradient: "from-success/5 to-success/10",
                  border: "border-success/20",
                  shadow: "rgba(0,170,0,0.15)"
                },
                {
                  icon: "📈",
                  title: "Infinitely Scalable",
                  chip: "Scalability",
                  chipColor: "warning",
                  description: "From startup to enterprise, our platform grows with your needs seamlessly.",
                  progress: 100,
                  progressLabel: "Handles millions of requests",
                  gradient: "from-warning/5 to-warning/10",
                  border: "border-warning/20",
                  shadow: "rgba(245,158,11,0.15)"
                },
                {
                  icon: "📊",
                  title: "Smart Analytics",
                  chip: "Intelligence",
                  chipColor: "secondary",
                  description: "Gain deep insights with AI-powered analytics and real-time reporting.",
                  avatar: { src: "https://i.pravatar.cc/32?img=4", label: "Powered by AI" },
                  gradient: "from-secondary/5 to-secondary/10",
                  border: "border-secondary/20",
                  shadow: "rgba(147,51,234,0.15)"
                },
                {
                  icon: "🎧",
                  title: "24/7 Support",
                  chip: "Support",
                  chipColor: "danger",
                  description: "Round-the-clock expert support to help you succeed every step of the way.",
                  avatarGroup: [
                    "https://i.pravatar.cc/24?img=1",
                    "https://i.pravatar.cc/24?img=2",
                    "https://i.pravatar.cc/24?img=3"
                  ],
                  gradient: "from-danger/5 to-danger/10",
                  border: "border-danger/20",
                  shadow: "rgba(240,82,82,0.15)"
                },
                {
                  icon: "🚀",
                  title: "Cutting Edge",
                  chip: "Innovation",
                  chipColor: "default",
                  description: "Stay ahead with the latest technologies and innovative features updated regularly.",
                  version: "v2.0.1",
                  gradient: "from-default/5 to-default/10",
                  border: "border-default/20",
                  shadow: "rgba(0,0,0,0.15)"
                }
              ];

              const card = cardData[index];
              
              return (
                <MotionCard
                  key={index}
                  custom={index}
                  variants={cardVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px", amount: 0.3 }}
                  className={`bg-gradient-to-br ${card.gradient} border ${card.border} transition-all duration-200 ease-out`}
                  whileHover={{ 
                    y: -8, 
                    scale: 1.02,
                    boxShadow: `0 25px 50px ${card.shadow}`,
                    transition: { 
                      duration: 0.2, 
                      ease: [0.25, 0.1, 0.25, 1]
                    }
                  }}
                  whileTap={{ 
                    scale: 0.98,
                    transition: { duration: 0.1 }
                  }}
                >
                  <CardHeader className="flex-col items-start p-0">
                    <div className="w-full h-48 relative overflow-hidden rounded-t-large group">
                      <div 
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-500 ease-out group-hover:scale-110"
                        style={{
                          backgroundImage: `url('https://cdn-magnific.freepik.com/result_FLUX_DEV_6cd007f9-1a29-40f0-bfd6-6e2501e9ef91_0.jpeg?token=exp=1757434850~hmac=adc0812dd5dc197756a0b798fb69ade7eca5fd47fbbd3cb61ecde301e70e20e5')`
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 transition-opacity duration-300 group-hover:from-black/70 group-hover:via-black/30 group-hover:to-black/10" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className={`p-2 bg-white/20 backdrop-blur-md rounded-lg w-fit mb-2 border border-white/30`}>
                          <span className="text-2xl">{card.icon}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2 drop-shadow-lg">{card.title}</h3>
                        <Chip size="sm" color={card.chipColor} variant="solid" className="backdrop-blur-sm bg-white/90 text-black font-medium">{card.chip}</Chip>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody className="flex flex-col">
                    <p className="text-default-600 mb-4">{card.description}</p>
                    
                    <div className="mt-auto">
                      {card.progress && (
                        <>
                          <Progress 
                            value={card.progress} 
                            color={card.chipColor} 
                            className="mb-2" 
                            aria-label={`${card.title} rating: ${card.progress}%`} 
                          />
                          <p className="text-small text-default-500">{card.progressLabel}</p>
                        </>
                      )}
                      
                      {card.badge && (
                        <div className="flex items-center gap-2">
                          <Badge content={card.badge.content} color={card.chipColor} size="sm">
                            <Code>{card.badge.text}</Code>
                          </Badge>
                          <span className="text-small text-default-500">{card.badge.label}</span>
                        </div>
                      )}
                      
                      {card.avatar && (
                        <div className="flex gap-2">
                          <Badge content="AI" color={card.chipColor} size="sm">
                            <Avatar src={card.avatar.src} size="sm" />
                          </Badge>
                          <span className="text-small text-default-500">{card.avatar.label}</span>
                        </div>
                      )}
                      
                      {card.avatarGroup && (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {card.avatarGroup.map((src, i) => (
                              <Avatar key={i} src={src} size="sm" />
                            ))}
                          </div>
                          <span className="text-small text-default-500">Expert team</span>
                        </div>
                      )}
                      
                      {card.version && (
                        <Badge content="Latest" color={card.chipColor}>
                          <Code>{card.version}</Code>
                        </Badge>
                      )}
                    </div>
                  </CardBody>
                </MotionCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="px-6 py-16 bg-content1/50 dark:bg-content1/80">
        <div className="max-w-6xl mx-auto">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Development Roadmap</h2>
            <p className="text-default-600 max-w-2xl mx-auto">
              Follow our journey as we continue to innovate and deliver amazing features
            </p>
          </MotionDiv>

          <div className="space-y-6">
            {roadmapItems.map((item, index) => (
              <MotionDiv
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`relative overflow-visible ${
                  item.status === 'completed' ? 'border-success/50 bg-success/5' :
                  item.status === 'in-progress' ? 'border-primary/50 bg-primary/5' :
                  item.status === 'upcoming' ? 'border-warning/50 bg-warning/5' :
                  'border-default/50 bg-default/5'
                }`}>
                  <CardHeader className="flex gap-4">
                    <div className={`p-3 rounded-full ${
                      item.status === 'completed' ? 'bg-success/20 text-success' :
                      item.status === 'in-progress' ? 'bg-primary/20 text-primary' :
                      item.status === 'upcoming' ? 'bg-warning/20 text-warning' :
                      'bg-default/20 text-default-500'
                    }`}>
                      <span className="text-lg font-bold">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold">{item.title}</h3>
                        <Chip 
                          size="sm" 
                          color={
                            item.status === 'completed' ? 'success' :
                            item.status === 'in-progress' ? 'primary' :
                            item.status === 'upcoming' ? 'warning' :
                            'default'
                          }
                          variant="flat"
                        >
                          {item.phase}
                        </Chip>
                      </div>
                      <p className="text-default-600 mb-4">{item.description}</p>
                      <div className="flex items-center gap-4">
                        <Progress 
                          value={item.progress} 
                          color={
                            item.status === 'completed' ? 'success' :
                            item.status === 'in-progress' ? 'primary' :
                            item.status === 'upcoming' ? 'warning' :
                            'default'
                          }
                          className="flex-1"
                          aria-label={`${item.title} progress: ${item.progress}%`}
                        />
                        <span className="text-small text-default-500 min-w-12">{item.progress}%</span>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </MotionDiv>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 text-center bg-black text-white">
        <MotionDiv
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Transform</span> Your Ideas?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Join thousands of developers who are already building the future with our platform
          </p>
          <CTAButton 
            text="Start Building Now" 
            href="#get-started" 
            glowingColor="#f31260"
            className="transform hover:scale-105 transition-all duration-300"
          />
        </MotionDiv>
      </section>
    </div>
  );
}
