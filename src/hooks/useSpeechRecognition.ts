import { useState, useEffect, useRef, useCallback } from 'react';

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface UseSpeechRecognitionOptions {
  lang?: string;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition({
  lang = 'ar-SA',
  onTranscript,
  onError,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isIntentionalListeningRef = useRef(false);
  const restartTimerRef = useRef<any>(null);
  const levelIntervalRef = useRef<any>(null);

  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Check support on mount
  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setIsSupported(false);
    }
  }, []);

  // Safe Audio visualizer pulse (does not lock microphone device or conflict with SpeechRecognition)
  const pulseAudioMeter = useCallback((active: boolean) => {
    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current);
      levelIntervalRef.current = null;
    }

    if (!active) {
      setAudioLevel(0);
      return;
    }

    levelIntervalRef.current = setInterval(() => {
      // Natural oscillating audio level between 25% and 80% when actively listening
      setAudioLevel((prev) => {
        const target = Math.floor(Math.random() * 55) + 25;
        return Math.round(prev * 0.3 + target * 0.7);
      });
    }, 120);
  }, []);

  // Cleanly stops any active recognition instance
  const cleanupRecognition = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {
        // ignore abort errors
      }
      recognitionRef.current = null;
    }
  }, []);

  // Internal runner that creates a fresh recognition instance
  const createAndStartRecognition = useCallback(() => {
    const win = window as unknown as IWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setIsSupported(false);
      onErrorRef.current?.('متصفحك لا يدعم التعرف الصوتي المباشر. يمكنك استخدام التسميع باللمس أو التخطي.');
      return;
    }

    cleanupRecognition();

    try {
      const recognition = new SpeechRec();
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsListening(true);
        pulseAudioMeter(true);
        setPermissionError(null);
      };

      recognition.onspeechstart = () => {
        setAudioLevel(70);
      };

      recognition.onsoundstart = () => {
        setAudioLevel(50);
      };

      recognition.onresult = (event: any) => {
        // Bump audio visualizer on voice results
        setAudioLevel((prev) => Math.min(100, Math.max(prev, 65) + 15));

        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const text = result[0]?.transcript || '';
          if (result.isFinal) {
            currentFinal += text + ' ';
          } else {
            currentInterim += text;
          }
        }

        const trimmedFinal = currentFinal.trim();
        const trimmedInterim = currentInterim.trim();

        if (trimmedFinal) {
          setTranscript((prev) => (prev ? `${prev} ${trimmedFinal}` : trimmedFinal));
          setInterimTranscript('');
          onTranscriptRef.current?.(trimmedFinal, true);
        } else if (trimmedInterim) {
          setInterimTranscript(trimmedInterim);
          onTranscriptRef.current?.(trimmedInterim, false);
        }
      };

      recognition.onerror = (event: any) => {
        const error = event.error;
        console.warn('Speech recognition status event:', error);

        if (error === 'not-allowed') {
          isIntentionalListeningRef.current = false;
          setIsListening(false);
          pulseAudioMeter(false);
          setPermissionError('تم رفض إذن الميكروفون. يرجى السماح به في شريط عنوان المتصفح.');
          onErrorRef.current?.('يرجى السماح بصلاحية الميكروفون من إعدادات المتصفح.');
        } else if (error === 'audio-capture') {
          isIntentionalListeningRef.current = false;
          setIsListening(false);
          pulseAudioMeter(false);
          setPermissionError('تعذر التقاط الصوت من الميكروفون. تأكد من توصيل الميكروفون بشكل صحيح.');
        } else if (error === 'no-speech') {
          // Normal silence, will auto-recover
        } else if (error === 'aborted') {
          // Intentional stop or abort
        } else if (error === 'network') {
          // In some offline states, provide soft feedback
          onErrorRef.current?.('خدمة التعرف الصوتي تواجه بطء في الشبكة. جاري المتابعة...');
        }
      };

      recognition.onend = () => {
        if (isIntentionalListeningRef.current) {
          // Re-instantiate safely after small delay to maintain continuous listening
          restartTimerRef.current = setTimeout(() => {
            if (isIntentionalListeningRef.current) {
              createAndStartRecognition();
            }
          }, 200);
        } else {
          setIsListening(false);
          pulseAudioMeter(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Error starting speech recognition:', err);
      setIsListening(false);
      pulseAudioMeter(false);
      onErrorRef.current?.('تعذر بدء الاستماع. يمكنك الضغط على زر الميكروفون يدوياً للمحاولة.');
    }
  }, [lang, cleanupRecognition, pulseAudioMeter]);

  // Start listening (public method)
  const startListening = useCallback(() => {
    isIntentionalListeningRef.current = true;
    setPermissionError(null);
    createAndStartRecognition();
  }, [createAndStartRecognition]);

  // Stop listening (public method)
  const stopListening = useCallback(() => {
    isIntentionalListeningRef.current = false;
    cleanupRecognition();
    setIsListening(false);
    pulseAudioMeter(false);
    setInterimTranscript('');
  }, [cleanupRecognition, pulseAudioMeter]);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isIntentionalListeningRef.current = false;
      cleanupRecognition();
      pulseAudioMeter(false);
    };
  }, [cleanupRecognition, pulseAudioMeter]);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    audioLevel,
    permissionError,
    startListening,
    stopListening,
    resetTranscript,
  };
}
