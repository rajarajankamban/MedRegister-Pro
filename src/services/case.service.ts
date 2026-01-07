import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class CaseService {
  private http = inject(HttpClient);
  private readonly apiUrl = '/api/cases';
  
  private _cases = signal<CaseEntry[]>([]);
  private _loading = signal<boolean>(false);
  
  cases = this._cases.asReadonly();
  isLoading = this._loading.asReadonly();

  constructor() {
    this.refreshCases();
  }

  async refreshCases() {
    this._loading.set(true);
    try {
      const data = await firstValueFrom(this.http.get<any[]>(this.apiUrl));
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
      const response = await firstValueFrom(this.http.post<any>(this.apiUrl, entry));
      if (response) {
        const newCase = this.mapFromDb(response);
        this._cases.update(prev => [newCase, ...prev]);
      }
    } catch (error) {
      console.error('Failed to add case:', error);
      alert('Error saving case. Please check your network or DB settings.');
    } finally {
      this._loading.set(false);
    }
  }

  async updateCase(updated: CaseEntry) {
    this._loading.set(true);
    try {
      const response = await firstValueFrom(
        this.http.patch<any>(`${this.apiUrl}?id=${updated.id}`, updated)
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
      await firstValueFrom(this.http.delete(`${this.apiUrl}?id=${id}`));
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
      date: db.date, // Backend now returns date as 'YYYY-MM-DD' text string
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

  monthlySummary = computed(() => {
    const groups: Record<string, any> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    this._cases().forEach(c => {
      const d = new Date(c.date);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (!groups[key]) {
        groups[key] = { period: key, cashTotal: 0, digitalTotal: 0, totalCases: 0, totalAmount: 0 };
      }
      groups[key].totalCases += 1;
      groups[key].totalAmount += (c.amount || 0);
      if (c.paymentMode === 'Cash') {
        groups[key].cashTotal += (c.amount || 0);
      } else if (['Bank Transfer', 'UPI'].includes(c.paymentMode)) {
        groups[key].digitalTotal += (c.amount || 0);
      }
    });
    return Object.values(groups).sort((a: any, b: any) => new Date(b.period).getTime() - new Date(a.period).getTime());
  });

  annualSummary = computed(() => {
    const groups: Record<string, any> = {};
    this._cases().forEach(c => {
      const d = new Date(c.date);
      const key = `${d.getFullYear()}`;
      if (!groups[key]) {
        groups[key] = { period: key, cashTotal: 0, digitalTotal: 0, totalCases: 0, totalAmount: 0 };
      }
      groups[key].totalCases += 1;
      groups[key].totalAmount += (c.amount || 0);
      if (c.paymentMode === 'Cash') {
        groups[key].cashTotal += (c.amount || 0);
      } else if (['Bank Transfer', 'UPI'].includes(c.paymentMode)) {
        groups[key].digitalTotal += (c.amount || 0);
      }
    });
    return Object.values(groups).sort((a: any, b: any) => b.period.localeCompare(a.period));
  });
}
