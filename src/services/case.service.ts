import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'CANCELLED' | 'REFUNDED';

export interface CaseEntry {
  id: string;
  serialNumber: number;
  date: string;
  hospital: string;
  patientName: string;
  age: number;
  sex: 'Male' | 'Female' | 'Other';
  diagnosis: string;
  anesthesia: string;
  procedure: string;
  startTime: string;
  endTime: string;
  duration: number;
  paymentMode: 'Bank Transfer' | 'UPI' | 'Credit' | 'Cash';
  paymentStatus: PaymentStatus;
  surgeonName: string;
  amount: number;
  remarks?: string;
}

interface SummaryGroup {
  period: string;
  sortKey: number;
  cashTotal: number;
  digitalTotal: number;
  totalCases: number;
  totalAmount: number;
}

@Injectable({ providedIn: 'root' })
export class CaseService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly auth: AuthService = inject(AuthService);
  private readonly apiUrl = '/api/cases';
  
  private _cases = signal<CaseEntry[]>([]);
  private _loading = signal<boolean>(false);
  
  cases = this._cases.asReadonly();
  isLoading = this._loading.asReadonly();

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.refreshCases();
      } else {
        this._cases.set([]);
      }
    });
  }

  private getHeaders(): HttpHeaders {
    const userId = this.auth.getUserId() || '';
    return new HttpHeaders().set('x-user-id', userId);
  }

  async refreshCases() {
    if (!this.auth.isAuthenticated()) return;

    this._loading.set(true);
    try {
      const data = await firstValueFrom(
        this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() })
      );
      const mapped: CaseEntry[] = (data || []).map(db => this.mapFromDb(db));
      this._cases.set(mapped);
    } catch (error) {
      console.error('Failed to fetch cases:', error);
    } finally {
      this._loading.set(false);
    }
  }

  async addCase(entry: Omit<CaseEntry, 'id' | 'serialNumber'>) {
    this._loading.set(true);
    try {
      const response = await firstValueFrom(
        this.http.post<any>(this.apiUrl, entry, { headers: this.getHeaders() })
      );
      if (response) {
        const newCase = this.mapFromDb(response);
        this._cases.update(prev => [newCase, ...prev]);
      }
    } catch (error) {
      console.error('Failed to add case:', error);
    } finally {
      this._loading.set(false);
    }
  }

  async updateCase(updated: CaseEntry) {
    this._loading.set(true);
    try {
      const response = await firstValueFrom(
        this.http.patch<any>(`${this.apiUrl}?id=${updated.id}`, updated, { headers: this.getHeaders() })
      );
      if (response) {
        const refreshed = this.mapFromDb(response);
        this._cases.update(prev => prev.map(c => c.id === refreshed.id ? refreshed : c));
      }
    } catch (error) {
      console.error('Failed to update case:', error);
    } finally {
      this._loading.set(false);
    }
  }

  async deleteCase(id: string) {
    this._loading.set(true);
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}?id=${id}`, { headers: this.getHeaders() })
      );
      this._cases.update(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Failed to delete case:', error);
    } finally {
      this._loading.set(false);
    }
  }

  private mapFromDb(db: any): CaseEntry {
    return {
      id: db.id,
      serialNumber: db.serial_number,
      date: db.date,
      hospital: db.hospital,
      patientName: db.patient_name,
      age: db.age,
      sex: db.sex,
      diagnosis: db.diagnosis,
      anesthesia: db.anesthesia,
      procedure: db.procedure,
      startTime: db.start_time?.substring(0, 5) || '00:00',
      endTime: db.end_time?.substring(0, 5) || '00:00',
      duration: db.duration,
      paymentMode: db.payment_mode,
      paymentStatus: db.payment_status,
      surgeonName: db.surgeon_name,
      amount: parseFloat(db.amount || 0),
      remarks: db.remarks
    };
  }

  totalEarnings = computed(() => 
    this._cases().reduce((acc, curr) => acc + (curr.amount || 0), 0)
  );

  hospitalStats = computed(() => {
    const stats: Record<string, number> = {};
    this._cases().forEach(c => {
      stats[c.hospital] = (stats[c.hospital] || 0) + (c.amount || 0);
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  });

  monthlySummary = computed<SummaryGroup[]>(() => {
    const cases = this._cases();
    const groups = new Map<string, SummaryGroup>();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    cases.forEach(c => {
      // Robust split-based parsing to avoid browser-specific Date issues
      const parts = c.date.split('-'); 
      let year: number, month: number;

      if (parts.length === 3) {
        year = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
      } else {
        const d = new Date(c.date);
        if (isNaN(d.getTime())) return;
        year = d.getFullYear();
        month = d.getMonth();
      }

      const periodKey = `${monthNames[month]} ${year}`;
      const sortKey = year * 100 + month;

      if (!groups.has(periodKey)) {
        groups.set(periodKey, { period: periodKey, sortKey, cashTotal: 0, digitalTotal: 0, totalCases: 0, totalAmount: 0 });
      }
      
      const g = groups.get(periodKey)!;
      g.totalCases += 1;
      g.totalAmount += (c.amount || 0);
      
      const mode = (c.paymentMode || '').toLowerCase();
      if (mode === 'cash') {
        g.cashTotal += (c.amount || 0);
      } else if (mode === 'bank transfer' || mode === 'upi') {
        g.digitalTotal += (c.amount || 0);
      }
    });

    return Array.from(groups.values()).sort((a, b) => b.sortKey - a.sortKey);
  });

  annualSummary = computed<SummaryGroup[]>(() => {
    const cases = this._cases();
    const groups = new Map<string, SummaryGroup>();

    cases.forEach(c => {
      const parts = c.date.split('-');
      let year: number;
      if (parts.length === 3) {
        year = parseInt(parts[0]);
      } else {
        const d = new Date(c.date);
        if (isNaN(d.getTime())) return;
        year = d.getFullYear();
      }

      const periodKey = `${year}`;
      if (!groups.has(periodKey)) {
        groups.set(periodKey, { period: periodKey, sortKey: year, cashTotal: 0, digitalTotal: 0, totalCases: 0, totalAmount: 0 });
      }
      
      const g = groups.get(periodKey)!;
      g.totalCases += 1;
      g.totalAmount += (c.amount || 0);
      
      const mode = (c.paymentMode || '').toLowerCase();
      if (mode === 'cash') {
        g.cashTotal += (c.amount || 0);
      } else if (mode === 'bank transfer' || mode === 'upi') {
        g.digitalTotal += (c.amount || 0);
      }
    });

    return Array.from(groups.values()).sort((a, b) => b.sortKey - a.sortKey);
  });
}