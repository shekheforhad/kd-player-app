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
let db;

// ১. IndexedDB ডাটাবেস ইনিশিয়েলাইজ করা (পার্মানেন্ট অডিও ফাইল স্টোরেজ)
function initDatabase() {
    const request = indexedDB.open("KDPlayerDB", 1);
    
    request.onupgradeneeded = (e) => {
        db = e.target.result;
        if (!db.objectStoreNames.contains("songs")) {
            db.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
        }
    };

    request.onsuccess = (e) => {
        db = e.target.result;
        loadPlaylistFromStorage(); // ডাটাবেস রেডি হলে আগের সেভ করা গান লোড হবে
    };

    request.onerror = () => console.log("Database error");
}

// ২. ডাটাবেস থেকে গানগুলো প্লেলিস্টে ফিরিয়ে আনা
function loadPlaylistFromStorage() {
    const transaction = db.transaction(["songs"], "readonly");
    const store = transaction.objectStore("songs");
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
        const savedSongs = getAllRequest.result;
        if (savedSongs && savedSongs.length > 0) {
            playlist = savedSongs.map(item => ({
                title: item.title,
                src: URL.createObjectURL(item.blob), // ব্লব থেকে লোকাল ইউআরএল তৈরি
                rawFile: item.blob
            }));

            // LocalStorage থেকে আগের লাস্ট পজিশন ডেটা রিড করা
            const lastIndex = localStorage.getItem("kd_last_index");
            const lastTime = localStorage.getItem("kd_last_time");

            if (lastIndex !== null && playlist[lastIndex]) {
                currentTrackIndex = parseInt(lastIndex);
                loadTrack(currentTrackIndex, false); // গান লোড হবে কিন্তু অটো-প্লে হবে না
                
                // আগের ছেড়ে যাওয়া সেকেন্ডে মিউজিক সেট করা
                if (lastTime !== null) {
                    audio.currentTime = parseFloat(lastTime);
                }
            } else {
                loadTrack(0, false);
            }
        } else {
            resetMetaToZero();
        }
    };
}

// ৩. নতুন সিলেক্ট করা গানগুলো ডাটাবেসে পার্মানেন্টলি সেভ করা
function saveFilesToStorage(files) {
    const transaction = db.transaction(["songs"], "readwrite");
    const store = transaction.objectStore("songs");

    // নতুন ফোল্ডার নিলে আগের গানগুলো পরিষ্কার করে দেওয়া
    store.clear(); 

    let count = 0;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('audio/') || file.name.endsWith('.mp3')) {
            const songData = {
                title: file.name.replace(/\.[^/.]+$/, ""),
                blob: file // আসল ফাইল ডাটা ব্লব আকারে সেভ হচ্ছে
            };
            store.add(songData);
            count++;
        }
    }

    transaction.oncomplete = () => {
        if (count > 0) {
            loadPlaylistFromStorage(); // সেভ শেষে নতুন প্লেলিস্ট রিলোড
        }
    };
}

// ৪. প্রতি সেকেন্ডে লাস্ট স্ট্যাটাস সেভ করে রাখা
function saveCurrentPlaybackState() {
    if (playlist.length === 0) return;
    localStorage.setItem("kd_last_index", currentTrackIndex);
    localStorage.setItem("kd_last_time", audio.currentTime);
}

// অ্যাপ চালুর প্রাথমিক সেটিংস
initDatabase();
updateSpeakerVisuals(0.7);

// ভলিউম ও কীবোর্ড বাইন্ডিং
if (volUpTrigger) volUpTrigger.addEventListener('click', volumeUp);
if (volDownTrigger) volDownTrigger.addEventListener('click', volumeDown);

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.keyCode === 24 || e.keyCode === 175) { e.preventDefault(); volumeUp(); }
    else if (e.key === 'ArrowDown' || e.keyCode === 25 || e.keyCode === 174) { e.preventDefault(); volumeDown(); }
});

