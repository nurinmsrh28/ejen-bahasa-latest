import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import latarAkademiImg from '../assets/images/secret_academy_school_1794825908324.jpg';
import {
  loginAgent,
  registerAgentAccount,
  resetAgentPassword,
} from '../game/authClient';
import { validateLoginInput } from '../game/rules';
import type { AuthUser } from '../game/types';
import { AcademyEmblem } from './DetectiveArt';

interface LoginScreenProps {
  onBack: () => void;
  onAuthenticated: (user: AuthUser) => void;
}

const REMEMBERED_USERNAME_KEY = 'ejen_remembered_username_v1';

const DIALOGUE_WELCOME =
  'Selamat datang, Ejen! Sahkan akses anda untuk membuka fail kes Sekolah Seri Bestari.';
const DIALOGUE_CHECKING =
  'Sebentar ya… saya sedang menyemak kebenaran akses anda.';
const DIALOGUE_SUCCESS = 'Akses dibenarkan! Jom mulakan siasatan.';
const DIALOGUE_ERROR =
  'Hmm, akses ditolak. Semak ID dan kata laluan anda.';

type AuthPhase = 'idle' | 'scanning' | 'granted';

export function LoginScreen({ onBack, onAuthenticated }: LoginScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState(() => {
    try {
      return window.localStorage.getItem(REMEMBERED_USERNAME_KEY) || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [authPhase, setAuthPhase] = useState<AuthPhase>('idle');
  /* ADDED: access granted camera move */
  const [bgZooming, setBgZooming] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [error, setError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [bgFailed, setBgFailed] = useState(false);
  const [portraitFailed, setPortraitFailed] = useState(false);

  // Typewriter dialogue state for Profesor Nurin
  const [nurinTargetText, setNurinTargetText] = useState(DIALOGUE_WELCOME);
  const [nurinTypedText, setNurinTypedText] = useState('');
  const [entered, setEntered] = useState(false);

  // Password reset modal state (preserved from original LoginScreen)
  const [resetUser, setResetUser] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStatus, setResetStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Refs for parallax, particles canvas, and focus transfer
  const parallaxRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const submitBtnRef = useRef<HTMLButtonElement | null>(null);
  const timersRef = useRef<number[]>([]);
  /* ADDED: access granted camera move */
  const pauseParallaxRef = useRef(false);

  const isBusy = authPhase !== 'idle';

  // Trigger staged entrance reveal on mount
  useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), 40);
    return () => {
      window.clearTimeout(t);
      timersRef.current.forEach((id) => window.clearTimeout(id));
      /* ADDED: access granted camera move */
      document.body.classList.remove('leaving');
    };
  }, []);

  // Typewriter effect for Profesor Nurin dialogue (respects prefers-reduced-motion)
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setNurinTypedText(nurinTargetText);
      return;
    }

    setNurinTypedText('');
    let idx = 0;
    const interval = window.setInterval(() => {
      idx += 1;
      setNurinTypedText(nurinTargetText.slice(0, idx));
      if (idx >= nurinTargetText.length) {
        window.clearInterval(interval);
      }
    }, 22);

    return () => window.clearInterval(interval);
  }, [nurinTargetText]);

  // Subtle background parallax (mouse pointer + phone tilt, disabled under prefers-reduced-motion)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let rafId = 0;

    const tick = () => {
      /* ADDED: access granted camera move */
      if (!pauseParallaxRef.current) {
        curX += (targetX - curX) * 0.08;
        curY += (targetY - curY) * 0.08;
        if (parallaxRef.current) {
          parallaxRef.current.style.transform = `translate3d(${curX.toFixed(2)}px, ${curY.toFixed(2)}px, 0)`;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const onPointerMove = (e: PointerEvent) => {
      const nx = e.clientX / Math.max(window.innerWidth, 1) - 0.5;
      const ny = e.clientY / Math.max(window.innerHeight, 1) - 0.5;
      targetX = -nx * 16;
      targetY = -ny * 10;
    };

    const onDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (typeof e.gamma === 'number' && typeof e.beta === 'number') {
        targetX = Math.max(-12, Math.min(12, -(e.gamma / 30) * 12));
        targetY = Math.max(-8, Math.min(8, -((e.beta - 45) / 35) * 8));
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('deviceorientation', onDeviceOrientation, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('deviceorientation', onDeviceOrientation);
    };
  }, []);

  // Lightweight 2D canvas for drifting golden dust & fireflies
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const particleCount = width < 640 ? 22 : 34;
    const particles = Array.from({ length: particleCount }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1.1 + (i % 3) * 0.8,
      vx: (Math.random() - 0.5) * 0.22,
      vy: -0.14 - Math.random() * 0.25,
      phase: Math.random() * Math.PI * 2,
      isFirefly: i % 3 === 0,
    }));

    let rafId = 0;
    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      const t = now * 0.0015;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx + Math.sin(t + p.phase) * 0.12;
        p.y += p.vy;

        if (p.y < -12) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -12) p.x = width + 10;
        if (p.x > width + 12) p.x = -10;

        const alpha = p.isFirefly
          ? 0.3 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2.2 + p.phase))
          : 0.2 + 0.25 * (0.5 + 0.5 * Math.sin(t + p.phase));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.isFirefly
          ? `rgba(244, 217, 130, ${alpha.toFixed(3)})`
          : `rgba(201, 162, 75, ${alpha.toFixed(3)})`;
        ctx.shadowColor = 'rgba(201, 162, 75, 0.75)';
        ctx.shadowBlur = p.isFirefly ? 10 : 4;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const triggerFailureFeedback = (msg: string) => {
    setError(msg);
    setShakeKey((k) => k + 1);
    setNurinTargetText(DIALOGUE_ERROR);
  };

  // Preserved authentication & registration submit handler (calls loginAgent / registerAgentAccount)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;

    const trimmedUser = username.trim();
    if (!trimmedUser) {
      triggerFailureFeedback('Sila isi ID ejen anda.');
      return;
    }
    if (!password) {
      triggerFailureFeedback('Sila masukkan kata laluan.');
      return;
    }

    const check = validateLoginInput(trimmedUser, password);
    if (!check.valid) {
      triggerFailureFeedback(check.error || 'Sila lengkapkan maklumat log masuk anda.');
      return;
    }

    setError('');
    setAuthPhase('scanning');
    setNurinTargetText(DIALOGUE_CHECKING);

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    try {
      const minScan = prefersReduced
        ? Promise.resolve()
        : new Promise<void>((r) => window.setTimeout(r, 480));

      // Call ORIGINAL authentication / registration functions
      const [res] = await Promise.all([
        mode === 'login'
          ? loginAgent({ username: trimmedUser, password, rememberMe })
          : registerAgentAccount({ username: trimmedUser, password, rememberMe }),
        minScan,
      ]);

      if (!res.ok || !res.user) {
        setAuthPhase('idle');
        const friendlyErr =
          mode === 'login' && res.error?.toLowerCase().includes('tidak tepat')
            ? 'ID atau kata laluan tidak betul. Cuba lagi.'
            : res.error || 'ID atau kata laluan tidak betul. Cuba lagi.';
        triggerFailureFeedback(friendlyErr);
        return;
      }

      // Preserve REMEMBERED_USERNAME_KEY (store only ID, never password)
      try {
        if (rememberMe) {
          window.localStorage.setItem(REMEMBERED_USERNAME_KEY, trimmedUser);
        } else {
          window.localStorage.removeItem(REMEMBERED_USERNAME_KEY);
        }
      } catch {
        // Ignore storage errors
      }

      /* ADDED: access granted camera move */
      // 0s: existing success stamp & Profesor Nurin dialogue
      setAuthPhase('granted');
      setNurinTargetText(DIALOGUE_SUCCESS);

      if (prefersReduced) {
        const reducedTimer = window.setTimeout(() => {
          onAuthenticated(res.user!);
        }, 400);
        timersRef.current.push(reducedTimer);
        return;
      }

      // 0.9s: add "leaving" class to body so title, Nurin & terminal fade and slide down
      const leavingTimer = window.setTimeout(() => {
        document.body.classList.add('leaving');
      }, 900);

      // 1.4s: pause parallax & add "zoom" class to #login-bg (scale 1 -> 2.6 over 3.8s)
      const zoomTimer = window.setTimeout(() => {
        pauseParallaxRef.current = true;
        if (parallaxRef.current) {
          parallaxRef.current.style.transition = 'transform 0.5s ease';
          parallaxRef.current.style.transform = 'translate3d(0px, 0px, 0)';
        }
        setBgZooming(true);
      }, 1400);

      // 4.2s: warm gold-ivory radial flash fades in over 0.8s, then call original post-login routine
      const flashTimer = window.setTimeout(() => {
        setFlashOn(true);
      }, 4200);

      const navTimer = window.setTimeout(() => {
        document.body.classList.remove('leaving');
        onAuthenticated(res.user!);
      }, 5000);

      timersRef.current.push(leavingTimer, zoomTimer, flashTimer, navTimer);
    } catch {
      setAuthPhase('idle');
      triggerFailureFeedback('Gagal menghubungi pelayan pengesahan. Sila cuba sebentar lagi.');
    }
  };

  // Preserved forgot password handler (calls resetAgentPassword)
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetStatus(null);
    setResetLoading(true);
    try {
      const res = await resetAgentPassword({
        username: resetUser.trim(),
        recoveryCode: recoveryCode.trim(),
        newPassword,
      });
      if (res.ok) {
        setResetStatus({
          type: 'ok',
          text: res.message || 'Kata laluan berjaya ditetapkan semula.',
        });
        setUsername(resetUser.trim());
        setPassword('');
      } else {
        setResetStatus({
          type: 'err',
          text: res.error || 'Gagal menetapkan semula kata laluan.',
        });
      }
    } catch {
      setResetStatus({
        type: 'err',
        text: 'Ralat sambungan pelayan semasa tetapan semula.',
      });
    } finally {
      setResetLoading(false);
    }
  };

  // Preserved Demo Access Slip fill behavior (switches to Login tab, fills fields, focuses "Masuk akademi" without auto-submitting)
  const handleFillDemo = () => {
    if (isBusy) return;
    setMode('login');
    setUsername('ejen.bestari');
    setPassword('Bestari#2026');
    setError('');
    setNurinTargetText(DIALOGUE_WELCOME);
    window.setTimeout(() => {
      submitBtnRef.current?.focus();
    }, 30);
  };

  return (
    <div
      className="relative min-h-screen w-full overflow-x-hidden bg-[#0b2a21] text-[#f4ebd0] flex flex-col justify-between"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      {/* FULL-SCREEN CINEMATIC BACKGROUND (latar_akademi + parallax + slow zoom + window glow + mist + canvas particles) */}
      {/* ADDED: access granted camera move */}
      <div
        id="login-bg"
        aria-hidden="true"
        className={`fixed inset-0 z-0 overflow-hidden pointer-events-none ${
          bgZooming ? 'zoom' : ''
        }`}
        style={{
          background: 'linear-gradient(155deg, #0b2a21 0%, #15402f 56%, #071b15 100%)',
        }}
      >
        <div
          ref={parallaxRef}
          className={`absolute -inset-5 transition-opacity duration-1000 ${
            entered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {!bgFailed && (
            <img
              src={latarAkademiImg}
              alt=""
              onError={() => setBgFailed(true)}
              className="login-bg-zoom w-full h-full object-cover object-center"
            />
          )}

          {/* Subtle emerald colour grading + vignette keeping clock tower & center clear */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 68% 62% at 58% 46%, rgba(11, 42, 33, 0.08) 0%, rgba(11, 42, 33, 0.45) 56%, rgba(7, 25, 19, 0.86) 100%)',
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-48"
            style={{
              background: 'linear-gradient(to top, rgba(7, 24, 18, 0.88), transparent)',
            }}
          />

          {/* Gentle warm window-glow & lantern flicker overlay */}
          <div
            className="login-window-flicker absolute right-[12%] top-[28%] w-[36%] h-[36%] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(244, 206, 114, 0.2) 0%, rgba(201, 162, 75, 0.06) 50%, transparent 74%)',
            }}
          />

          {/* Soft drifting courtyard mist */}
          <div
            className="mist-drift absolute inset-x-[-10%] bottom-[8%] h-40 opacity-35"
            style={{
              background:
                'radial-gradient(ellipse at 54% 65%, rgba(244, 235, 208, 0.22) 0%, rgba(169, 197, 173, 0.1) 46%, transparent 72%)',
            }}
          />
        </div>

        {/* Lightweight 2D Canvas: Golden Dust & Fireflies */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* FOREGROUND GAME INTERFACE */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex-1 flex flex-col justify-between gap-4 sm:gap-6">
        {/* Top Utility Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={isBusy}
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0b2a21]/85 hover:bg-[#15402f] border border-[#c9a24b]/55 hover:border-[#c9a24b] text-xs font-semibold text-[#f4ebd0] shadow-md transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b]"
          >
            <ArrowLeft className="w-4 h-4 text-[#c9a24b]" />
            <span>Kembali ke Laman Utama</span>
          </button>

          <div className="flex items-center gap-2.5 text-[11px] font-mono-tabular text-[#f4ebd0]/85 bg-[#0b2a21]/75 px-3 py-1.5 rounded-lg border border-[#c9a24b]/35">
            <span>FAIL KES: SB-HQ // 2026</span>
            <span aria-hidden="true" className="text-[#c9a24b]">·</span>
            <span className="text-[#c9a24b] font-bold">DOKUMEN SULIT</span>
          </div>
        </div>

        {/* TOP CENTRE: HERO TITLE OVER OPEN SKY ABOVE CLOCK TOWER */}
        <div
          className={`login-ui-fade text-center mx-auto max-w-2xl transition-all duration-700 ease-out ${
            entered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}
        >
          <p className="font-mono-tabular text-[11px] sm:text-xs tracking-[0.28em] uppercase text-[#c9a24b] mb-1">
            Akademi Bahasa Rahsia · Sekolah Seri Bestari
          </p>
          <h1
            className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-wide text-[#f4ebd0] leading-tight"
            style={{
              textShadow:
                '0 4px 22px rgba(7, 24, 18, 0.92), 0 0 32px rgba(201, 162, 75, 0.42)',
            }}
          >
            EJEN BAHASA
          </h1>
          <p
            className="font-display text-lg sm:text-2xl italic font-semibold text-[#c9a24b] tracking-wide mt-0.5"
            style={{ textShadow: '0 2px 14px rgba(7, 24, 18, 0.9)' }}
          >
            Operasi Sekolah Impian
          </p>
        </div>

        {/* BOTTOM COMPOSITION: LEFT (PROFESOR NURIN) + CLEAR CENTER + RIGHT (TERMINAL AKSES EJEN) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-end pb-1">
          {/* BOTTOM LEFT: PROFESOR NURIN IN ORNATE ARCHED GOLD FRAME */}
          <div
            className={`login-ui-fade lg:col-span-5 flex flex-row lg:flex-col items-end lg:items-start gap-3.5 sm:gap-4 transition-all duration-700 delay-150 ease-out ${
              entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            {/* Ornate Arched Gold Frame + Brass Name Plate */}
            <div className="shrink-0 flex flex-col items-center lg:items-start">
              <div className="relative p-1.5 rounded-t-[999px] rounded-b-2xl bg-gradient-to-b from-[#e4c36d] via-[#c9a24b] to-[#8a6a2f] shadow-[0_18px_40px_rgba(0,0,0,0.6)]">
                {/* Brass corner ornaments */}
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-[#c9a24b] border border-[#0b2a21]"
                />
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#c9a24b] border border-[#0b2a21]"
                />
                <div className="p-1 rounded-t-[999px] rounded-b-xl bg-[#0b2a21]">
                  <div className="relative w-24 h-28 sm:w-28 sm:h-32 lg:w-40 lg:h-48 rounded-t-[999px] rounded-b-lg overflow-hidden border-2 border-[#c9a24b]/80 bg-[#15402f]">
                    {!portraitFailed ? (
                      <img
                        src="/assets/aistudio/Professor_Detective_in_the_Investigation_Office_54081002.png"
                        alt="Profesor Nurin — Pembimbing HQ Akademi Ejen Bahasa"
                        referrerPolicy="no-referrer"
                        onError={() => setPortraitFailed(true)}
                        className="w-full h-full object-cover object-top scale-[1.04]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-display text-3xl font-bold text-[#c9a24b]">
                        PN
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Brass Name Plate */}
              <div className="-mt-3 relative z-10 px-3.5 py-1.5 rounded-lg bg-gradient-to-b from-[#d9b65f] via-[#c9a24b] to-[#8a6a2f] border border-[#f4ebd0]/80 shadow-lg text-center">
                <p className="font-mono-tabular text-[10px] sm:text-xs font-bold tracking-wider uppercase text-[#0b2a21] whitespace-nowrap">
                  Profesor Nurin · Pembimbing HQ
                </p>
              </div>
            </div>

            {/* Dialogue Bubble with Typewriter Text */}
            <div
              aria-live="polite"
              className="relative flex-1 w-full max-w-md rounded-2xl bg-[#0b2a21]/90 border-2 border-[#c9a24b]/85 p-3.5 sm:p-4 shadow-[0_16px_38px_rgba(0,0,0,0.55)]"
            >
              <div
                aria-hidden="true"
                className="hidden lg:block absolute -top-2 left-8 w-3.5 h-3.5 bg-[#0b2a21] border-t-2 border-l-2 border-[#c9a24b]/85 rotate-45"
              />
              <p className="text-xs sm:text-sm leading-relaxed text-[#f4ebd0] font-medium min-h-[2.75rem]">
                “{nurinTypedText}”
              </p>
            </div>
          </div>

          {/* CENTER SPACER (keeps clock tower and cobblestone pathway visually unobstructed on desktop) */}
          <div className="hidden lg:block lg:col-span-2" aria-hidden="true" />

          {/* BOTTOM RIGHT: TERMINAL AKSES EJEN */}
          <div
            key={shakeKey}
            className={`login-ui-fade lg:col-span-5 relative transition-all duration-700 delay-300 ease-out ${
              entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            } ${shakeKey > 0 ? 'login-shake' : ''}`}
          >
            <div className="relative rounded-2xl bg-[#0b2a21]/90 backdrop-blur-md border-2 border-[#c9a24b] shadow-[0_24px_56px_rgba(0,0,0,0.68)] p-5 sm:p-6 overflow-hidden">
              {/* Gold Corner Ornaments */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#f4ebd0]/80 rounded-tl-sm"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#f4ebd0]/80 rounded-tr-sm"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#f4ebd0]/80 rounded-bl-sm"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#f4ebd0]/80 rounded-br-sm"
              />

              {/* Animated Scan Line across Terminal during Authentication */}
              {authPhase === 'scanning' && (
                <div
                  aria-hidden="true"
                  className="login-scan-line pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#f4ebd0] to-transparent shadow-[0_0_16px_#c9a24b] z-20"
                />
              )}

              {/* Gold Stamp "AKSES DIBENARKAN" Slam on Success */}
              {authPhase === 'granted' && (
                <div
                  role="status"
                  aria-live="polite"
                  className="pointer-events-none absolute inset-0 z-30 bg-[#0b2a21]/75 flex items-center justify-center p-4"
                >
                  <div className="login-stamp-slam px-6 py-3 rounded-xl border-4 border-[#c9a24b] bg-[#15402f]/95 shadow-[0_0_40px_rgba(201,162,75,0.65)] text-center">
                    <p className="font-mono-tabular text-lg sm:text-2xl font-extrabold tracking-[0.22em] text-[#f4ebd0]">
                      AKSES DIBENARKAN
                    </p>
                  </div>
                </div>
              )}

              {/* Terminal Header + Shield Crest */}
              <div className="flex items-center justify-between gap-3 border-b border-[#c9a24b]/30 pb-3.5 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0 p-1 rounded-xl bg-[#15402f] border border-[#c9a24b]/70 shadow">
                    <AcademyEmblem className="w-10 h-10" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono-tabular text-[10px] font-bold tracking-[0.18em] uppercase text-[#c9a24b]">
                      Akademi Ejen Rahsia
                    </p>
                    <h2 className="font-display text-lg sm:text-xl font-bold text-[#f4ebd0] truncate">
                      Terminal akses ejen
                    </h2>
                  </div>
                </div>
                <ShieldCheck className="w-5 h-5 text-[#c9a24b] shrink-0" aria-hidden="true" />
              </div>

              {/* Tabs: Log masuk & Daftar baharu */}
              <div
                role="tablist"
                aria-label="Mod terminal akses ejen"
                className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#071c16] border border-[#c9a24b]/35 mb-4"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  disabled={isBusy}
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setNurinTargetText(DIALOGUE_WELCOME);
                  }}
                  className={`inline-flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b] ${
                    mode === 'login'
                      ? 'bg-[#c9a24b] text-[#0b2a21] shadow-sm'
                      : 'text-[#f4ebd0]/80 hover:text-[#f4ebd0] hover:bg-[#15402f]/60'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Log masuk</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'register'}
                  disabled={isBusy}
                  onClick={() => {
                    setMode('register');
                    setError('');
                    setNurinTargetText(DIALOGUE_WELCOME);
                  }}
                  className={`inline-flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b] ${
                    mode === 'register'
                      ? 'bg-[#c9a24b] text-[#0b2a21] shadow-sm'
                      : 'text-[#f4ebd0]/80 hover:text-[#f4ebd0] hover:bg-[#15402f]/60'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Daftar baharu</span>
                </button>
              </div>

              {/* Auth Form */}
              <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
                <div>
                  <label
                    htmlFor="login-username"
                    className="block text-xs font-bold uppercase tracking-wider text-[#f4ebd0] mb-1"
                  >
                    ID ejen
                  </label>
                  <input
                    id="login-username"
                    type="text"
                    disabled={isBusy}
                    autoComplete="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Contoh: ejen.bestari"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#15402f]/80 border border-[#c9a24b]/55 focus:border-[#f4ebd0] focus:ring-2 focus:ring-[#c9a24b]/50 focus:outline-none text-[#f4ebd0] placeholder-[#f4ebd0]/45 text-base transition-colors disabled:opacity-60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-bold uppercase tracking-wider text-[#f4ebd0] mb-1"
                  >
                    Kata laluan
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      disabled={isBusy}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder={
                        mode === 'login'
                          ? 'Masukkan kata laluan anda'
                          : 'Minimum 6 aksara rahsia'
                      }
                      className="w-full pl-3.5 pr-12 py-2.5 rounded-xl bg-[#15402f]/80 border border-[#c9a24b]/55 focus:border-[#f4ebd0] focus:ring-2 focus:ring-[#c9a24b]/50 focus:outline-none text-[#f4ebd0] placeholder-[#f4ebd0]/45 text-base transition-colors disabled:opacity-60"
                    />
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Sembunyi kata laluan' : 'Papar kata laluan'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-[#c9a24b] hover:bg-[#0b2a21] hover:text-[#f4ebd0] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <label className="inline-flex items-center gap-2 text-xs text-[#f4ebd0]/90 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      disabled={isBusy}
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-[#c9a24b] bg-[#15402f] accent-[#c9a24b]"
                    />
                    <span className="font-semibold">Ingat saya</span>
                  </label>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setResetUser(username);
                      setResetStatus(null);
                      setForgotOpen(true);
                    }}
                    className="text-xs font-semibold text-[#c9a24b] hover:text-[#f4ebd0] underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b]"
                  >
                    Lupa kata laluan?
                  </button>
                </div>

                <div aria-live="polite">
                  {error && (
                    <div
                      role="alert"
                      className="p-3 rounded-xl bg-[#4A1C15]/90 border border-[#E57B63] text-xs font-medium text-[#FDEAE6] flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-[#F29C85] shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>

                <button
                  ref={submitBtnRef}
                  type="submit"
                  disabled={isBusy}
                  className="group relative overflow-hidden w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-b from-[#dfc06e] via-[#c9a24b] to-[#a98232] hover:from-[#ebd082] hover:to-[#c9a24b] disabled:opacity-75 text-[#0b2a21] border border-[#f4ebd0]/80 font-bold text-sm tracking-wider uppercase shadow-[0_8px_24px_rgba(201,162,75,0.35)] hover:shadow-[0_10px_30px_rgba(201,162,75,0.55)] active:scale-[0.985] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4ebd0]"
                >
                  {/* Animated progress fill while verifying */}
                  {authPhase === 'scanning' && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 w-full bg-[#f4ebd0]/30 origin-left transition-transform duration-500"
                    />
                  )}
                  {/* Hover shine sweep */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-white/45 to-transparent skew-x-[-20deg] group-hover:translate-x-[320%] transition-transform duration-700"
                  />
                  <Lock className="relative w-4 h-4" />
                  <span className="relative">
                    {authPhase === 'scanning'
                      ? 'Mengesahkan…'
                      : mode === 'login'
                      ? 'Masuk akademi'
                      : 'Daftar ejen baharu'}
                  </span>
                </button>
              </form>

              {/* Preserved Demo Access Slip */}
              <div className="mt-4 rounded-xl border border-dashed border-[#8a6a2f] bg-[#15402f]/65 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2.5 font-mono-tabular">
                <div className="space-y-0.5 text-[11px] leading-snug text-[#f4ebd0]/90">
                  <p className="font-bold text-[#c9a24b]">
                    Slip akses demo · Sekolah Seri Bestari
                  </p>
                  <p>
                    ID Ejen: <strong className="text-[#f4ebd0]">ejen.bestari</strong> · Kata Laluan:{' '}
                    <strong className="text-[#f4ebd0]">Bestari#2026</strong>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleFillDemo}
                  className="px-3 py-1.5 rounded-lg bg-[#c9a24b] hover:bg-[#dfc06e] text-[#0b2a21] text-[11px] font-bold transition-colors whitespace-nowrap shadow-sm active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4ebd0]"
                >
                  Isi akses demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preserved Lupa Kata Laluan Modal */}
      {forgotOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-title"
          className="fixed inset-0 z-50 bg-[#071b15]/80 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div className="dossier-unfold w-full max-w-md rounded-2xl bg-[#f4ebd0] text-[#0b2a21] border-2 border-[#c9a24b] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#15402f]/20 pb-3">
              <div>
                <p className="font-mono-tabular text-[11px] font-bold uppercase tracking-wider text-[#8a6a2f]">
                  Protokol Pemulihan Akses
                </p>
                <h2 id="forgot-title" className="font-display text-xl font-bold text-[#0b2a21]">
                  Tetapkan Semula Kata Laluan
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                aria-label="Tutup tetingkap pemulihan"
                className="p-1.5 rounded-lg text-[#15402f] hover:bg-[#e5d8bd]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordReset} className="space-y-3.5">
              <div>
                <label
                  htmlFor="reset-username"
                  className="block text-xs font-semibold text-[#15402f] mb-1"
                >
                  Nama Pengguna / ID Ejen
                </label>
                <input
                  id="reset-username"
                  type="text"
                  value={resetUser}
                  onChange={(e) => setResetUser(e.target.value)}
                  placeholder="Contoh: ejen.bestari"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#15402f]/25 text-base text-[#0b2a21]"
                />
              </div>

              <div>
                <label
                  htmlFor="reset-code"
                  className="block text-xs font-semibold text-[#15402f] mb-1"
                >
                  Kod Keselamatan Akademi (Kod Rasmi: BESTARI2026)
                </label>
                <input
                  id="reset-code"
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  placeholder="Masukkan kod keselamatan"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#15402f]/25 text-base text-[#0b2a21]"
                />
              </div>

              <div>
                <label
                  htmlFor="reset-new-pw"
                  className="block text-xs font-semibold text-[#15402f] mb-1"
                >
                  Kata Laluan Baharu (Min. 6 aksara)
                </label>
                <input
                  id="reset-new-pw"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan kata laluan baharu"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#15402f]/25 text-base text-[#0b2a21]"
                />
              </div>

              {resetStatus && (
                <div
                  role="alert"
                  className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2 ${
                    resetStatus.type === 'ok'
                      ? 'bg-[#cddccf] border-[#15402f]/40 text-[#0b2a21]'
                      : 'bg-[#FBECE8] border-[#C2593F] text-[#8C331D]'
                  }`}
                >
                  {resetStatus.type === 'ok' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#15402f] shrink-0" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-[#C2593F] shrink-0" />
                  )}
                  <span>{resetStatus.text}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#e5d8bd] text-xs font-semibold text-[#0b2a21]"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#15402f] hover:bg-[#0b2a21] text-[#f4ebd0] text-xs font-bold border border-[#c9a24b]"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#c9a24b]" />
                  {resetLoading ? 'Memproses...' : 'Sahkan Tetapan Semula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ADDED: access granted camera move */}
      <div aria-hidden="true" className={`login-flash ${flashOn ? 'on' : ''}`} />
    </div>
  );
}
