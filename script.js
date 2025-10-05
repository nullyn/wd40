const playButton = document.getElementById('playButton');
const baseVideo = document.getElementById('baseVideo');
const freezeCanvas = document.getElementById('freezeCanvas');
const phoneStage = document.getElementById('phoneStage');
const phoneVideo = document.getElementById('phoneVideo');

// Placeholder mobile playlist videos
const mobilePlaylist = [
  
  'https://filesamples.com/samples/video/mp4/sample_640x360.mp4',
  'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
  'https://sample-videos.com/video321/mp4/480/big_buck_bunny_480p_1mb.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4'
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
    // Loop or stop; choose to loop the sequence
    currentIndex = 0;
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
});

// Chain the mobile videos
phoneVideo.addEventListener('ended', () => {
  currentIndex += 1;
  playNextInPlaylist();
});


