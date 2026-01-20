import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PwaService {
  private deferredPrompt = signal<any>(null);
  private _isInstalled = signal<boolean>(false);

  isInstallable = computed(() => !!this.deferredPrompt() && !this._isInstalled());

  constructor() {
    this.init();
  }

  private init() {
    // Detect if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      this._isInstalled.set(true);
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      this.deferredPrompt.set(e);
    });

    window.addEventListener('appinstalled', () => {
      this._isInstalled.set(true);
      this.deferredPrompt.set(null);
      console.log('MedRegister Pro was installed');
    });
  }

  async promptInstall() {
    const promptEvent = this.deferredPrompt();
    if (!promptEvent) return;

    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    
    if (outcome === 'accepted') {
      this.deferredPrompt.set(null);
    }
  }
}