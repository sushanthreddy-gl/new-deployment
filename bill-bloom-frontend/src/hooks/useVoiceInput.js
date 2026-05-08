import { useRef, useState } from "react";

/**
 * Custom hook for browser-native speech-to-text via the Web Speech API.
 * @param {(transcript: string) => void} onTranscript - called with the final transcript
 */
const useVoiceInput = (onTranscript) => {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const start = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onresult = (e) => onTranscript(e.results[0][0].transcript);
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stop = () => {
    recognitionRef.current?.stop();
  };

  const toggle = () => (listening ? stop() : start());

  return { listening, toggle };
};

export default useVoiceInput;
