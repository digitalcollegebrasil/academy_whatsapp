document.addEventListener('DOMContentLoaded', () => {
  const ws = new WebSocket('ws://localhost:3000');

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === 'qr') {
      const qrContainer = document.getElementById('qrcode');
      qrContainer.innerHTML = '';
      QRCode.toCanvas(message.data, { width: 300 }, function (error, canvas) {
        if (error) console.error(error);
        qrContainer.appendChild(canvas);
      });
    }
  };

  // Função para verificar o status da API
  const checkApiStatus = async () => {
    try {
      const response = await fetch('http://localhost:3000/status');
      const data = await response.json();
      const statusText = data.status === 'Conectado' ? 'API Conectada' : 'API Desconectada';
      document.getElementById('status').textContent = statusText;
    } catch (error) {
      console.error("Erro ao obter o status da API:", error);
      document.getElementById('status').textContent = 'Erro ao conectar com a API';
    }
  };

  // Verifica o status da API quando a página for carregada
  checkApiStatus();

  // Configura para verificar o status a cada 1 minuto (60.000 milissegundos)
  setInterval(checkApiStatus, 60000);

  document.getElementById('sendForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Previne o comportamento padrão do formulário

    console.log("Formulário enviado (sem recarregar a página)"); // Adicione este log para verificar
    
    const number = document.getElementById('number').value;
    const message = document.getElementById('message').value;

    try {
      console.log("Enviando mensagem para", number);
      const res = await fetch('http://localhost:3000/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number, message })
      });

      const data = await res.json();
      console.log(data);

      if (res.ok) {
        document.getElementById('sendResult').textContent = data.success;
        document.getElementById('sendResult').style.color = 'green';
      } else {
        document.getElementById('sendResult').textContent = data.error || 'Erro desconhecido';
        document.getElementById('sendResult').style.color = 'red';
      }

    } catch (err) {
      console.error("Erro ao conectar com o servidor:", err);
      document.getElementById('sendResult').textContent = 'Erro ao conectar com o servidor.';
      document.getElementById('sendResult').style.color = 'red';
    }
  });

  let planilha = [];
  let planilhaData = [];

  document.getElementById('excelFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      const primeiraAba = workbook.SheetNames[0];
      planilha = XLSX.utils.sheet_to_json(workbook.Sheets[primeiraAba], { header: 1 });

      const headers = planilha[0];
      planilhaData = planilha.slice(1);

      const headerSelector = document.getElementById('headerRowSelector');
      headerSelector.innerHTML = '';

      for (let i = 0; i < Math.min(10, planilha.length); i++) {
        const preview = planilha[i].join(' | ');
        headerSelector.innerHTML += `<option value="${i}">Linha ${i + 1}: ${preview}</option>`;
      }

      const colNumber = document.getElementById('colNumber');
      
      colNumber.innerHTML = '';

      headers.forEach((col, idx) => {
        const option = `<option value="${idx}">${col}</option>`;
        colNumber.innerHTML += option;
      });

      console.log(`Planilha carregada com ${planilhaData.length} registros`);
      document.getElementById('batchResult').textContent = `Planilha carregada com ${planilhaData.length} registros`;
    };

    reader.readAsArrayBuffer(file);
  });

  async function enviarMensagensPlanilha() {
    const colNumIdx = parseInt(document.getElementById('colNumber').value);
    console.log('Coluna selecionada:', colNumIdx);
  
    const headerRow = parseInt(document.getElementById('headerRowSelector').value);
    console.log('Linha de cabeçalho selecionada:', headerRow);
  
    const headers = planilha[headerRow];
    console.log('Cabeçalhos:', headers);
  
    if (!headers) {
      console.error('Cabeçalhos não encontrados para a linha selecionada');
      return;
    }
  
    const template = document.getElementById('templateMessage').value;
  
    let enviados = 0;
  
    for (let i = headerRow + 1; i < planilhaData.length; i++) {
      const linha = planilhaData[i];
      if (!linha || !linha[colNumIdx]) continue;
  
      const rawNumber = linha[colNumIdx]?.toString();
      if (!rawNumber) continue;
  
      const number = '55' + rawNumber.replace(/\D/g, '');
  
      const dataObj = {};
      headers.forEach((key, index) => {
        dataObj[key] = linha[index];
      });
  
      const message = template.replace(/\$\{([^}]+)\}/g, (_, key) => dataObj[key.trim()] || '');
  
      try {
        const res = await fetch('http://localhost:3000/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number, message })
        });
  
        const result = await res.json();
        if (res.ok) enviados++;
      } catch (error) {
        console.error('Erro ao enviar para:', number, error);
      }
  
      await new Promise(resolve => setTimeout(resolve, 8000));
    }
  
    document.getElementById('batchResult').textContent = `Mensagens enviadas: ${enviados}`;
  }

  document.getElementById('sendMessagesButton').addEventListener('click', enviarMensagensPlanilha);

  document.getElementById('headerRowSelector').addEventListener('change', (e) => {
    const selectedHeaderIndex = parseInt(e.target.value);
    const selectedHeaderRow = planilhaData[selectedHeaderIndex - 1];
  
    if (!selectedHeaderRow) {
      console.error('Linha de cabeçalho inválida selecionada');
      return;
    }
  
    const colNumber = document.getElementById('colNumber');
    colNumber.innerHTML = '';
  
    selectedHeaderRow.forEach((col, idx) => {
      const option = `<option value="${idx}">${col}</option>`;
      colNumber.innerHTML += option;
    });
  });
});