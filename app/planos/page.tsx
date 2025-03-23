import VideoBackground from "@/components/VideoBackground";
import PlanCard from "@/components/PlanCard";
import NavBar from "@/components/NavBar";

export default function PlanosPage() {
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
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
