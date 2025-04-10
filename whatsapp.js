const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const WebSocket = require('ws');

function startWhatsApp() {
    const client = new Client({
        authStrategy: new LocalAuth(),
    });

    let wss;

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
    });

    const app = express();
    app.use(express.json());

    app.post('/send-message', async (req, res) => {
        const { number, message } = req.body;

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
                console.log(`✅ Mensagem enviada para ${num}`);
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
            return res.status(200).json({ success: 'Mensagem enviada com sucesso!' });
        } else {
            return res.status(400).json({ error: 'Não foi possível enviar a mensagem.' });
        }
    });

    app.get('/', (req, res) => {
        res.send('Servidor WhatsApp está rodando!');
    });
    
    app.get('/status', (req, res) => {
        const status = client.info ? 'Conectado' : 'Desconectado';
        res.json({ status });
    });

    const server = app.listen(3000, () => {
        console.log('Servidor rodando na porta 3000');
    });

    wss = new WebSocket.Server({ server });

    client.initialize();
}

module.exports = startWhatsApp;
