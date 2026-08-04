const TTS = {
    voices: [],

    init() {
        if (!('speechSynthesis' in window)) return;
        this.loadVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
    },

    loadVoices() {
        this.voices = window.speechSynthesis.getVoices() || [];
    },

    speak(text, options = {}) {
        return new Promise((resolve) => {
            if (!('speechSynthesis' in window)) {
                resolve(false);
                return;
            }

            if (!text) {
                resolve(false);
                return;
            }

            const settings = options.settings || {};
            const rate = settings.speechRate || 0.8;
            const voiceLang = settings.speechVoice || 'en-GB';

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = rate;
            utterance.pitch = 1.0;
            utterance.lang = voiceLang;

            if (this.voices.length === 0) {
                this.loadVoices();
            }
            const preferredVoice = this.voices.find(v => v.lang.includes(voiceLang));
            if (preferredVoice) utterance.voice = preferredVoice;

            utterance.onend = () => resolve(true);
            utterance.onerror = () => resolve(false);

            window.speechSynthesis.speak(utterance);
        });
    },

    stop() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }
};
