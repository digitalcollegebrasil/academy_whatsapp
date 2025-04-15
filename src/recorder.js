let recorder;
let stream;
const startBtn = document.getElementById("startRecord");
const stopBtn = document.getElementById("stopRecord");
const audioPlayer = document.getElementById("audioPlayer");
const downloadLink = document.getElementById("downloadLink");
const audioStatus = document.getElementById("audioStatus");

startBtn.addEventListener("click", async () => {
    audioStatus.textContent = "Gravando...";
    startBtn.disabled = true;
    stopBtn.disabled = false;
    stopBtn.style.display = 'inline-block';
    try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder = RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/wav',
        recorderType: StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 16000
    });
    recorder.startRecording();
    } catch (err) {
    console.error("Erro ao acessar microfone:", err);
    audioStatus.textContent = "Erro ao acessar o microfone.";
    }
});

let audioContext, analyser, dataArray, sourceNode;

startBtn.addEventListener("click", async () => {
  audioStatus.textContent = "Gravando...";
  startBtn.disabled = true;
  stopBtn.disabled = false;
  stopBtn.style.display = 'inline-block';

  const selectedDeviceId = document.getElementById("microphoneSelect").value;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined
      }
    });

    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    sourceNode = audioContext.createMediaStreamSource(stream);
    sourceNode.connect(analyser);

    function updateVolume() {
      analyser.getByteFrequencyData(dataArray);
      let volume = dataArray.reduce((a, b) => a + b) / bufferLength;
      const volumePercent = Math.min((volume / 128) * 100, 100);
      document.getElementById("volumeLevel").style.width = volumePercent + "%";
      requestAnimationFrame(updateVolume);
    }

    updateVolume();

    recorder = RecordRTC(stream, {
      type: 'audio',
      mimeType: 'audio/wav',
      recorderType: StereoAudioRecorder,
      numberOfAudioChannels: 1,
      desiredSampRate: 16000
    });

    recorder.startRecording();
  } catch (err) {
    console.error("Erro ao acessar microfone:", err);
    audioStatus.textContent = "Erro ao acessar o microfone.";
  }
});

stopBtn.addEventListener("click", async () => {
  audioStatus.textContent = "Processando gravação...";
  stopBtn.disabled = true;
  recorder.stopRecording(() => {
    const blob = recorder.getBlob();
    const url = URL.createObjectURL(blob);
    audioPlayer.src = url;
    audioPlayer.style.display = "block";
    downloadLink.href = url;
    downloadLink.style.display = "inline-block";
    audioStatus.textContent = "Gravação finalizada.";
  });
  startBtn.disabled = false;
  stopBtn.style.display = 'none';
  stream.getTracks().forEach(track => track.stop());
  if (audioContext) {
    audioContext.close();
    document.getElementById("volumeLevel").style.width = "0%";
  }
});

async function listarMicrofones() {
  try {
    const dispositivos = await navigator.mediaDevices.enumerateDevices();
    const select = document.getElementById("microphoneSelect");
    dispositivos
      .filter(dispositivo => dispositivo.kind === 'audioinput')
      .forEach((microfone, index) => {
        const option = document.createElement('option');
        option.value = microfone.deviceId;
        option.text = microfone.label || `Microfone ${index + 1}`;
        select.appendChild(option);
      });
  } catch (err) {
    console.error("Erro ao listar microfones:", err);
  }
}

listarMicrofones();