// মেনু টগল
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
    } catch (e) { console.log(e); }
}

// গান সিলেক্ট করার ইভেন্ট (ডাটাবেস সেভারের সাথে কানেক্টেড)
if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        saveFilesToStorage(files); // সরাসরি ডাটাবেসে সেভ হবে
    });
}

function loadTrack(index, shouldAutoPlay = true) {
    if (playlist.length === 0) return;
    const track = playlist[index];
    updateTrackTitle(track.title);
    audio.src = track.src;
    
    try { setAlbumArt(track.rawFile); } catch (err) { console.log(err); }
    
    audio.onloadeddata = () => {
        updateMetaInfo(track.rawFile, audio.duration, index, playlist.length);
        if (shouldAutoPlay) playTrack(); 
        audio.onloadeddata = null; 
    };
    
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
        if (playBtn) { playBtn.innerHTML = "Ⅱ"; playBtn.classList.add('playing'); }
        startCDAnimation();
        if (analyser) animateVisualizer(analyser, dataArray, false);
    }).catch(err => {
        if (playBtn) { playBtn.innerHTML = "▶"; playBtn.classList.remove('playing'); }
    });
}

function togglePlay() {
    if (playlist.length === 0) return;
    if (audio.paused) {
        playTrack();
    } else {
        audio.pause();
        if (statusIndicator) statusIndicator.innerText = "Pause";
        if (playBtn) { playBtn.innerHTML = "▶"; playBtn.classList.remove('playing'); }
        stopCDAnimation();
        saveCurrentPlaybackState(); // পজ করলেও স্টেট সেভ হবে
    }
}

if (playBtn) playBtn.addEventListener('click', togglePlay);
if (stopBtn) {
    stopBtn.addEventListener('click', () => {
        audio.pause(); audio.currentTime = 0;
        if (statusIndicator) statusIndicator.innerText = "Stopped";
        if (playBtn) { playBtn.innerHTML = "▶"; playBtn.classList.remove('playing'); }
        stopCDAnimation();
        resetVisualizerBars();
        saveCurrentPlaybackState();
    });
}

if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        if (playlist.length === 0) return;
        currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
        loadTrack(currentTrackIndex, true);
    });
}

if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        if (playlist.length === 0) return;
        currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        loadTrack(currentTrackIndex, true);
    });
}

audio.addEventListener('ended', () => {
    if (playlist.length === 0) return;
    currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
    loadTrack(currentTrackIndex, true);
});

// সিকবার আপডেট এবং রিয়েল-টাইম পজিশন অটো-সেভ
audio.addEventListener('timeupdate', () => {
    if (isNaN(audio.duration)) return;
    const progress = (audio.currentTime / audio.duration) * 100;
    if (seekBar) seekBar.value = progress;
    if (seekbarBall) seekbarBall.style.left = `calc(${progress}% - 6px)`;

    let curMin = Math.floor(audio.currentTime / 60), curSec = Math.floor(audio.currentTime % 60);
    let durMin = Math.floor(audio.duration / 60), durSec = Math.floor(audio.duration % 60);
    if (currentTimeText) currentTimeText.innerText = `${curMin < 10 ? '0'+curMin : curMin}:${curSec < 10 ? '0'+curSec : curSec}`;
    if (durationTimeText) durationTimeText.innerText = `${durMin < 10 ? '0'+durMin : durMin}:${durSec < 10 ? '0'+durSec : durSec}`;
    
    // প্রতি ৩ সেকেন্ড পর পর প্লেব্যাক টাইম মেমোরিতে ব্যাকআপ হবে
    if (Math.floor(audio.currentTime) % 3 === 0) {
        saveCurrentPlaybackState();
    }
});

if (seekBar) {
    seekBar.addEventListener('input', () => {
        audio.currentTime = (seekBar.value / 100) * audio.duration;
        saveCurrentPlaybackState();
    });
}
