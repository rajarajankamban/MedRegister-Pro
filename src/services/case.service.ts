import { Injectable, signal, computed } from '@angular/core';

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
  duration: number; // in minutes
  paymentMode: 'Bank Transfer' | 'UPI' | 'Credit' | 'Cash';
  paymentStatus: PaymentStatus;
  surgeonName: string;
  amount: number;
  remarks?: string;
}

export interface SummaryRecord {
  period: string;
  cashTotal: number;
  digitalTotal: number;
  totalCases: number;
  totalAmount: number;
}

@Injectable({ providedIn: 'root' })
export class CaseService {
  private _cases = signal<CaseEntry[]>(this.getInitialData());
  
  cases = this._cases.asReadonly();

  totalEarnings = computed(() => 
    this._cases().reduce((acc, curr) => acc + curr.amount, 0)
  );

  hospitalStats = computed(() => {
    const stats: Record<string, number> = {};
    this._cases().forEach(c => {
      stats[c.hospital] = (stats[c.hospital] || 0) + c.amount;
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  });

  monthlySummary = computed(() => {
    const groups: Record<string, SummaryRecord> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    this._cases().forEach(c => {
      const d = new Date(c.date);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      
      if (!groups[key]) {
        groups[key] = { period: key, cashTotal: 0, digitalTotal: 0, totalCases: 0, totalAmount: 0 };
      }
      
      groups[key].totalCases += 1;
      groups[key].totalAmount += c.amount;
      if (c.paymentMode === 'Cash') {
        groups[key].cashTotal += c.amount;
      } else if (c.paymentMode === 'Bank Transfer' || c.paymentMode === 'UPI') {
        groups[key].digitalTotal += c.amount;
      }
    });

    return Object.values(groups).sort((a, b) => {
      const dateA = new Date(a.period);
      const dateB = new Date(b.period);
      return dateB.getTime() - dateA.getTime();
    });
  });

  annualSummary = computed(() => {
    const groups: Record<string, SummaryRecord> = {};

    this._cases().forEach(c => {
      const d = new Date(c.date);
      const key = `${d.getFullYear()}`;
      
      if (!groups[key]) {
        groups[key] = { period: key, cashTotal: 0, digitalTotal: 0, totalCases: 0, totalAmount: 0 };
      }
      
      groups[key].totalCases += 1;
      groups[key].totalAmount += c.amount;
      if (c.paymentMode === 'Cash') {
        groups[key].cashTotal += c.amount;
      } else if (c.paymentMode === 'Bank Transfer' || c.paymentMode === 'UPI') {
        groups[key].digitalTotal += c.amount;
      }
    });

    return Object.values(groups).sort((a, b) => b.period.localeCompare(a.period));
  });

  private getNextSerialForDate(date: string): number {
    const casesOnDate = this._cases().filter(c => c.date === date);
    if (casesOnDate.length === 0) return 1;
    return Math.max(...casesOnDate.map(c => c.serialNumber)) + 1;
  }

  addCase(entry: Omit<CaseEntry, 'id' | 'serialNumber'>) {
    const sn = this.getNextSerialForDate(entry.date);
    const newEntry: CaseEntry = {
      ...entry,
      id: Math.random().toString(36).substring(2, 9),
      serialNumber: sn
    };
    this._cases.update(prev => [newEntry, ...prev]);
  }

  deleteCase(id: string) {
    this._cases.update(prev => prev.filter(c => c.id !== id));
  }

  updateCase(updated: CaseEntry) {
    this._cases.update(prev => {
      const existing = prev.find(c => c.id === updated.id);
      // If date changed, we must recalculate serial number
      if (existing && existing.date !== updated.date) {
        updated.serialNumber = this.getNextSerialForDate(updated.date);
      }
      return prev.map(c => c.id === updated.id ? updated : c);
    });
  }

  private getInitialData(): CaseEntry[] {
    const hospitals = ['City Hospital', 'Wellness Clinic', 'Sunrise Medical Center', 'General Hospital'];
    const surgeons = ['Dr. Smith', 'Dr. Kapoor', 'Dr. Williams', 'Dr. Garcia'];
    const anesthesias = [
      'GA', 
      'Spinal anesthesia', 
      'Epidural + spinal', 
      'Epidural', 
      'Nerve block', 
      'IV sedation', 
      'LA', 
      'MAC'
    ];
    const paymentModes: Array<CaseEntry['paymentMode']> = ['Bank Transfer', 'UPI', 'Credit', 'Cash'];
    const paymentStatuses: PaymentStatus[] = ['SUCCESS', 'PENDING', 'CANCELLED', 'REFUNDED'];
    
    const cases: CaseEntry[] = [];
    const dateCountMap: Record<string, number> = {};

    for (let i = 0; i < 24; i++) {
      const dateObj = new Date();
      dateObj.setMonth(dateObj.getMonth() - Math.floor(i / 4));
      dateObj.setDate(1 + (i % 28));
      const dateStr = dateObj.toISOString().split('T')[0];

      // Daily serial logic
      dateCountMap[dateStr] = (dateCountMap[dateStr] || 0) + 1;
      const serialNumber = dateCountMap[dateStr];

      cases.push({
        id: `mock-${i}`,
        serialNumber,
        date: dateStr,
        hospital: hospitals[i % hospitals.length],
        patientName: `Patient ${i + 1}`,
        age: 25 + (i * 2),
        sex: i % 2 === 0 ? 'Male' : 'Female',
        diagnosis: i % 3 === 0 ? 'Acute Appendicitis' : 'Fracture Tibia',
        anesthesia: anesthesias[i % anesthesias.length],
        procedure: i % 3 === 0 ? 'Laparoscopic Appendectomy' : 'Open Reduction',
        startTime: '09:00',
        endTime: '10:30',
        duration: 90,
        paymentMode: paymentModes[i % paymentModes.length],
        paymentStatus: paymentStatuses[i % paymentStatuses.length],
        surgeonName: surgeons[i % surgeons.length],
        amount: 5000 + (i * 800),
        remarks: 'Smooth recovery'
      });
    }

    return cases.sort((a, b) => b.date.localeCompare(a.date) || b.serialNumber - a.serialNumber);
  }
}