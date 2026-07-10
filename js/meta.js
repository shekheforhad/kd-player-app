const metaInfoBar = document.querySelector('.kd-meta-info');
const trackTitle = document.getElementById('trackTitle');

// ১. কোনো গান না থাকলে বা প্লেয়ার রিসেট হলে ডিফল্ট "00" স্টেট
export function resetMetaToZero() {
    if (metaInfoBar) {
        metaInfoBar.innerHTML = `
            <span>00kbit</span>
            <span style="color: #fff; font-size: 15px; font-weight: bold;">0/0</span>
            <span>00Hz</span>
        `;
    }
    if (trackTitle) trackTitle.innerText = "No Track Loaded";
}

// ২. গান সিলেক্ট করার পর আসল লাইভ মেটা-ইনফো রিড এবং ডিসপ্লে আপডেট (APK সেফ মোড)
export function updateMetaInfo(fileRawData, audioDuration, currentIndex, totalTracks) {
    let calculatedBitrate = 128; // ডিফল্ট সেফ ফলব্যাক বিটরেট (APK এর জন্য)

    // APK পারমিশন রেস্ট্রিকশনের জন্য ট্রাই-ক্যাচ ব্লক ব্যবহার
    if (fileRawData && fileRawData.size && audioDuration) {
        try {
            const fileSizeInBits = fileRawData.size * 8;
            calculatedBitrate = Math.round((fileSizeInBits / audioDuration) / 1000);
            
            // স্ট্যান্ডার্ড বিটরেট রাউন্ডিং লজিক
            if (calculatedBitrate > 260) calculatedBitrate = 320;
            else if (calculatedBitrate > 170) calculatedBitrate = 192;
            else if (calculatedBitrate > 140) calculatedBitrate = 160;
            else if (calculatedBitrate < 100) calculatedBitrate = 96;
            else calculatedBitrate = 128;
        } catch (e) {
            console.log("APK File size read restriction, using fallback.");
            calculatedBitrate = 128;
        }
    }

    // অডিও কনটেক্সট থেকে রিয়াল স্যাম্পল রেট/ফ্রিকোয়েন্সি বের করা
    let detectedFrequency = 44100;
    try {
        const liveContext = new (window.AudioContext || window.webkitAudioContext)();
        detectedFrequency = liveContext.sampleRate || 44100;
        liveContext.close();
    } catch (e) {
        detectedFrequency = 44100;
    }

    const currentTrackNum = currentIndex + 1;

    if (metaInfoBar) {
        metaInfoBar.innerHTML = `
            <span>${calculatedBitrate}kbit</span>
            <span style="color: #fff; font-size: 15px; font-weight: bold;">${currentTrackNum}/${totalTracks}</span>
            <span>${detectedFrequency}Hz</span>
        `;
    }
}

export function updateTrackTitle(title) {
    if (trackTitle) trackTitle.innerText = title;
}
