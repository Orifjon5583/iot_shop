const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN || '8599837113:AAFrtE7-7g9f3aNFMZ7iW5VC-IVxPQIZZv8';

// Standart belgilangan Admin Chat ID lar ro'yxati
const DEFAULT_CHAT_IDS = ['8768213837', '7471884325'];

// Barcha admin chat ID larni olish
const getAdminChatIds = () => {
  const envIds = process.env.TELEGRAM_ADMIN_CHAT_ID
    ? process.env.TELEGRAM_ADMIN_CHAT_ID.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  return Array.from(new Set([...DEFAULT_CHAT_IDS, ...envIds]));
};

let bot = null;

if (token) {
  try {
    const isPolling = process.env.TELEGRAM_POLLING === 'true';
    bot = new TelegramBot(token, { polling: isPolling });

    if (isPolling) {
      bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(
          chatId,
          `Assalomu alaykum, <b>${msg.from.first_name || 'Admin'}</b>!\n\n` +
          `Siz Elektronikachi botiga muvaffaqiyatli ulandingiz.\n` +
          `Sizning Chat ID: <code>${chatId}</code>\n\n` +
          `Endi saytdagi barcha buyurtmalar va murojaatlar sizga avtomatik yuboriladi!`,
          { parse_mode: 'HTML' }
        );
      });
    }
  } catch (err) {
    console.error('Telegram botni ishga tushirishda xatolik:', err.message);
  }
}

// Barcha adminlarga xabar tarqatish (Broadcast)
const broadcastToAdmins = async (message) => {
  if (!bot) return;
  const chatIds = getAdminChatIds();

  await Promise.allSettled(
    chatIds.map(async (chatId) => {
      try {
        await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
      } catch (err) {
        if (err.message && err.message.includes('chat not found')) {
          console.warn(`[TELEGRAM] ChatId ${chatId} hali botga /start bosmagan. Iltimos, t.me/elektronikachi_bot ga kirib Start bosing.`);
        } else {
          console.error(`[TELEGRAM] ChatId ${chatId} ga xabar yuborishda xatolik:`, err.message);
        }
      }
    })
  );
};

// ─── 1. Yangi Buyurtma xabarnomasi ───────────────────────────────────────────
const sendOrderNotification = async (order, items, user) => {
  try {
    const itemsList = (items || []).map(i => `▫️ <b>${i.name}</b> (x${i.quantity}) — ${Number(i.price).toLocaleString()} UZS`).join('\n');
    
    let paymentData = {};
    if (order.payment) {
      try { paymentData = typeof order.payment === 'string' ? JSON.parse(order.payment) : order.payment; } catch (e) {}
    }

    const message = `
🛒 <b>YANGI BUYURTMA QABUL QILINDI!</b> #\u200E${order.txId || order.id.slice(-6)}
━━━━━━━━━━━━━━━━━━━━
👤 <b>Mijoz:</b> ${paymentData.cardHolder || user?.username || 'Noma\'lum'}
📞 <b>Telefon:</b> ${paymentData.phone || user?.phone || 'Kiritilmagan'}
📍 <b>Yetkazish manzili:</b> ${order.shippingAddress || 'Kiritilmagan'}
📝 <b>Izoh:</b> ${order.note || 'Yo\'q'}

📦 <b>Mahsulotlar:</b>
${itemsList || 'Tafsilot yo\'q'}

💰 <b>Jami summa:</b> <b>${Number(order.total).toLocaleString()} UZS</b>
━━━━━━━━━━━━━━━━━━━━
⏰ <i>Sana: ${new Date().toLocaleString('uz-UZ')}</i>
    `;

    await broadcastToAdmins(message);
  } catch (error) {
    console.error('Telegramga buyurtma xabarnomasini yuborishda xatolik:', error.message);
  }
};

// ─── 2. Yangi Murojaat (Aloqa formasi) xabarnomasi ───────────────────────────
const sendMessageNotification = async (msgData) => {
  try {
    const message = `
📩 <b>SAYTDAN YANGI MUROJAAT KELDI!</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>Ism:</b> ${msgData.name}
📧 <b>Email:</b> ${msgData.email}
📞 <b>Telefon:</b> ${msgData.phone || 'Kiritilmagan'}
📌 <b>Mavzu:</b> <b>${msgData.subject}</b>

💬 <b>Xabar matni:</b>
<i>"${msgData.message}"</i>
━━━━━━━━━━━━━━━━━━━━
⏰ <i>Sana: ${new Date().toLocaleString('uz-UZ')}</i>
    `;

    await broadcastToAdmins(message);
  } catch (error) {
    console.error('Telegramga murojaat xabarnomasini yuborishda xatolik:', error.message);
  }
};

// ─── 3. Kiberxavfsizlik va Hujum Ogohlantirishi ──────────────────────────────
const sendSecurityAlert = async ({ ip, device, email, reason }) => {
  try {
    const message = `
🚨 <b>KIBERXAVFSIZLIK: HUJUM QAYTARILDI VA BLOKLANDI!</b>
━━━━━━━━━━━━━━━━━━━━
🌐 <b>IP manzil:</b> <code>${ip}</code>
📱 <b>Qurilma ID:</b> <code>${device || 'N/A'}</code>
👤 <b>Gmail / Hisob:</b> ${email || 'Anonim hujumchi'}
⚠️ <b>Sabab:</b> ${reason}
🔒 <b>Jazo:</b> BUTUN UMRGA TO'LIQ BLOKLANDI
━━━━━━━━━━━━━━━━━━━━
⏰ <i>Vaqt: ${new Date().toLocaleString('uz-UZ')}</i>
    `;

    await broadcastToAdmins(message);
  } catch (error) {
    console.error('Telegramga kiberxavfsizlik xabarini yuborishda xatolik:', error.message);
  }
};

module.exports = {
  bot,
  sendOrderNotification,
  sendMessageNotification,
  sendSecurityAlert,
  getAdminChatIds,
};
