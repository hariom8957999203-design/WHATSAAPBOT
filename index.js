const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const cron = require('node-cron');
const express = require('express');

// 🌐 1. RENDER KE PORT TIMEOUT ERROR KO FIX KARNE KE LIYE WEB SERVER
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('🤖 WhatsApp Bot is Live and Running 24/7!');
});

app.listen(PORT, () => {
    console.log(`🌐 Dummy Web Server listening on port ${PORT}`);
});

// 📁 Rates & Photos Load
const rates = JSON.parse(fs.readFileSync('./rates.json'));

let photoLinks = [
    "https://raw.githubusercontent.com/hariom8957999203-design/WHATSAAPBOT/main/image_search_1740367422108.jpg",
    "https://raw.githubusercontent.com/hariom8957999203-design/WHATSAAPBOT/main/image_search_1740649401847.jpg"
];

// 🚀 2. WHATSAPP BOT ENGINE
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            console.log('\n===========================================');
            console.log('🎉 BOOM! Bot Server Par Direct Live Ho Gaya!');
            console.log('===========================================\n');

            try {
                const channels = await sock.newsletterSubscribed();
                console.log('📌 AAPKE CHANNELS KI LIST:');
                channels.forEach(ch => {
                    console.log(`Naam: ${ch.name}`);
                    console.log(`ID  : ${ch.id}`);
                    console.log('-----------------------------------');
                });
            } catch (e) {
                console.log('Channel list fetch note:', e.message);
            }
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut);
            if (shouldReconnect) startBot();
        }
    });

    // 🕒 Daily Shaam 7:00 PM Post
    cron.schedule('0 19 * * *', async () => {
        const channelJid = 'YOUR_CHANNEL_ID@newsletter';
        
        if (photoLinks.length > 0) {
            const currentImageLink = photoLinks[0];
            await sock.sendMessage(channelJid, {
                image: { url: currentImageLink },
                caption: '🔥 Aaj ki Nayi Deal! Order karne ke liye inbox karein.'
            });
            console.log(`✅ Daily Post Sent: ${currentImageLink}`);
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
