const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

let client;
let wss;
let server;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

function createClient() {
    client = new Client({
        authStrategy: new LocalAuth(),
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

    client.initialize();
}

function startWhatsApp() {
    createClient()

    const app = express();
    app.use(express.json());

    app.post('/send-message', upload.array('files'), async (req, res) => {
        const { number, message } = req.body;
        const files = req.files;
    
        if (!number || !message) {
            return res.status(400).json({ error: 'Número e mensagem são necessários!' });
        }
    
        const cleanNumber = number.replace(/\D/g, '');
        if (cleanNumber.length < 10 || cleanNumber.length > 15) {
            return res.status(400).json({ error: 'Número inválido!' });
        }
    
        const trySend = async (num) => {
            const chatId = num + '@c.us';
            const isRegistered = await client.isRegisteredUser(chatId);
            if (!isRegistered) return false;
    
            try {
                await client.sendMessage(chatId, message);
    
                if (files.length > 0) {
                    for (const file of files) {
                        const media = new MessageMedia(file.mimetype, file.buffer.toString('base64'), file.originalname);
                        await client.sendMessage(chatId, media);
                    }
                }
    
                console.log(`✅ Mensagem e arquivos enviados para ${num}`);
                return true;
            } catch (err) {
                console.error(`Erro ao enviar mensagem para ${num}:`, err);
                return false;
            }
        };
    
        let sent = await trySend(cleanNumber);

        if (!sent) {
            if (cleanNumber.length === 13 && cleanNumber.charAt(4) === '9') {
                const numberWithoutNine = cleanNumber.slice(0, 4) + cleanNumber.slice(5);
                console.log(`🔁 Tentando sem o 9: ${numberWithoutNine}`);
                sent = await trySend(numberWithoutNine);
            } else if (cleanNumber.length === 12) {
                const numberWithNine = cleanNumber.slice(0, 4) + '9' + cleanNumber.slice(4);
                console.log(`🔁 Tentando com o 9: ${numberWithNine}`);
                sent = await trySend(numberWithNine);
            }
        }
    
        if (sent) {
            return res.json({ success: 'Mensagem e arquivos enviados com sucesso!' });
        } else {
            return res.status(500).json({ error: 'Erro ao enviar a mensagem e arquivos!' });
        }
    });

    let isResetting = false;

    app.post('/reset-session', async (req, res) => {
        if (isResetting) return res.status(429).json({ error: 'Reset em andamento.' });
        isResetting = true;
      
        try {
          if (client) await client.destroy();
          await new Promise(resolve => setTimeout(resolve, 1000));
      
          const authPath = path.join(__dirname, '.wwebjs_auth');
          const cachePath = path.join(__dirname, '.wwebjs_cache');
      
          if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
          if (fs.existsSync(cachePath)) fs.rmSync(cachePath, { recursive: true, force: true });
      
          await createClient();
      
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
