import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';

const functions = getFunctions();

// AI чат
export const callAIChat = async (prompt: string) => {
  try {
    const aiChat = httpsCallable(functions, 'aiChat');
    const result = await aiChat({ prompt });
    return result.data;
  } catch (error) {
    console.error('AI хатолик:', error);
    throw error;
  }
};

// Врачлар таҳлили
export const callAnalyzeDoctors = async () => {
  try {
    const analyze = httpsCallable(functions, 'analyzeDoctors');
    const result = await analyze({});
    return result.data;
  } catch (error) {
    console.error('Таҳлил хатолиги:', error);
    throw error;
  }
};

// Инвестиция тавсиялари
export const callInvestmentRecommendations = async () => {
  try {
    const recommendations = httpsCallable(functions, 'getInvestmentRecommendations');
    const result = await recommendations({});
    return result.data;
  } catch (error) {
    console.error('Инвестиция хатолиги:', error);
    throw error;
  }
};

// Сотув прогнози
export const callSalesForecast = async () => {
  try {
    const forecast = httpsCallable(functions, 'salesForecast');
    const result = await forecast({});
    return result.data;
  } catch (error) {
    console.error('Прогноз хатолиги:', error);
    throw error;
  }
};
