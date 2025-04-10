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
});
