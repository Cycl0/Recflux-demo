import { ReactNode } from "react";
import { CheckCircle, Cancel } from '@mui/icons-material'; // Importando os ícones

interface PlanCardProps {
    title: string;
    price: string;
    color: string;
    features: { text: string; available: boolean }[];
}

const PlanCard = ({ title, price, color, features }: PlanCardProps) => {
    return (
        <div className="flex flex-col w-full sm:w-2/3 md:w-1/3 min-w-[200px] bg-gray-600 rounded-xl shadow-lg overflow-hidden">
            <div className={`p-6 text-white text-center ${color}`}>
                <h2 className="text-xl sm:text-2x1 font-bold">{title}</h2>
                <p className="text:3x1 sm:text-4xl font-extrabold my-2">{price}</p>
                <p className="text-xs sm:text-sm">por mês</p>
            </div>
            <div className="p-6 flex flex-col flex-1">
                <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 text-gray-400 flex-1">
                    {features.map((feature, index) => (
                        <li key={index} className={`flex items-center gap-2 ${!feature.available && "opacity-50"}`}>
                            <span className={`text-${feature.available ? 'green' : 'red'}-500`}>
                                {feature.available ? <CheckCircle /> : <Cancel />}
                            </span>
                            {feature.text}
                        </li>
                    ))}
                </ul>
                <button className={`w-full py-3 ${color} hover:opacity-90 text-white font-semibold rounded-lg transition-all`}>
                    Assinar
                </button>
            </div>
        </div>
    );
};

export default PlanCard;
