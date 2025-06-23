import { supabase } from './supabaseClient';

export const CREDITS_PER_PROMPT = 10;

export interface CreditCheckResult {
  hasEnoughCredits: boolean;
  currentCredits: number;
  remainingCredits: number;
  message: string;
}

/**
 * Check if user has enough credits for a prompt submission
 */
export async function checkAndDeductCredits(userEmail: string): Promise<CreditCheckResult> {
  try {
    // Get current user credits from database
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('credits')
      .eq('email', userEmail)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch user credits: ${fetchError.message}`);
    }

    const currentCredits = userData?.credits || 0;

    // Check if user has enough credits
    if (currentCredits < CREDITS_PER_PROMPT) {
      return {
        hasEnoughCredits: false,
        currentCredits,
        remainingCredits: currentCredits,
        message: `Créditos insuficientes. Você tem ${currentCredits} créditos, mas precisa de ${CREDITS_PER_PROMPT} para enviar um prompt.`
      };
    }

    // Deduct credits
    const newCredits = currentCredits - CREDITS_PER_PROMPT;
    const { error: updateError } = await supabase
      .from('users')
      .update({ credits: newCredits })
      .eq('email', userEmail);

    if (updateError) {
      throw new Error(`Failed to deduct credits: ${updateError.message}`);
    }

    return {
      hasEnoughCredits: true,
      currentCredits,
      remainingCredits: newCredits,
      message: `${CREDITS_PER_PROMPT} créditos deduzidos. Você tem ${newCredits} créditos restantes.`
    };

  } catch (error) {
    console.error('Credit system error:', error);
    return {
      hasEnoughCredits: false,
      currentCredits: 0,
      remainingCredits: 0,
      message: 'Erro ao verificar créditos. Tente novamente.'
    };
  }
}

/**
 * Get current user credits without deducting
 */
export async function getCurrentCredits(userEmail: string): Promise<number> {
  try {
    const { data: userData, error } = await supabase
      .from('users')
      .select('credits')
      .eq('email', userEmail)
      .single();

    if (error) {
      console.error('Error fetching credits:', error);
      return 0;
    }

    return userData?.credits || 0;
  } catch (error) {
    console.error('Error fetching credits:', error);
    return 0;
  }
} 