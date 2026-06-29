/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");

@"
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// ============================================
// AI CHAT FUNCTION
// ============================================
export const aiChat = functions.https.onCall(async (data, context) => {
  const { prompt } = data;
  
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Тизимга кириш талаб этилади.'
    );
  }

  try {
    const response = await generateAIResponse(prompt);
    return { success: true, response };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Хатолик: ' + error);
  }
});

// ============================================
// DOKTORLARNI TAHLIL QILISH
// ============================================
export const analyzeDoctors = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Кириш талаб этилади.');
  }

  try {
    const doctorsSnapshot = await admin.firestore().collection('doctors').get();
    const doctors = doctorsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const analysis = await analyzeDoctorsData(doctors);
    return { success: true, analysis };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Хатолик: ' + error);
  }
});

// ============================================
// INVESTMENT RECOMMENDATIONS
// ============================================
export const getInvestmentRecommendations = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Кириш талаб этилади.');
  }

  try {
    const doctorsSnapshot = await admin.firestore().collection('doctors').get();
    const doctors = doctorsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const recommendations = generateInvestmentRecommendations(doctors);
    return { success: true, recommendations };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Хатолик: ' + error);
  }
});

// ============================================
// SALES FORECAST
// ============================================
export const salesForecast = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Кириш талаб этилади.');
  }

  try {
    const salesSnapshot = await admin.firestore().collection('sales').get();
    const sales = salesSnapshot.docs.map(doc => doc.data());
    
    const forecast = calculateSalesForecast(sales);
    return { success: true, forecast };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Хатолик: ' + error);
  }
});

// ============================================
// YORDAMCHI FUNKSIYALAR
// ============================================

// AI жавоб генерацияси
async function generateAIResponse(prompt: string): Promise<string> {
  const responses = [
    'Анализ асосида 3 та врачга инвестиция бериш тавсия этилади.',
    'Энг фойдали врачлар: Алимов Али, Каримова Нигора.',
    'Жорий ойда сотувлар 15% га ошган.',
    'Қарздор врачлар билан ишлаш стратегиясини қайта кўриб чиқиш керак.',
    'Препаратлар бўйича энг кўп фойда Амаредетрим дан келяпти.',
    'Тошкент вилоятида сотувлар 25% га ошган.',
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// Врачлар таҳлили
async function analyzeDoctorsData(doctors: any[]): Promise<any> {
  const profitable = doctors.filter(d => d.debtStatus === 'profit');
  const debt = doctors.filter(d => d.debtStatus === 'debt');
  
  return {
    total: doctors.length,
    profitable: profitable.length,
    debt: debt.length,
    recommendations: [
      'Фойдали врачларга инвестицияни ошириш',
      'Қарздор врачлар билан ишлаш стратегиясини қайта кўриб чиқиш',
      'Врачларнинг AI рейтингини янгилаш'
    ],
    topDoctors: profitable.slice(0, 3).map(d => d.name)
  };
}

// Инвестиция тавсиялари
function generateInvestmentRecommendations(doctors: any[]): any[] {
  return doctors
    .filter(d => d.debtStatus === 'profit')
    .sort((a, b) => Math.abs(b.debt) - Math.abs(a.debt))
    .slice(0, 5)
    .map(d => ({
      doctorName: d.name,
      recommendedAmount: Math.abs(d.debt) * 1.2,
      reason: 'Фойдали врач, инвестицияни ошириш тавсия этилади'
    }));
}

// Сотув прогнози
function calculateSalesForecast(sales: any[]): any {
  const total = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const avg = total / (sales.length || 1);
  
  return {
    totalSales: total,
    average: avg,
    forecast: total * 1.15,
    growth: '15%'
  };
}
"@ | Out-File -FilePath functions/src/index.ts -Encoding utf8
// });
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// ============================================
// TELEGRAM BOT WEBHOOK
// ============================================
export const telegramWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      res.status(200).send('OK');
      return;
    }

    const chatId = message.chat.id;
    const text = message.text || '';

    // Командаларни қайта ишлаш
    if (text === '/start') {
      await sendTelegramMessage(chatId, '🤖 MedHelper CRM ботига хуш келибсиз!');
    } else if (text === '/help') {
      await sendTelegramMessage(chatId, getHelpMessage());
    } else if (text === '/visits') {
      await sendVisitsList(chatId);
    } else if (text === '/doctors') {
      await sendDoctorsList(chatId);
    } else if (text.startsWith('/send')) {
      // Хабар юбориш
    } else if (text.startsWith('/remind')) {
      await createReminder(chatId, text);
    } else {
      await sendTelegramMessage(chatId, 'Тушунмадим. /help ёрдам учун.');
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Telegram webhook хатолик:', error);
    res.status(500).send('Error');
  }
});

// Ёрдам хабари
function getHelpMessage(): string {
  return 
🤖 **MedHelper CRM Бот**

📋 **Командалар:**
/start - Ботни ишга тушириш
/help - Ёрдам
/visits - Бугунги визитлар
/doctors - Врачлар рўйхати
/send - Хабар юбориш
/remind - Эслатма яратиш

📌 **Эслатма:** Барча командаларни / билан бошланг.
  ;
}
