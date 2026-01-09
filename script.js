const playButton = document.getElementById('playButton');
const baseVideo = document.getElementById('baseVideo');
const freezeCanvas = document.getElementById('freezeCanvas');
const phoneStage = document.getElementById('phoneStage');
const phoneVideo = document.getElementById('phoneVideo');

// Recording elements
const cameraFeed = document.getElementById('cameraFeed');
const recordCanvas = document.getElementById('recordCanvas');
const recordingControls = document.getElementById('recordingControls');
const statusText = document.getElementById('statusText');
const startRecordBtn = document.getElementById('startRecordBtn');
const stopRecordBtn = document.getElementById('stopRecordBtn');
const playRecordBtn = document.getElementById('playRecordBtn');
const downloadRecordBtn = document.getElementById('downloadRecordBtn');

let mediaRecorder;
let recordedChunks = [];
let recordingTimer;
let recordedBlobUrl = null;
let cameraStream = null;
let animationFrameId;

// Local mobile playlist videos (only files known to exist)
const mobilePlaylist = [
  './sample_1.mp4',
  './sample_2.mp4'
];

let currentIndex = 0;

function setElementVisible(element, visible) {
  element.style.display = visible ? 'block' : 'none';
}

function drawFrameToCanvas(videoEl, canvasEl) {
  const rect = canvasEl.getBoundingClientRect();
  canvasEl.width = rect.width;
  canvasEl.height = rect.height;
  const ctx = canvasEl.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, rect.width, rect.height);
}

async function startBaseVideoPlayback() {
  // Unmute, hide controls, show the video
  baseVideo.muted = false;
  baseVideo.controls = false;
  setElementVisible(playButton, false);
  setElementVisible(baseVideo, true);

  try {
    await baseVideo.play();
  } catch (e) {
    // If autoplay with sound fails, prompt the user to interact again
    console.warn('Autoplay with sound failed; user gesture required.', e);
  }
}

function onBaseVideoEnded() {
  // Freeze last frame to canvas
  setElementVisible(freezeCanvas, true);
  drawFrameToCanvas(baseVideo, freezeCanvas);

  // Hide base video to prevent controls/overlays
  setElementVisible(baseVideo, false);

  // Show phone stage and start playlist
  phoneStage.style.display = 'flex';
  currentIndex = 0;
  playNextInPlaylist();
}

function playNextInPlaylist() {
  if (currentIndex >= mobilePlaylist.length) {
    // Stop looping and start recording flow
    initRecordingUI();
    return;
  }
  const src = mobilePlaylist[currentIndex];
  phoneVideo.src = src;
  phoneVideo.controls = false;
  phoneVideo.muted = false; // Sound for phone videos; change to true if desired
  phoneVideo.play().catch((e) => {
    console.warn('Failed to play phone video, muting and retrying.', e);
    phoneVideo.muted = true;
    phoneVideo.play().catch(() => {});
  });
}

playButton.addEventListener('click', startBaseVideoPlayback);
baseVideo.addEventListener('ended', onBaseVideoEnded);

// Keep canvas updated on resize if visible
window.addEventListener('resize', () => {
  if (freezeCanvas.style.display !== 'none') {
    drawFrameToCanvas(baseVideo, freezeCanvas);
  }
});// Chain the mobile videos
phoneVideo.addEventListener('ended', () => {
  currentIndex += 1;
  playNextInPlaylist();
});

// --- Recording Feature Logic ---

function initRecordingUI() {
  // Hide video player, show controls and canvas
  phoneVideo.style.display = 'none';
  recordingControls.style.display = 'flex';
  recordCanvas.style.display = 'block';
  
  statusText.innerText = "Ready to Record";
  
// Reset buttons
  startRecordBtn.style.display = 'inline-block';
  stopRecordBtn.style.display = 'none';
  playRecordBtn.style.display = 'none';
  downloadRecordBtn.style.display = 'none';
}

