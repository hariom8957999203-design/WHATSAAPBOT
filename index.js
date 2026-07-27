const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const cron = require('node-cron');

const rates = JSON.parse(fs.readFileSync('./rates.json'));

let photoLinks = [
    "https://raw.githubusercontent.com/hariom8957999203-design/WHATSAAPBOT/main/image_search_1740367422108.jpg",
    "https://raw.githubusercontent.com/hariom8957999203-design/WHATSAAPBOT/main/image_search_1740649401847.jpg"
];

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    // 📱 PAIRING CODE GENERATION (Apna Country Code + Mobile Number Yahan Dalein)
    // Example: 919876543210 (Bina '+' sign ke)
    const phoneNumber = "91XXXXXXXXXX"; // 👈 YAHAN APNA WHATSAPP NUMBER DALEIN

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            let code = await sock.requestPairingCode(phoneNumber);
            console.log('\n==================================');
            console.log(`🔑 AAPKA PAIRING CODE HAI: ${code}`);
            console.log('==================================\n');
        }, 3000);
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            console.log('✅ WhatsApp Bot Successfully Connected!\n');

            try {
                const channels = await sock.newsletterSubscribed();
                console.log('===================================');
                console.log('📌 AAPKE WHATSAPP CHANNELS KI LIST:');
                channels.forEach(ch => {
                    console.log(`Naam: ${ch.name}`);
                    console.log(`ID  : ${ch.id}`);
                    console.log('-----------------------------------');
                });
                console.log('===================================\n');
            } catch (e) {
                console.log('Channel ID dekhne me issue:', e.message);
            }
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut);
            if (shouldReconnect) startBot();
        }
    });

    // 🕒 7:00 PM Daily Post
    cron.schedule('0 19 * * *', async () => {
        const channelJid = 'YOUR_CHANNEL_ID@newsletter';
        
        if (photoLinks.length > 0) {
            const currentImageLink = photoLinks[0];
            await sock.sendMessage(channelJid, {
                image: { url: currentImageLink },
                caption: '🔥 Aaj ki Nayi Deal! Order karne ke liye inbox karein.'
            });
            console.log(`✅ Shaam 7 baje Daily Post Sent: ${currentImageLink}`);
            photoLinks.shift();
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    // 🤖 Customer Rate Auto Reply
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').toLowerCase().trim();

        if (rates[text]) {
            await sock.sendMessage(from, { text: rates[text] });
        }
    });
}

startBot();
