import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export function InstallPWA() {
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show the install button
      setShowInstallButton(true);
    };

    const handleAppInstalled = () => {
      // Hide the install button
      setShowInstallButton(false);
      // Clear the deferredPrompt
      setDeferredPrompt(null);
      // Log the installation
      console.log('PWA was installed');
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false);
    }

    // Clean up event listeners
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      // Clear the deferredPrompt
      setDeferredPrompt(null);
      // Hide the install button
      setShowInstallButton(false);
    });
  };

  if (!showInstallButton) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        id="install-button"
        onClick={handleInstallClick}
        className="flex items-center space-x-2 bg-primary-orange text-white px-4 py-2 rounded-full shadow-lg hover:bg-primary-orange/90 transition-colors"
      >
        <Download className="h-5 w-5" />
        <span>Install App</span>
      </button>
    </div>
  );
}