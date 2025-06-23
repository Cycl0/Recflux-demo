import { ReactNode } from "react";
import { CheckCircle, Cancel } from '@mui/icons-material'; // Importando os ícones

interface PlanCardProps {
    title: string;
    price: string;
    color: string; // Used only for the button now
    features: { text: string; available: boolean }[];
    priceId?: string;
    onSubscribe?: () => void;
    hasButton?: boolean;
    buttonText?: string;
    priceSubtext?: string;
    buttonColor?: string; // New prop for custom button colors
    isSpecial?: boolean; // For special highlighting (like credits)
}

const PlanCard = ({ 
    title, 
    price, 
    color, 
    features, 
    onSubscribe, 
    hasButton = true, 
    buttonText = "Assinar",
    priceSubtext = "por mês",
    buttonColor,
    isSpecial = false
}: PlanCardProps) => {
    return (
        <div className={`flex flex-col w-full sm:w-2/3 md:w-1/3 min-w-[200px] bg-white/10 backdrop-blur-lg border rounded-2xl shadow-2xl overflow-hidden transition-all hover:scale-105 hover:shadow-3xl ${
            isSpecial 
                ? 'border-emerald-400/50 ring-2 ring-emerald-400/30 shadow-emerald-400/20' 
                : 'border-white/20'
        }`}>
            <div className="p-6 text-white text-center">
                <h2 className="text-xl sm:text-2xl font-bold drop-shadow-lg text-white/90">{title}</h2>
                <p className="text-3xl sm:text-4xl font-extrabold my-2 text-white/95 drop-shadow-lg">{price}</p>
                <p className="text-xs sm:text-sm text-white/70">{priceSubtext}</p>
            </div>
            <div className="p-6 flex flex-col flex-1">
                <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 text-white/80 flex-1 ml-auto mr-auto">
                    {features.map((feature, index) => (
                        <li key={index} className={`flex items-center justify-start gap-2 ${!feature.available ? "opacity-50" : ""}`}>
                            <span className={feature.available ? "text-emerald-400" : "text-rose-400"}>
                                {feature.available ? <CheckCircle /> : <Cancel />}
                            </span>
                            <span className="text-base sm:text-lg font-medium">{feature.text}</span>
                        </li>
                    ))}
                </ul>
                {hasButton ? (
                <button 
                    className={`w-full py-3 ${buttonColor || color} hover:opacity-90 text-white font-semibold rounded-lg transition-all shadow-lg backdrop-blur-md bg-gradient-to-r from-white/20 to-white/10 border border-white/30`} 
                    onClick={onSubscribe}
                >
                    {buttonText}
                </button>
                ) : (
                    <button className={`w-full py-3 ${buttonColor || color} text-white font-semibold rounded-lg transition-all shadow-lg backdrop-blur-md bg-gradient-to-r from-white/20 to-white/10 border border-white/30`}>
                        Adquirido
                    </button>
                )}

            </div>
        </div>
    );
};

export default PlanCard;
