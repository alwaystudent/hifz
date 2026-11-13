import { useState, useEffect, useRef, useCallback } from 'react';

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface UseSpeechRecognitionOptions {
  lang?: string;
  onTranscript?: (transcript: string, isFinal: boolean, alternatives: string[]) => void;
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

  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setIsSupported(false);
    }
  }, []);

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
      setAudioLevel((prev) => {
        const target = Math.floor(Math.random() * 55) + 25;
        return Math.round(prev * 0.3 + target * 0.7);
      });
    }, 120);
  }, []);

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
      } catch {
        // ignore abort errors
      }
      recognitionRef.current = null;
    }
  }, []);

  const createAndStartRecognition = useCallback(() => {
    const win = window as unknown as IWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setIsSupported(false);
      onErrorRef.current?.('متصفحك لا يدعم التعرف الصوتي المباشر. يمكنك النقر على الكلمات أو استخدام التخطي.');
      return;
    }

    cleanupRecognition();

    try {
      const recognition = new SpeechRec();
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 5;

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
        setAudioLevel((prev) => Math.min(100, Math.max(prev, 65) + 15));

        const primaryParts: string[] = [];
        const altBuckets: string[][] = [[], [], [], [], []];
        let hasFinal = false;
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const primary = (result[0]?.transcript || '').trim();
          if (!primary) continue;

          if (result.isFinal) {
            hasFinal = true;
            primaryParts.push(primary);
          } else {
            currentInterim += (currentInterim ? ' ' : '') + primary;
          }

          for (let a = 0; a < 5; a++) {
            const altText = (result[a]?.transcript || primary).trim();
            if (altText) {
              altBuckets[a].push(altText);
            }
          }
        }

        const primaryCombined = primaryParts.join(' ').trim();
        const combinedAlts = Array.from(
          new Set(
            [
              primaryCombined,
              currentInterim.trim(),
              ...altBuckets.map((b) => b.join(' ').trim()),
            ].filter(Boolean)
          )
        );

        if (hasFinal && primaryCombined) {
          setTranscript((prev) => (prev ? `${prev} ${primaryCombined}` : primaryCombined));
          setInterimTranscript('');
          onTranscriptRef.current?.(primaryCombined, true, combinedAlts);
        } else if (currentInterim.trim()) {
          const trimmedInterim = currentInterim.trim();
          setInterimTranscript(trimmedInterim);
          onTranscriptRef.current?.(trimmedInterim, false, combinedAlts);
        }
      };

      recognition.onerror = (event: any) => {
        const error = event.error;

        if (error === 'not-allowed') {
          isIntentionalListeningRef.current = false;
          setIsListening(false);
          pulseAudioMeter(false);
          setPermissionError('تم رفض إذن الميكروفون. يرجى السماح به من شريط عنوان المتصفح.');
          onErrorRef.current?.('يرجى السماح بصلاحية الميكروفون من إعدادات المتصفح.');
        } else if (error === 'audio-capture') {
          isIntentionalListeningRef.current = false;
          setIsListening(false);
          pulseAudioMeter(false);
          setPermissionError('تعذر التقاط الصوت من الميكروفون. تأكد من توصيل الميكروفون بشكل صحيح.');
        } else if (error === 'network') {
          onErrorRef.current?.('جاري إعادة تنشيط خدمة التعرف الصوتي...');
        }
      };

      recognition.onend = () => {
        if (isIntentionalListeningRef.current) {
          restartTimerRef.current = setTimeout(() => {
            if (isIntentionalListeningRef.current) {
              createAndStartRecognition();
            }
          }, 150);
        } else {
          setIsListening(false);
          pulseAudioMeter(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      pulseAudioMeter(false);
      onErrorRef.current?.('تعذر بدء الاستماع. يمكنك الضغط على زر الميكروفون للمحاولة.');
    }
  }, [lang, cleanupRecognition, pulseAudioMeter]);

  const startListening = useCallback(() => {
    isIntentionalListeningRef.current = true;
    setPermissionError(null);
    createAndStartRecognition();
  }, [createAndStartRecognition]);

  const stopListening = useCallback(() => {
    isIntentionalListeningRef.current = false;
    cleanupRecognition();
    setIsListening(false);
    pulseAudioMeter(false);
    setInterimTranscript('');
  }, [cleanupRecognition, pulseAudioMeter]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

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
