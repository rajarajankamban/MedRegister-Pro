import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaseService, CaseEntry } from './services/case.service';
import { DashboardComponent } from './components/dashboard.component';
import { CaseFormComponent } from './components/case-form.component';
import { ReportsComponent } from './components/reports.component';
import { GoogleGenAI } from "@google/genai";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DashboardComponent, CaseFormComponent, ReportsComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {
  caseService = inject(CaseService);
  activeTab = signal<'register' | 'dashboard' | 'reports'>('register');
  showForm = signal(false);
  editingCase = signal<CaseEntry | null>(null);
  searchQuery = signal('');
  statusFilter = signal<string>('ALL');
  aiInsight = signal<string | null>(null);
  isAnalyzing = signal(false);

  filteredCases = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const s = this.statusFilter();
    
    return this.caseService.cases().filter(c => {
      const matchesSearch = c.patientName.toLowerCase().includes(q) || 
                          c.hospital.toLowerCase().includes(q) ||
                          c.diagnosis.toLowerCase().includes(q);
      const matchesStatus = s === 'ALL' || c.paymentStatus === s;
      return matchesSearch && matchesStatus;
    });
  });

  async generateAiInsights() {
    this.isAnalyzing.set(true);
    try {
      const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
      const stats = this.caseService.hospitalStats();
      const total = this.caseService.totalEarnings();
      
      const prompt = `As a medical practice consultant, analyze these doctor earnings stats: Total Earnings: ₹${total}. Hospital breakdown: ${JSON.stringify(stats)}. Provide a 2-sentence professional analysis of where growth is and one recommendation. Keep it brief and encouraging.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      this.aiInsight.set(response.text);
    } catch (err) {
      console.error(err);
      this.aiInsight.set("Unable to reach AI consultant at this time.");
    } finally {
      this.isAnalyzing.set(false);
    }
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

  handleSave(entry: CaseEntry | Omit<CaseEntry, 'id'>) {
    if ('id' in entry && entry.id) {
      this.caseService.updateCase(entry as CaseEntry);
    } else {
      this.caseService.addCase(entry as Omit<CaseEntry, 'id'>);
    }
    this.closeForm();
  }

  deleteCase(id: string) {
    if (confirm('Delete this case entry?')) {
      this.caseService.deleteCase(id);
    }
  }
}