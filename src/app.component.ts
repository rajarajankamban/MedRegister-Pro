import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
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
export class AppComponent {
  caseService = inject(CaseService);
  auth = inject(AuthService);
  
  activeTab = signal<'register' | 'dashboard' | 'reports'>('register');
  showForm = signal(false);
  editingCase = signal<CaseEntry | null>(null);
  searchQuery = signal('');
  statusFilter = signal<string>('ALL');

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