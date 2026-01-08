import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaseService, CaseEntry } from './services/case.service';
import { AuthService } from './services/auth.service';
import { DashboardComponent } from './components/dashboard.component';
import { CaseFormComponent } from './components/case-form.component';
import { ReportsComponent } from './components/reports.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DashboardComponent, CaseFormComponent, ReportsComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  caseService = inject(CaseService);
  auth = inject(AuthService);
  
  activeTab = signal<'register' | 'dashboard' | 'reports'>('register');
  showForm = signal(false);
  editingCase = signal<CaseEntry | null>(null);
  searchQuery = signal('');
  statusFilter = signal<string>('ALL');

  // PWA Install Prompt state
  private deferredPrompt = signal<any>(null);
  canInstall = computed(() => !!this.deferredPrompt());

  ngOnInit() {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      this.deferredPrompt.set(e);
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.deferredPrompt.set(null);
    });
  }

  async installPWA() {
    const promptEvent = this.deferredPrompt();
    if (!promptEvent) return;

    // Show the install prompt
    promptEvent.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await promptEvent.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    this.deferredPrompt.set(null);
  }

  filteredCases = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const s = this.statusFilter();
    
    return this.caseService.cases().filter(c => {
      const matchesSearch = (c.patientName || '').toLowerCase().includes(q) || 
                          (c.hospital || '').toLowerCase().includes(q) ||
                          (c.diagnosis || '').toLowerCase().includes(q);
      const matchesStatus = s === 'ALL' || c.paymentStatus === s;
      return matchesSearch && matchesStatus;
    });
  });

  async login() {
    try {
      await this.auth.signInWithGoogle();
    } catch (e) {
      alert('Login failed. Please try again.');
    }
  }

  async logout() {
    await this.auth.signOut();
  }

  openAddForm() {
    this.editingCase.set(null);
    this.showForm.set(true);
  }

  openEditForm(entry: CaseEntry) {
    this.editingCase.set(entry);
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingCase.set(null);
  }

  async handleSave(entry: any) {
    if (entry.id) {
      await this.caseService.updateCase(entry);
    } else {
      await this.caseService.addCase(entry);
    }
    this.closeForm();
  }

  async deleteCase(id: string) {
    if (confirm('Are you sure you want to delete this case entry forever?')) {
      await this.caseService.deleteCase(id);
    }
  }
}