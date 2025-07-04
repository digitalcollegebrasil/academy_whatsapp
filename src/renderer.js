document.addEventListener('DOMContentLoaded', () => {
  const PORT = window.localStorage.getItem('apiPort') || 3000;
  const ws = new WebSocket(`ws://localhost:${PORT}`);

  const baseURL = `http://localhost:${PORT}`;

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    const qrContainer = document.getElementById('qrcode');
    const status = document.getElementById('status');
  
    switch (message.type) {
      case 'qr':
        if (status.textContent !== 'API Conectada') {
          qrContainer.innerHTML = '';
          QRCode.toCanvas(message.data, { width: 300 }, function (error, canvas) {
            if (error) console.error(error);
            qrContainer.appendChild(canvas);
          });
        }
        break;
  
      case 'connected':
        qrContainer.innerHTML = '';
        status.textContent = 'API Conectada';
        break;
    }
  };

  const checkApiStatus = async () => {
    try {
      const response = await fetch(`${baseURL}/status`);
      const data = await response.json();
      const statusText = data.status === 'Conectado' ? 'API Conectada' : 'API Desconectada';
      document.getElementById('status').textContent = statusText;
    } catch (error) {
      console.error("Erro ao obter o status da API:", error);
      document.getElementById('status').textContent = 'Erro ao conectar com a API';
    }
  };

  checkApiStatus();

  setInterval(checkApiStatus, 60000);

  const fileInput = document.getElementById('files-individual-message');
  const fileNameDisplay = document.getElementById('fileNameDisplay');

  fileInput.addEventListener('change', (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      const names = Array.from(files).map(file => file.name).join(', ');
      fileNameDisplay.textContent = names;
    } else {
      fileNameDisplay.textContent = 'Nenhum arquivo selecionado';
    }
  });

  const excelInput = document.getElementById('excelFile');
  const excelInputDisplay = document.getElementById('excelFileName');

  excelInput.addEventListener('change', (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      const names = Array.from(files).map(file => file.name).join(', ');
      excelInputDisplay.textContent = names;
    } else {
      excelInputDisplay.textContent = 'Nenhum arquivo selecionado';
    }
  });

  const filesSheetInput = document.getElementById('files-sheets-message');
  const filesSheetDisplay = document.getElementById('filesSheetsFileName');

  filesSheetInput.addEventListener('change', (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      const names = Array.from(files).map(file => file.name).join(', ');
      filesSheetDisplay.textContent = names;
    } else {
      filesSheetDisplay.textContent = 'Nenhum arquivo selecionado';
    }
  });
  
  document.getElementById('resetConnection').addEventListener('click', async () => {
    const confirmacao = confirm("Tem certeza que deseja refazer a conexão? Isso irá apagar os dados de autenticação.");
    if (!confirmacao) return;
  
    try {
      const res = await fetch(`${baseURL}/reset-session`, {
        method: 'POST'
      });
  
      const data = await res.json();
  
      if (res.ok) {
        document.getElementById('resetResult').textContent = data.message || 'Conexão reiniciada com sucesso.';
        document.getElementById('resetResult').style.color = 'green';
      } else {
        document.getElementById('resetResult').textContent = data.error || 'Erro ao refazer a conexão.';
        document.getElementById('resetResult').style.color = 'red';
      }
    } catch (err) {
      console.error(err);
      document.getElementById('resetResult').textContent = 'Erro ao conectar com a API.';
      document.getElementById('resetResult').style.color = 'red';
    }
  });

  document.getElementById('sendForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('sendButton').disabled = true;
    document.getElementById('sendButton').textContent = 'Enviando...';
    console.log("Formulário enviado (sem recarregar a página)");
    
    const number = document.getElementById('number').value;
    const message = document.getElementById('message').value;
    const files = document.getElementById('files-individual-message').files;

    const formData = new FormData();
    formData.append('number', number);
    formData.append('message', message);

    Array.from(files).forEach(file => {
        formData.append('files', file);
    });

    try {
        console.log("Enviando mensagem (e arquivos, caso tenha) para", number);
        const res = await fetch(`${baseURL}/send-message`, {
            method: 'POST',
            body: formData
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
    } finally {
      document.getElementById('sendButton').disabled = false;
      document.getElementById('sendButton').textContent = 'Enviar Mensagem'
    }
  });

  let planilha = [];
  let planilhaData = [];
  let workbook;

  document.getElementById('excelFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
  
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      workbook = XLSX.read(data, { type: 'array' });
  
      carregarAba(workbook.SheetNames[0]);
      
      const sheetPageSelector = document.getElementById('sheetPageSelector');
      sheetPageSelector.innerHTML = '';
  
      workbook.SheetNames.forEach(sheetName => {
        const option = document.createElement('option');
        option.value = sheetName;
        option.textContent = sheetName;
        sheetPageSelector.appendChild(option);
      });
    };
  
    reader.readAsArrayBuffer(file);
  });
  
  function carregarAba(sheetName) {
    planilha = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    planilhaData = planilha.slice(1);
  
    const headers = planilha[0];
  
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
    })
  
    document.getElementById('batchResult').textContent = `Planilha da aba "${sheetName}" carregada com ${planilhaData.length} registros`;
    console.log(`Planilha da aba "${sheetName}" carregada com ${planilhaData.length} registros`);
  }
  
  document.getElementById('sheetPageSelector').addEventListener('change', (e) => {
    const sheetName = e.target.value;
    carregarAba(sheetName);
  });
  
  document.getElementById('headerRowSelector').addEventListener('change', (e) => {
    const selectedHeaderIndex = parseInt(e.target.value);
    const selectedHeaderRow = planilha[selectedHeaderIndex];
  
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
  
  async function enviarMensagensPlanilha() {
    const sendButton = document.getElementById('sendMessagesButton');
    sendButton.disabled = true;
    sendButton.textContent = 'Enviando...';
  
    const colNumIdx = parseInt(document.getElementById('colNumber').value);
    const headerRow = parseInt(document.getElementById('headerRowSelector').value);
    const headers = planilha[headerRow];
    const template = document.getElementById('templateMessage').value;
    const files = document.getElementById('files-sheets-message').files;
  
    let enviados = 0;
    let erros = [];
  
    for (let i = headerRow + 1; i < planilha.length; i++) {
      const linha = planilha[i];
      if (!linha || !linha[colNumIdx]) continue;
  
      const rawNumber = linha[colNumIdx]?.toString();
      if (!rawNumber) continue;
  
      let cleanNumber = rawNumber.replace(/\D/g, '');
      const number = cleanNumber.startsWith('55') ? cleanNumber : '55' + cleanNumber;

      const dataObj = {};
      headers.forEach((key, index) => {
        dataObj[key] = linha[index];
      });
  
      const message = template.replace(/\$\{([^}]+)\}/g, (_, key) => dataObj[key.trim()] || '');
  
      const formData = new FormData();
      formData.append('number', number);
      formData.append('message', message);
      Array.from(files).forEach(file => formData.append('files', file));
  
      try {
        const res = await fetch(`${baseURL}/send-message`, {
          method: 'POST',
          body: formData
        });
  
        const result = await res.json();
        if (res.ok) {
          enviados++;
        } else {
          throw new Error(result?.error || 'Erro desconhecido');
        }
      } catch (error) {
        console.error('Erro ao enviar para:', number, error);
  
        const erroLinha = {};
        headers.forEach((key, index) => {
          erroLinha[key] = linha[index];
        });
        erroLinha['Erro'] = error.message;
  
        erros.push(erroLinha);
      }
  
      document.getElementById('batchResult').textContent = `Mensagens enviadas: ${enviados}`;
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  
    sendButton.disabled = false;
    sendButton.textContent = 'Enviar Mensagens';
  
    if (erros.length > 0) {
      const ws = XLSX.utils.json_to_sheet(erros);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Erros");
  
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
  
      const downloadLink = document.createElement("a");
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.download = "erros_envio.xlsx";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  
    document.getElementById('batchResult').textContent = `Envio concluído! Total enviados: ${enviados}. Erros: ${erros.length}`;
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