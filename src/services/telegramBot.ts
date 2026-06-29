import axios from 'axios';

const TELEGRAM_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID || '';

const TELEGRAM_API = 'https://api.telegram.org/bot' + TELEGRAM_TOKEN;

export interface TelegramMessage {
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown';
  replyMarkup?: any;
}

export const sendMessage = async (message: TelegramMessage) => {
  try {
    const response = await axios.post(TELEGRAM_API + '/sendMessage', {
      chat_id: message.chatId || TELEGRAM_CHAT_ID,
      text: message.text,
      parse_mode: message.parseMode || 'HTML',
      reply_markup: message.replyMarkup
    });
    return response.data;
  } catch (error) {
    console.error('Telegram хабар юборишда хатолик:', error);
    throw error;
  }
};

export const sendMessageToUser = async (chatId: string, text: string) => {
  return sendMessage({ chatId, text });
};

export const sendMessageToGroup = async (text: string) => {
  return sendMessage({ chatId: TELEGRAM_CHAT_ID, text });
};

export const sendVisitReminder = async (doctorName: string, date: string, time: string, chatId?: string) => {
  const text = '📅 **Визит эслатмаси**\n\n' +
    '👨‍⚕️ Врач: ' + doctorName + '\n' +
    '📆 Сана: ' + date + '\n' +
    '🕐 Вақт: ' + time + '\n\n' +
    '⚠️ Визитга ' + getTimeRemaining(date, time) + ' қолди!';
  
  return sendMessage({
    chatId: chatId || TELEGRAM_CHAT_ID,
    text,
    parseMode: 'Markdown'
  });
};

export const sendPaymentReminder = async (doctorName: string, amount: number, chatId?: string) => {
  const text = '💰 **Тўлов эслатмаси**\n\n' +
    '👨‍⚕️ Врач: ' + doctorName + '\n' +
    '💵 Сумма: ' + amount.toLocaleString() + ' сўм\n' +
    '📅 Муддат: ' + new Date().toLocaleDateString('uz-UZ') + '\n\n' +
    '⚠️ Тўлов муддати яқинлашмоқда!';
  
  return sendMessage({
    chatId: chatId || TELEGRAM_CHAT_ID,
    text,
    parseMode: 'Markdown'
  });
};

export const sendDebtReminder = async (doctorName: string, debt: number, chatId?: string) => {
  const text = '🔴 **Қарз эслатмаси**\n\n' +
    '👨‍⚕️ Врач: ' + doctorName + '\n' +
    '💳 Қарз миқдори: ' + debt.toLocaleString() + ' сўм\n\n' +
    '⚠️ Илтимос, қарзни ўз вақтида тўланг!';
  
  return sendMessage({
    chatId: chatId || TELEGRAM_CHAT_ID,
    text,
    parseMode: 'Markdown'
  });
};

export const sendWeeklyReport = async (data: any, chatId?: string) => {
  let productStatsText = '';
  data.productStats.forEach(function(p: any) {
    productStatsText = productStatsText + '• ' + p.name + ': ' + p.quantity + ' дона\n';
  });

  const text = '📊 **Ҳафталик ҳисобот**\n\n' +
    '📈 Жами сотув: ' + data.totalSales.toLocaleString() + ' сўм\n' +
    '💵 Жами комиссия: ' + data.totalCommission.toLocaleString() + ' сўм\n' +
    '👨‍⚕️ Фаол врачлар: ' + data.activeDoctors + '\n' +
    '📋 Бажарилган визитлар: ' + data.completedVisits + '\n' +
    '📅 Режаланган визитлар: ' + data.plannedVisits + '\n\n' +
    '📊 Препаратлар статистикаси:\n' + productStatsText;
  
  return sendMessage({
    chatId: chatId || TELEGRAM_CHAT_ID,
    text,
    parseMode: 'Markdown'
  });
};

const getTimeRemaining = (date: string, time: string): string => {
  const visitDate = new Date(date + 'T' + time);
  const now = new Date();
  const diff = visitDate.getTime() - now.getTime();
  
  if (diff < 0) return 'вақт ўтган';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return hours + ' соат ' + minutes + ' дақиқа';
};
