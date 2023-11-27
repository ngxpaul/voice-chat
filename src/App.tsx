import { useEffect, useState, useCallback } from "react";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Microphone, Stop } from '@phosphor-icons/react';
import { SPEECH_LANGUAGE } from "./constants";
import { MODEL } from "./typings/Model";
import { OpenAIFetchProps } from "./typings/OpenAIFetchProps";

function App() {
  const [transcription, setTranscription] = useState('');
  const [isListening, setIsListening] = useState(false);
  const { transcript, resetTranscript } = useSpeechRecognition();
  const isSupported = SpeechRecognition.browserSupportsSpeechRecognition();
  const [isRequestPending, setIsRequestPending] = useState(false);

  const fetchGPT = async (currentTranscript: string) => {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${"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"}`,
            },
            body: JSON.stringify({
                model: MODEL.GPT3_TURBO,
                messages: [
                    { role: 'system', content: 'You are Vocatel, an English teacher.' },
                    { role: 'user', content: currentTranscript },
                ],
                temperature: 0.3,
            }),
        });

        return response.json();
    } catch (error) {
        console.error(error);
    }
};


  const handleTextToSpeech = useCallback((data: OpenAIFetchProps) => {
  const utteranceQueue = chunkText(data.choices[0].message.content, 200); // Chunking the text

  const speakNextChunk = () => {
    if (utteranceQueue.length === 0) return;

    const chunk = utteranceQueue.shift();
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = SPEECH_LANGUAGE;
    utterance.rate = 1;

    utterance.onend = speakNextChunk;
    utterance.onerror = (e) => console.error('Speech synthesis error:', e);

    speechSynthesis.speak(utterance);
  };

  speakNextChunk();
}, []);

// Utility function to chunk text
const chunkText = (text: string, chunkSize: number) => {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, text.length);
    chunks.push(text.substring(i, end));
  }
  return chunks;
};
const toggleListen = useCallback(() => {
  if (isRequestPending) return;

  setIsListening(!isListening);
  if (isListening) {
      resetTranscript();
      SpeechRecognition.stopListening();
      setIsRequestPending(true);

      fetchGPT(transcript).then((data) => {
          handleTextToSpeech(data);
          setIsRequestPending(false);
      });
  } else {
      SpeechRecognition.startListening({ language: SPEECH_LANGUAGE });
  }
}, [isListening, transcript, isRequestPending, handleTextToSpeech, fetchGPT]);


  return (
    <div className="min-h-screen bg-slate-100 flex justify-center items-center">
      <div className="flex flex-col justify-center items-center gap-4">
        {!isSupported &&
          <p>Sorry, your browser does not support speech recognition.</p>
        }

        {isListening
          ? <h1 className="font-sans font-semibold text-2xl animate-pulse duration-700">Listening...</h1>
          : <h1 className="font-sans font-semibold text-2xl">Talk to ChatGPT with your voice.</h1>
        }

        <button
          className="flex gap-2 items-center justify-center p-4 rounded-full bg-slate-900 text-slate-100 focus:outline-none"
          onClick={toggleListen}
        >
          {isListening
            ? <Stop weight="fill" size={24} className="text-purple-600" />
            : <Microphone weight="fill" size={24} className="text-purple-600" />
          }
        </button>

        <p className="text-gray-400 text-center text-sm">{transcription}</p>
      </div>
    </div>
  );
}

export default App;