async function startRecording() {
  try {
    // Get camera stream
    cameraStream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'user' }, // Prefer front camera
      audio: true 
    });
    
    cameraFeed.srcObject = cameraStream;
    await cameraFeed.play();
    
    // Start drawing loop to canvas (for preview and recording)
    drawCameraToCanvas();
    
    // Capture stream from canvas (30fps)
    const canvasStream = recordCanvas.captureStream(30);
    
    // Add audio track from original stream
    const audioTrack = cameraStream.getAudioTracks()[0];
    if (audioTrack) {
      canvasStream.addTrack(audioTrack);
    }
    
    // Init MediaRecorder
    const options = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
      ? { mimeType: 'video/webm;codecs=vp9' } 
      : { mimeType: 'video/webm' };
      
    mediaRecorder = new MediaRecorder(canvasStream, options);
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      recordedBlobUrl = URL.createObjectURL(blob);
      
      // Cleanup camera
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
      }
      cancelAnimationFrame(animationFrameId);
      cameraFeed.srcObject = null;
      
      // Update UI - Show Re-Record, Play, and Download buttons
      statusText.innerText = "Recording Finished";
      stopRecordBtn.style.display = 'none';
      startRecordBtn.innerText = "Re-Record";
      startRecordBtn.style.display = 'inline-block';
      playRecordBtn.style.display = 'inline-block';
      downloadRecordBtn.style.display = 'inline-block';
    };
    
    recordedChunks = [];
    mediaRecorder.start();
    
    // Update UI - Only show Stop button during recording
    startRecordBtn.style.display = 'none';
    stopRecordBtn.style.display = 'inline-block';
    playRecordBtn.style.display = 'none';
    downloadRecordBtn.style.display = 'none';
    
    // Timer logic (10s cap)
    let timeLeft = 10;
    statusText.innerText = `Recording... ${timeLeft}s`;
    
    if (recordingTimer) clearInterval(recordingTimer);
    recordingTimer = setInterval(() => {
      timeLeft--;
      statusText.innerText = `Recording... ${timeLeft}s`;
      if (timeLeft <= 0) {
        stopRecording();
      }
    }, 1000);
    
  } catch (err) {
    console.error("Error starting recording:", err);
    statusText.innerText = "Camera Error";
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (recordingTimer) clearInterval(recordingTimer);
}

function playRecording() {
  if (recordedBlobUrl) {
    phoneVideo.src = recordedBlobUrl;
    phoneVideo.muted = false;
    phoneVideo.controls = true;
    
    recordCanvas.style.display = 'none';
    phoneVideo.style.display = 'block';
    
    phoneVideo.play().catch(e => console.error("Play error", e));
    
    statusText.innerText = "Playing...";
  }
}

function downloadRecording() {
  if (recordedBlobUrl) {
    const link = document.createElement('a');
    link.href = recordedBlobUrl;
    link.download = `recording_${new Date().getTime()}.webm`;
    link.click();
  }
}

function drawCameraToCanvas() {
  if (!cameraFeed.videoWidth) {
    animationFrameId = requestAnimationFrame(drawCameraToCanvas);
    return;
  }
  
  const ctx = recordCanvas.getContext('2d');
  // Match canvas resolution to its display size
  recordCanvas.width = recordCanvas.clientWidth;
  recordCanvas.height = recordCanvas.clientHeight;
  
  const vidW = cameraFeed.videoWidth;
  const vidH = cameraFeed.videoHeight;
  const canvasW = recordCanvas.width;
  const canvasH = recordCanvas.height;
  
  // Object-fit: cover calculation
  const aspectVideo = vidW / vidH;
  const aspectCanvas = canvasW / canvasH;
  
  let sW, sH, sx, sy;
  
  if (aspectVideo > aspectCanvas) {
    // Video is wider: crop width
    sH = vidH;
    sW = vidH * aspectCanvas;
    sy = 0;
    sx = (vidW - sW) / 2;
  } else {
    // Video is taller: crop height
    sW = vidW;
    sH = vidW / aspectCanvas;
    sx = 0;
    sy = (vidH - sH) / 2;
  }
  
  ctx.drawImage(cameraFeed, sx, sy, sW, sH, 0, 0, canvasW, canvasH);
  
  animationFrameId = requestAnimationFrame(drawCameraToCanvas);
}

// Event listeners
startRecordBtn.addEventListener('click', startRecording);
stopRecordBtn.addEventListener('click', stopRecording);
playRecordBtn.addEventListener('click', playRecording);
downloadRecordBtn.addEventListener('click', downloadRecording);




