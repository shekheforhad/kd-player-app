import { audio, updateSpeakerVisuals, volumeUp, volumeDown } from './audioCore.js';
import { updateMetaInfo, updateTrackTitle, resetMetaToZero } from './meta.js';
import { animateVisualizer, startCDAnimation, stopCDAnimation, resetVisualizerBars, setAlbumArt } from './visualizer.js';

const fileInput = document.getElementById('fileInput');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const seekBar = document.getElementById('seekBar');
const seekbarBall = document.getElementById('seekbarBall');
const currentTimeText = document.getElementById('currentTime');
const durationTimeText = document.getElementById('durationTime');
const statusIndicator = document.getElementById('statusIndicator');

const volUpTrigger = document.getElementById('volUpTrigger');
const volDownTrigger = document.getElementById('volDownTrigger');
const menuTriggerBtn = document.getElementById('menuTriggerBtn');
const javaSubMenu = document.getElementById('javaSubMenu');

let playlist = [];
let currentTrackIndex = 0;
let audioContext, analyser, source, dataArray;

// প্রথমবার প্লেয়ার ওপেন হলে স্ক্রিনকে "00" অবস্থায় রাখা
resetMetaToZero();
updateSpeakerVisuals(0.7);

// ভলিউম কন্ট্রোল বাইন্ডিং
if (volUpTrigger) volUpTrigger.addEventListener('click', volumeUp);
if (volDownTrigger) volDownTrigger.addEventListener('click', volumeDown);

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.keyCode === 24 || e.keyCode === 175) { e.preventDefault(); volumeUp(); }
    else if (e.key === 'ArrowDown' || e.keyCode === 25 || e.keyCode === 174) { e.preventDefault(); volumeDown(); }
});

// মেনু কন্ট্রোল
if (menuTriggerBtn) {
    menuTriggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        javaSubMenu.style.display = javaSubMenu.style.display === 'block' ? 'none' : 'block';
    });
}
document.addEventListener('click', () => { if (javaSubMenu) javaSubMenu.style.display = 'none'; });

function initAnalyser() {
    if (audioContext) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        analyser.fftSize = 128;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) {
        console.log("Audio node context error in APK:", e);
    }
}

// ফাইল আপলোড ইভেন্ট (APK মাল্টিপল সিলেকশন ফিক্স)
if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        playlist = [];
        for (let i = 0; i < files.length; i++) {
            playlist.push({
                title: files[i].name.replace(/\.[^/.]+$/, ""),
                src: URL.createObjectURL(files[i]),
                rawFile: files[i]
            });
        }
        if (playlist.length > 0) { 
            currentTrackIndex = 0; 
            loadTrack(currentTrackIndex); 
        }
    });
}

// অ্যান্ড্রয়েড সেফ ট্র্যাক লোড ও মেটা ক্যালকুলেশন লজিক
function loadTrack(index) {
    if (playlist.length === 0) return;
    const track = playlist[index];
    updateTrackTitle(track.title);
    audio.src = track.src;
    
    // অ্যালবাম আর্ট লোড করা (এরর হ্যান্ডলার সহ)
    try {
        setAlbumArt(track.rawFile);
    } catch (err) {
        console.log("Album art reading skipped in APK:", err);
    }
    
    // APK এর জন্য সবচেয়ে নিরাপদ ইভেন্ট লিসেনার: loadeddata
    audio.ondataavailable = null; 
    audio.onloadeddata = () => {
        updateMetaInfo(track.rawFile, audio.duration, index, playlist.length);
        playTrack(); 
        audio.onloadeddata = null; 
    };
    
    // ব্যাকআপ ট্রিগার যদি onloadeddata কোনো ডিভাইসে মিস হয়
    audio.onloadedmetadata = () => {
        updateMetaInfo(track.rawFile, audio.duration, index, playlist.length);
        audio.onloadedmetadata = null;
    };
}

function playTrack() {
    if (playlist.length === 0) return;
    initAnalyser();
    if (audioContext && audioContext.state === 'suspended') audioContext.resume();
    
    audio.play().then(() => {
        if (statusIndicator) statusIndicator.innerText = "Playing";
        if (playBtn) {
            playBtn.innerHTML = "Ⅱ";
            playBtn.classList.add('playing');
        }
        startCDAnimation();
        if (analyser) animateVisualizer(analyser, dataArray, false);
    }).catch(err => {
        console.log("APK Audio play requires user interaction first:", err);
        // অটো-প্লে ব্লক হলে ইউজারকে প্লে বাটনে চাপ দেওয়ার সুযোগ দেওয়া
        if (playBtn) {
            playBtn.innerHTML = "▶";
            playBtn.classList.remove('playing');
        }
    });
}

function togglePlay() {
    if (playlist.length === 0) return;
    if (audio.paused) {
        playTrack();
    } else {
        audio.pause();
        if (statusIndicator) statusIndicator.innerText = "Pause";
        if (playBtn) {
            playBtn.innerHTML = "▶";
            playBtn.classList.remove('playing');
        }
        stopCDAnimation();
    }
}

// কন্ট্রোল বাটন লিসেনারস
if (playBtn) playBtn.addEventListener('click', togglePlay);
if (stopBtn) {
    stopBtn.addEventListener('click', () => {
        audio.pause(); audio.currentTime = 0;
        if (statusIndicator) statusIndicator.innerText = "Stopped";
        if (playBtn) {
            playBtn.innerHTML = "▶";
            playBtn.classList.remove('playing');
        }
        stopCDAnimation();
        resetVisualizerBars();
    });
}

if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        if (playlist.length === 0) return;
        currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
        loadTrack(currentTrackIndex);
    });
}

if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        if (playlist.length === 0) return;
        currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        loadTrack(currentTrackIndex);
    });
}

audio.addEventListener('ended', () => {
    if (playlist.length === 0) return;
    currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
    loadTrack(currentTrackIndex);
});

// সিকবার ও টাইম ট্র্যাকিং
audio.addEventListener('timeupdate', () => {
    if (isNaN(audio.duration)) return;
    const progress = (audio.currentTime / audio.duration) * 100;
    if (seekBar) seekBar.value = progress;
    if (seekbarBall) seekbarBall.style.left = `calc(${progress}% - 6px)`;

    let curMin = Math.floor(audio.currentTime / 60), curSec = Math.floor(audio.currentTime % 60);
    let durMin = Math.floor(audio.duration / 60), durSec = Math.floor(audio.duration % 60);
    if (currentTimeText) currentTimeText.innerText = `${curMin < 10 ? '0'+curMin : curMin}:${curSec < 10 ? '0'+curSec : curSec}`;
    if (durationTimeText) durationTimeText.innerText = `${durMin < 10 ? '0'+durMin : durMin}:${durSec < 10 ? '0'+durSec : durSec}`;
});

if (seekBar) {
    seekBar.addEventListener('input', () => {
        audio.currentTime = (seekBar.value / 100) * audio.duration;
    });
}
