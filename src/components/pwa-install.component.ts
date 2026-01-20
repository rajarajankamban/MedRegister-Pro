import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaService } from '../services/pwa.service';

@Component({
  selector: 'app-pwa-install',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (pwa.isInstallable()) {
      <div class="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-[60] animate-bounce">
        <button 
          (click)="pwa.promptInstall()"
          class="flex items-center gap-3 bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold shadow-2xl shadow-blue-300 hover:bg-blue-700 active:scale-95 transition-all border-2 border-white/20">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
          </svg>
          <span class="hidden md:inline">Install MedRegister App</span>
          <span class="md:hidden">Install App</span>
        </button>
      </div>
    }
  `
})
export class PwaInstallComponent {
  pwa = inject(PwaService);
}