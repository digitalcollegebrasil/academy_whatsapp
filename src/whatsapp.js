const fs = require('fs');
const logStream = fs.createWriteStream('log.txt', { flags: 'a' });

const originalLog = console.log;
const originalError = console.error;

const log = (...args) => {
    const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : a)).join(' ');
    logStream.write(`[${new Date().toISOString()}] ${message}\n`);
    originalLog(...args);
};

const error = (...args) => {
    const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : a)).join(' ');
    logStream.write(`[${new Date().toISOString()}] ERROR: ${message}\n`);
    originalError(...args);
};

console.log = log;
console.error = error;

const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const WebSocket = require('ws');
const path = require('path');
const multer = require('multer');
const os = require('os');

let client;
let wss;
let server;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

function createClient() {
    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: path.join(os.homedir(), 'wwebjs_data')
        }),
        puppeteer: {
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    client.on('qr', (qr) => {
        console.log('📱 QR Code gerado');
        if (wss) {
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'qr', data: qr }));
                }
            });
        }
    });

    client.on('ready', () => {
        console.log('✅ Cliente do WhatsApp está pronto!');
        
        if (wss) {
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'connected' }));
                }
            });
        }
    });

    client.on('auth_failure', (msg) => {
        console.error('❌ Falha na autenticação:', msg);
    });
    
    client.on('disconnected', async (reason) => {
        console.warn('⚠️ Cliente desconectado:', reason);
        await restartClient();
    });

    client.initialize();

    client.once('ready', async () => {
        if (client.pupBrowser) {
            client.pupBrowser.on('disconnected', async () => {
                console.warn('🚪 Chrome foi fechado manualmente. Reiniciando cliente...');
                await restartClient();
            });
        }
    });
}

async function restartClient() {
    try {
        console.warn('♻️ Reiniciando cliente do WhatsApp...');
        if (client) await client.destroy();
        await new Promise(resolve => setTimeout(resolve, 1000));

        const sessionPath = path.join(os.homedir(), 'wwebjs_data');
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log('🗑️ Sessão apagada para reinicialização!');
        }

        createClient();
    } catch (err) {
        console.error('Erro ao reiniciar o cliente:', err);
    }
}

function startWhatsApp() {
    createClient();

    const app = express();
    app.use(express.json());

    const baseDelay = 10000;
    let messageCount = 0;

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    app.post('/send-message', upload.array('files'), async (req, res) => {
        const { number, message } = req.body;
        const files = req.files;

        if (!number || !message) {
            return res.status(400).json({ error: 'Número e mensagem são necessários!' });
        }

        const cleanNumber = number.replace(/\D/g, '');

        if (cleanNumber.length < 12 || cleanNumber.length > 13) {
            return res.status(400).json({ error: 'Número inválido!' });
        }

        let consecutiveFailures = 0;

        const trySend = async (num) => {
            const chatId = num + '@c.us';

            try {
                await delay(currentDelay);
                await client.sendMessage(chatId, message);
                console.log(`✅ Mensagem enviada para ${num}`);
                messageCount++;
                consecutiveFailures = 0;

                if (files && files.length > 0) {
                    for (const file of files) {
                        const media = new MessageMedia(file.mimetype, file.buffer.toString('base64'), file.originalname);
                        await delay(currentDelay);
                        await client.sendMessage(chatId, media);
                        console.log(`✅ Arquivo ${file.originalname} enviado para ${num}`);
                        messageCount++;
                    }
                }

                return true;
            } catch (err) {
                console.error(`Erro ao enviar mensagem para ${num}:`, err);
                consecutiveFailures++;
                if (consecutiveFailures >= 5) {
                    console.warn('🚨 Falhas consecutivas detectadas. Reiniciando cliente...');
                    await restartClient();
                    consecutiveFailures = 0;
                }
                return false;
            }
        };

        const variations = [cleanNumber];

        if (cleanNumber.length === 12) {
            const prefix = cleanNumber.slice(0, 4);
            const rest = cleanNumber.slice(4);
            const com9 = prefix + '9' + rest;
            if (!variations.includes(com9)) variations.push(com9);
        }

        if (cleanNumber.length === 13) {
            const prefix = cleanNumber.slice(0, 4);
            const rest = cleanNumber.slice(4);
            if (rest.charAt(0) === '9') {
                const sem9 = prefix + rest.slice(1);
                if (!variations.includes(sem9)) variations.push(sem9);
            }
        }

        let algumEnviado = false;

        for (const num of variations) {
            const enviado = await trySend(num);
            if (enviado) algumEnviado = true;
        }

        if (algumEnviado) {
            return res.status(200).json({ success: 'Mensagem e arquivos enviados com sucesso!' });
        } else {
            return res.status(400).json({ error: 'Não foi possível enviar a mensagem para nenhuma variação do número.' });
        }
    });

    let isResetting = false;

    app.post('/reset-session', async (req, res) => {
        console.log('Requisição recebida em /reset-session');
        if (isResetting) return res.status(429).json({ error: 'Reset em andamento.' });
        isResetting = true;
    
        try {
            if (client) await client.destroy();
            await new Promise(resolve => setTimeout(resolve, 1000));
    
            const sessionPath = path.join(os.homedir(), 'wwebjs_data');
            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                console.log('🗑️ Sessão apagada com sucesso!');
            }
    
            createClient();
            res.json({ message: 'Sessão resetada com sucesso.' });
        } catch (err) {
            console.error('Erro ao resetar a sessão:', err);
            res.status(500).json({ error: 'Erro ao resetar a sessão.' });
        } finally {
            isResetting = false;
        }
    });

    app.get('/', (req, res) => {
        res.send('Servidor WhatsApp está rodando!');
    });
    
    app.get('/status', (req, res) => {
        const status = client.info ? 'Conectado' : 'Desconectado';
        res.json({ status });
    });

    const PORT = process.env.PORT || 3000;

    server = app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });

    wss = new WebSocket.Server({ server });
}

module.exports = startWhatsApp;
