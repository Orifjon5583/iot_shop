const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN || '8599837113:AAFrtE7-7g9f3aNFMZ7iW5VC-IVxPQIZZv8';
const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

let bot = null;

if (token) {
  try {
    // Agar standalone ishga tushirilsa yoki polling belgilangan bo'lsa
    const isPolling = process.env.TELEGRAM_POLLING === 'true';
    bot = new TelegramBot(token, { polling: isPolling });

    if (isPolling) {
      bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(
          chatId,
          `Assalomu alaykum, <b>${msg.from.first_name || 'Admin'}</b>!\n\n` +
          `Sizning Telegram Chat ID: <code>${chatId}</code>\n\n` +
          `Ushbu Chat ID ni serverdagi <code>.env</code> fayliga <code>TELEGRAM_ADMIN_CHAT_ID=${chatId}</code> qilib kiriting. ` +
          `Shundan so'ng saytdagi barcha buyurtmalar, murojaatlar va kiberxavfsizlik xabarlari shu yerga keladi!`,
          { parse_mode: 'HTML' }
        );
      });
    }
  } catch (err) {
    console.error('Telegram botni ishga tushirishda xatolik:', err.message);
  }
}

// ─── 1. Yangi Buyurtma xabarnomasi ───────────────────────────────────────────
const sendOrderNotification = async (order, items, user) => {
  const targetChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || adminChatId;
  if (!bot || !targetChatId) {
    console.log('Telegram bot yoki TELEGRAM_ADMIN_CHAT_ID sozlanmagan. Buyurtma ID:', order.id);
    return;
  }

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

    await bot.sendMessage(targetChatId, message, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Telegramga buyurtma xabarnomasini yuborishda xatolik:', error.message);
  }
};

// ─── 2. Yangi Murojaat (Aloqa formasi) xabarnomasi ───────────────────────────
const sendMessageNotification = async (msgData) => {
  const targetChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || adminChatId;
  if (!bot || !targetChatId) return;

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

    await bot.sendMessage(targetChatId, message, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Telegramga murojaat xabarnomasini yuborishda xatolik:', error.message);
  }
};

// ─── 3. Kiberxavfsizlik va Hujum Ogohlantirishi ──────────────────────────────
const sendSecurityAlert = async ({ ip, device, email, reason }) => {
  const targetChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || adminChatId;
  if (!bot || !targetChatId) return;

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

    await bot.sendMessage(targetChatId, message, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Telegramga kiberxavfsizlik xabarini yuborishda xatolik:', error.message);
  }
};

module.exports = {
  bot,
  sendOrderNotification,
  sendMessageNotification,
  sendSecurityAlert,
};
