import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('viagens_install_dismissed') === '1'; } catch { return false; }
  });

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) setInstalled(true);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || dismissed || !deferredPrompt) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem('viagens_install_dismissed', '1'); } catch { /* não crítico */ }
  };

  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shrink-0">
        <span className="text-white font-bold text-xs">VS</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-dark-50">Instalar o Viagens Smart</div>
        <div className="text-xs text-dark-400">Acesso rápido direto da tela inicial</div>
      </div>
      <button
        onClick={handleInstall}
        className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25 transition-all"
      >
        Instalar
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Dispensar"
        className="shrink-0 w-7 h-7 rounded-lg text-dark-500 hover:text-dark-300 hover:bg-dark-700 flex items-center justify-center transition-all"
      >
        ×
      </button>
    </div>
  );
}
