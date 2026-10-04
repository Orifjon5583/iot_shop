const {
  banEmail,
  unbanEmail,
  getBannedEmails,
  banIp,
  unbanIp,
  getBannedIps,
} = require('../utils/banManager');

const action = process.argv[2];
const target = process.argv[3];
const extra = process.argv[4];

if (action === 'list') {
  const ips = getBannedIps();
  const emails = getBannedEmails();

  console.log('\n=============================================================');
  console.log('       KIBERXAVFSIZLIK: BLOKLANGANLAR RO\'YXATI');
  console.log('=============================================================');

  console.log('\n--- 1. Butun umrga bloklangan Gmail / Email hisoblar: ---');
  if (emails.length === 0) {
    console.log('Hech qanday email bloklanmagan.');
  } else {
    emails.forEach((item, index) => {
      console.log(`${index + 1}. Email: ${item.email} | Sabab: ${item.reason} | Sana: ${new Date(item.bannedAt).toLocaleString()}`);
    });
  }

  console.log('\n--- 2. Butun umrga bloklangan IP lar va Qurilmalar: ---');
  if (ips.length === 0) {
    console.log('Hech qanday IP bloklanmagan.');
  } else {
    ips.forEach((item, index) => {
      console.log(`${index + 1}. IP: ${item.ip} | Qurilma ID: ${item.device || 'N/A'} | Sabab: ${item.reason} | Sana: ${new Date(item.bannedAt).toLocaleString()}`);
    });
  }
  console.log('=============================================================\n');
} else if (action === 'ban-email') {
  if (!target) {
    console.log('Foydalanish: node scripts/security.js ban-email <GMAIL_MANZIL> [sabab]');
    process.exit(1);
  }
  const reason = extra || 'Admin tomonidan butun umrga bloklandi';
  banEmail(target, reason);
  console.log(`[MUVAFFAQIYATLI] ${target} Gmail hisobi BUTUN UMRGA bloklandi! U saytga boshqa kira olmaydi.`);
} else if (action === 'unban-email') {
  if (!target) {
    console.log('Foydalanish: node scripts/security.js unban-email <GMAIL_MANZIL>');
    process.exit(1);
  }
  const ok = unbanEmail(target);
  if (ok) {
    console.log(`[MUVAFFAQIYATLI] ${target} hisobi blokdan chiqarildi.`);
  } else {
    console.log(`[DIQQAT] ${target} ro'yxatda topilmadi.`);
  }
} else if (action === 'ban-ip') {
  if (!target) {
    console.log('Foydalanish: node scripts/security.js ban-ip <IP_MANZIL> [sabab]');
    process.exit(1);
  }
  const reason = extra || 'Admin tomonidan butun umrga bloklandi';
  banIp(target, reason);
  console.log(`[MUVAFFAQIYATLI] ${target} IP manzili BUTUN UMRGA bloklandi!`);
} else if (action === 'unban-ip') {
  if (!target) {
    console.log('Foydalanish: node scripts/security.js unban-ip <IP_MANZIL>');
    process.exit(1);
  }
  const ok = unbanIp(target);
  if (ok) {
    console.log(`[MUVAFFAQIYATLI] ${target} IP manzili blokdan chiqarildi.`);
  } else {
    console.log(`[DIQQAT] ${target} ro'yxatda topilmadi.`);
  }
} else {
  console.log(`
Kiberxavfsizlik boshqaruv buyruqlari:
  node scripts/security.js list                    - Barcha bloklangan IP va Gmail larni ko'rish
  node scripts/security.js ban-email <EMAIL>       - Gmail hisobini BUTUN UMRGA bloklash
  node scripts/security.js unban-email <EMAIL>     - Gmail hisobini blokdan chiqarish
  node scripts/security.js ban-ip <IP>             - IP manzilni BUTUN UMRGA bloklash
  node scripts/security.js unban-ip <IP>           - IP manzilni blokdan chiqarish
  `);
}
