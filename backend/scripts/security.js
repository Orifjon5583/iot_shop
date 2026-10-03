const fs = require('fs');
const path = require('path');

const BLACKLIST_FILE = path.join(__dirname, '..', 'config', 'ip_blacklist.json');

const action = process.argv[2];
const targetIp = process.argv[3];

const loadData = () => {
  if (!fs.existsSync(BLACKLIST_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(BLACKLIST_FILE, 'utf8'));
  } catch {
    return {};
  }
};

const saveData = (data) => {
  fs.writeFileSync(BLACKLIST_FILE, JSON.stringify(data, null, 2), 'utf8');
};

if (action === 'list') {
  const data = loadData();
  const now = Date.now();
  const list = Object.entries(data).filter(([_, ban]) => ban.bannedUntil > now);

  console.log('\n--- Hozirda Bloklangan IP lar va Qurilmalar ro\'yxati ---');
  if (list.length === 0) {
    console.log('Hech qanday IP yoki qurilma bloklanmagan.');
  } else {
    list.forEach(([ip, ban]) => {
      const remainingHours = Math.ceil((ban.bannedUntil - now) / 3600000);
      const remainingDays = (remainingHours / 24).toFixed(1);
      console.log(`IP: ${ip} | Qurilma ID: ${ban.deviceFingerprint || 'N/A'} | Sabab: ${ban.reason} | Qolgan vaqt: ~${remainingHours} soat (${remainingDays} kun) | Blok muddati: ${new Date(ban.bannedUntil).toLocaleString()}`);
    });
  }
  console.log('----------------------------------------------------------\n');
} else if (action === 'unban') {
  if (!targetIp) {
    console.log('Iltimos, IP manzilni kiriting: node scripts/security.js unban <IP_MANZIL>');
    process.exit(1);
  }
  const data = loadData();
  if (data[targetIp]) {
    delete data[targetIp];
    saveData(data);
    console.log(`[MUVAFFAQIYATLI] ${targetIp} blokdan chiqarildi!`);
  } else {
    console.log(`[DIQQAT] ${targetIp} ro'yxatda topilmadi.`);
  }
} else if (action === 'ban') {
  if (!targetIp) {
    console.log('Iltimos, IP manzilni kiriting: node scripts/security.js ban <IP_MANZIL> [soatlar]');
    process.exit(1);
  }
  const hours = parseFloat(process.argv[4] || '48');
  const data = loadData();
  const now = Date.now();
  data[targetIp] = {
    ip: targetIp,
    bannedAt: now,
    bannedUntil: now + hours * 60 * 60 * 1000,
    reason: 'Admin tomonidan qo\'lda bloklandi',
    status: 'MANUAL_BAN',
  };
  saveData(data);
  console.log(`[MUVAFFAQIYATLI] ${targetIp} ${hours} soatga (${(hours/24).toFixed(1)} kun) bloklandi!`);
} else {
  console.log(`
Kiberxavfsizlik boshqaruv buyruqlari:
  node scripts/security.js list              - Barcha bloklangan IP larni ko'rish
  node scripts/security.js unban <IP>        - IP ni blokdan chiqarish
  node scripts/security.js ban <IP> [soat]   - IP ni qo'lda bloklash (standart: 48 soat)
  `);
}
