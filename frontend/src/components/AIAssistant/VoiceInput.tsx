import { useState, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

interface VoiceInputProps {
  onTranscribed: (transcribedText: string) => void;
  disabled: boolean;
}

export default function VoiceInput({ onTranscribed, disabled }: VoiceInputProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          await processAudio(base64);
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Could not access microphone. Please ensure you have granted permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const processAudio = async (audioBase64: string) => {
    setProcessing(true);
    try {
      const response = await api.voiceTranscribe(audioBase64);

      if (response.transcribed_text) {
        onTranscribed(response.transcribed_text);
      } else {
        alert("I couldn't understand the audio. Please try again.");
      }
    } catch (err) {
      console.error('Voice processing error:', err);
      alert('Failed to process voice input. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleClick = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || processing}
      className={`p-2 rounded-lg transition-all ${
        recording
          ? 'bg-red-500 hover:bg-red-600 text-white recording-pulse'
          : processing
          ? 'bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
          : 'bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200'
      }`}
      title={recording ? 'Stop recording' : 'Start voice input'}
    >
      {processing ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : recording ? (
        <MicOff className="w-5 h-5" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  );
}
