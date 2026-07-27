const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const cron = require('node-cron');

const rates = JSON.parse(fs.readFileSync('./rates.json'));

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false 
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('👇 Scan karne ke liye QR Code below:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            console.log('✅ WhatsApp Bot Successfully Connected!\n');

            // 🔍 Sabhi Channels ki ID yahan dikhegi
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
                console.log('Channels print karne me error:', e);
            }
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut);
            if (shouldReconnect) startBot();
        }
    });

    // Daily Photo Posting Schedule
    cron.schedule('0 10 * * *', async () => {
        // Yahan terminal se mili ID paste karni hai
        const channelJid = 'PASTE_YOUR_CHANNEL_ID_HERE'; 
        
        if (fs.existsSync('./photo')) {
            const files = fs.readdirSync('./photo');
            if (files.length > 0) {
                const imageToPost = files[0];
                await sock.sendMessage(channelJid, {
                    image: fs.readFileSync(`./photo/${imageToPost}`),
                    caption: '🔥 Aaj ki Nayi Deal! Order karne ke liye inbox karein.'
                });
                fs.unlinkSync(`./photo/${imageToPost}`);
                console.log(`✅ Daily Post Sent: ${imageToPost}`);
            }
        }
    });

    // Auto Rate Reply
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').toLowerCase().trim();

        if (rates[text]) {
            const replyText = `${rates[text]}\n\nPlease send your order.`;
            await sock.sendMessage(from, { text: replyText });
        }
    });
}

startBot();