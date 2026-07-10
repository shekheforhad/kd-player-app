// মূল অডিও প্লেব্যাক এবং স্পিকার ইঞ্জিন মডিউল
export const audio = new Audio();
audio.crossOrigin = "anonymous";

const leftSpkLevel = document.getElementById('leftSpkLevel');
const rightSpkLevel = document.getElementById('rightSpkLevel');

let currentVolume = 0.7;

export function updateSpeakerVisuals(volume) {
    if (volume !== undefined) currentVolume = volume;
    const heightPercent = currentVolume * 100;
    leftSpkLevel.style.height = `${heightPercent}%`;
    rightSpkLevel.style.height = `${heightPercent}%`;
    audio.volume = currentVolume;
}

export function volumeUp() {
    if (currentVolume < 1.0) {
        currentVolume = Math.min(1.0, currentVolume + 0.05);
        updateSpeakerVisuals();
    }
}

export function volumeDown() {
    if (currentVolume > 0.0) {
        currentVolume = Math.max(0.0, currentVolume - 0.05);
        updateSpeakerVisuals();
    }
}
