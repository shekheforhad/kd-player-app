// ভিজ্যুয়ালাইজার এবং সিডি ঘূর্ণন মডিউল
const barWrapper = document.getElementById('barWrapper');
const cdThumb = document.getElementById('cdThumb');
const albumBg = document.getElementById('albumBg');
const numberOfBars = 32;

// বার তৈরি করা
for (let i = 0; i < numberOfBars; i++) {
    const bar = document.createElement('div');
    bar.classList.add('visual-bar');
    barWrapper.appendChild(bar);
}
const bars = document.querySelectorAll('.visual-bar');

export function animateVisualizer(analyser, dataArray, isPaused) {
    if (!isPaused && analyser) {
        analyser.getByteFrequencyData(dataArray);
        for (let i = 0; i < bars.length; i++) {
            const value = dataArray[i % dataArray.length];
            const percent = Math.max(10, (value / 255) * 95);
            bars[i].style.height = `${percent}%`;
        }
    }
    if (!isPaused) {
        requestAnimationFrame(() => animateVisualizer(analyser, dataArray, isPaused));
    }
}

export function startCDAnimation() {
    cdThumb.classList.add('spinning');
}

export function stopCDAnimation() {
    cdThumb.classList.remove('spinning');
}

export function resetVisualizerBars() {
    bars.forEach(b => b.style.height = "10%");
}

export function setAlbumArt(fileRawData) {
    jsmediatags.read(fileRawData, {
        onSuccess: function(tag) {
            const image = tag.tags.image;
            if (image) {
                let base64String = "";
                for (let i = 0; i < image.data.length; i++) { base64String += String.fromCharCode(image.data[i]); }
                const base64 = "data:" + image.format + ";base64," + window.btoa(base64String);
                albumBg.style.backgroundImage = `url(${base64})`;
                cdThumb.style.backgroundImage = `url(${base64})`;
            } else { resetDefaultArt(); }
        },
        onError: function() { resetDefaultArt(); }
    });
}

function resetDefaultArt() {
    albumBg.style.backgroundImage = "none";
    cdThumb.style.backgroundImage = "none";
}
