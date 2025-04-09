const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const xlsx = require('xlsx');
const fs = require('fs');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('✅ Cliente WhatsApp está pronto!');

    const arquivo = 'arquivo_convertido.xlsx';

    if (!fs.existsSync(arquivo)) {
        console.error('❌ Arquivo não encontrado!');
        process.exit(1);
    }

    const workbook = xlsx.readFile(arquivo);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const dados = xlsx.utils.sheet_to_json(sheet, { range: 3 });

    if (dados.length === 0) {
        console.error('❌ A planilha está vazia!');
        process.exit(1);
    }

    for (const linha of dados) {
        const nome = linha.Nome;
        const numero = linha.FoneCelular;

        if (!numero) {
            console.log('⚠️ Linha com número de celular ausente:', linha);
            continue;
        }

        let formatted_phone = numero
            .replace("(", "")
            .replace(")", "")
            .replace("-", "")
            .replace(/ /g, "");

        formatted_phone = "55" + formatted_phone;

        const turma = linha.Turma;           

        const mensagem = `
Seja bem-vindo(a), Colleger ${nome}!

A sua turma do curso de ${linha.Turma} está *CONFIRMADA*, e, com isso, queremos te passar algumas informações importantes:

Suas aulas ocorrerão semanalmente.

O nosso endereço é: *Prédio WSTC | Avenida Washington Soares, 3663 - Edson Queiroz - Torre 02 - 4° andar - Salas 401 a 412;*.

Chegue com antecedência de 15 minutos e traga um documento de identificação com foto para fazer seu cadastro na portaria, conhecer nosso ambiente e iniciar sua jornada com a gente!

A saída para pedestres após as 20H deverá ser pela Portaria 2 (saída lateral do térreo do prédio);

Você não necessita trazer notebook, pois disponibilizaremos tudo o que você precisa para as aulas.

Caso traga o seu notebook, não se preocupe, pois temos Wi-Fi liberado para você navegar à vontade: "Digital College - Hotspot" e a senha é digitalcollege.

Participe das nossas Comunidades de Vagas, clicando em uma das opções abaixo, de acordo com o seu curso;

Ficou com alguma dúvida? Entre em contato com o Atendimento ao Aluno através do WhatsApp (85) 99753-0095 a gente pelo WhatsApp clicando aqui: https://wa.me/5585997530095.`;

        if (!numero || !mensagem) {
            console.log('⚠️ Linha com dados incompletos ignorada:', linha);
            continue;
        }

        try {
            await client.sendMessage(`${formatted_phone}@c.us`, mensagem);
            console.log(`✅ Mensagem enviada para ${formatted_phone}`);
        } catch (erro) {
            console.error(`❌ Erro ao enviar mensagem para ${formatted_phone}:`, erro.message);
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log('📤 Envio finalizado.');
    process.exit(0);
});

client.initialize();
