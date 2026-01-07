import { Component, output, inject, signal, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CaseEntry } from '../services/case.service';

@Component({
  selector: 'app-case-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
        <div class="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <div>
            <h2 class="text-2xl font-bold text-slate-900">{{ initialData() ? 'Edit Case Entry' : 'Add New Case Entry' }}</h2>
            @if (initialData()) {
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Daily Serial: #{{ model.serialNumber }}</span>
                <span class="text-xs text-slate-400 font-medium">Auto-generated for each day</span>
              </div>
            }
          </div>
          <button (click)="cancel.emit()" class="text-slate-500 hover:text-slate-800 transition-colors p-2 rounded-full hover:bg-slate-100">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form (ngSubmit)="onSubmit()" #caseForm="ngForm" class="p-6 space-y-6 bg-white">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Basic Info -->
            <div>
              <label class="block text-sm font-bold text-slate-900 mb-2">Date *</label>
              <input type="date" name="date" [(ngModel)]="model.date" required 
                class="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all">
              @if (initialData() && model.date !== initialData()?.date) {
                <p class="text-[10px] text-amber-600 font-bold mt-1">Note: Changing date will recalculate Daily S.No</p>
              }
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-900 mb-2">Hospital *</label>
              <select name="hospital" [(ngModel)]="model.hospital" required 
                class="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="" disabled>Select Hospital</option>
                <option value="City Hospital">City Hospital</option>
                <option value="Wellness Clinic">Wellness Clinic</option>
                <option value="Sunrise Medical Center">Sunrise Medical Center</option>
                <option value="General Hospital">General Hospital</option>
              </select>
            </div>

            <!-- Patient Details -->
            <div class="md:col-span-1">
              <label class="block text-sm font-bold text-slate-900 mb-2">Patient Name *</label>
              <input type="text" name="patientName" [(ngModel)]="model.patientName" required placeholder="Enter Patient Full Name" 
                class="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-bold text-slate-900 mb-2">Age</label>
                <input type="number" name="age" [(ngModel)]="model.age" 
                  class="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-900 mb-2">Sex</label>
                <select name="sex" [(ngModel)]="model.sex" 
                  class="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <!-- Medical Info -->
            <div class="md:col-span-2">
              <label class="block text-sm font-bold text-slate-900 mb-2">Diagnosis *</label>
              <input type="text" name="diagnosis" [(ngModel)]="model.diagnosis" required placeholder="Enter clinical diagnosis" 
                class="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
            
            <div>
              <label class="block text-sm font-bold text-slate-900 mb-2">Anaesthesia Type</label>
              <select name="anesthesia" [(ngModel)]="model.anesthesia" 
                class="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="GA">GA</option>
                <option value="Spinal anesthesia">Spinal anesthesia</option>
                <option value="Epidural + spinal">Epidural + spinal</option>
                <option value="Epidural">Epidural</option>
                <option value="Nerve block">Nerve block</option>
                <option value="IV sedation">IV sedation</option>
                <option value="LA">LA</option>
                <option value="MAC">MAC</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-900 mb-2">Procedure</label>
              <input type="text" name="procedure" [(ngModel)]="model.procedure" placeholder="Enter procedure name" 
                class="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none">
            </div>

            <!-- Time Info -->
            <div class="grid grid-cols-2 gap-3">
              <div class="relative group">
                <label class="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  Start Time
                  <svg class="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </label>
                <input type="time" name="startTime" [(ngModel)]="model.startTime" (change)="calculateDuration()" 
                  class="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer hover:bg-white shadow-inner">
              </div>
              <div class="relative group">
                <label class="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  End Time
                  <svg class="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </label>
                <input type="time" name="endTime" [(ngModel)]="model.endTime" (change)="calculateDuration()" 
                  class="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer hover:bg-white shadow-inner">
              </div>
            </div>
            <div class="flex items-end">
              <div class="w-full bg-blue-50/50 px-4 py-2.5 rounded-xl border border-dashed border-blue-200 text-slate-900 text-sm font-medium">
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">Calculated Duration:</span>
                  <span class="font-black text-blue-700">{{ displayDuration }}</span>
                </div>
              </div>
            </div>

            <!-- Financials & Payment -->
            <div>
              <label class="block text-sm font-bold text-slate-900 mb-2">Amount (₹) *</label>
              <input type="number" name="amount" [(ngModel)]="model.amount" required 
                class="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-blue-700 font-bold text-lg focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
            <div class="grid grid-cols-1 gap-4">
              <div>
                <label class="block text-sm font-bold text-slate-900 mb-2">Payment Mode</label>
                <select name="paymentMode" [(ngModel)]="model.paymentMode" 
                  class="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Credit">Credit</option>
                </select>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-bold text-slate-900 mb-2">Payment Status</label>
              <select name="paymentStatus" [(ngModel)]="model.paymentStatus" 
                class="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="PENDING">PENDING</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="REFUNDED">REFUNDED</option>
              </select>
            </div>

            <div class="md:col-span-1">
              <label class="block text-sm font-bold text-slate-900 mb-2">Surgeon Name</label>
              <input type="text" name="surgeonName" [(ngModel)]="model.surgeonName" placeholder="Operating Surgeon"
                class="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none">
            </div>

            <div class="md:col-span-2">
              <label class="block text-sm font-bold text-slate-900 mb-2">Remarks (Optional)</label>
              <textarea name="remarks" [(ngModel)]="model.remarks" rows="2" placeholder="Any additional clinical notes..." 
                class="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
            </div>
          </div>

          <div class="pt-6 border-t border-slate-100 flex gap-4 justify-end sticky bottom-0 bg-white mt-4 pb-2">
            <button type="button" (click)="cancel.emit()" 
              class="px-8 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all">
              Cancel
            </button>
            <button type="submit" [disabled]="!caseForm.valid" 
              class="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {{ initialData() ? 'Update Entry' : 'Save Entry' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class CaseFormComponent {
  initialData = input<CaseEntry | null>(null);
  save = output<CaseEntry | Omit<CaseEntry, 'id' | 'serialNumber'>>();
  cancel = output<void>();

  model: CaseEntry = this.getDefaultModel();

  constructor() {
    effect(() => {
      const data = this.initialData();
      if (data) {
        this.model = { ...data };
      } else {
        this.model = this.getDefaultModel();
      }
    });
  }

  private getDefaultModel(): CaseEntry {
    return {
      id: '',
      serialNumber: 0,
      date: new Date().toISOString().split('T')[0],
      hospital: '',
      patientName: '',
      age: 0,
      sex: 'Male',
      diagnosis: '',
      anesthesia: 'GA',
      procedure: '',
      startTime: '09:00',
      endTime: '10:00',
      duration: 60,
      paymentMode: 'UPI',
      paymentStatus: 'PENDING',
      surgeonName: '',
      amount: 0,
      remarks: ''
    };
  }

  get displayDuration(): string {
    const mins = this.model.duration;
    if (mins < 60) {
      return `${mins} mins`;
    }
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    
    if (remainingMins === 0) {
      return `${hrs} ${hrs === 1 ? 'hour' : 'hours'}`;
    }
    return `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ${remainingMins} minutes`;
  }

  calculateDuration() {
    if (!this.model.startTime || !this.model.endTime) return;
    const start = this.model.startTime.split(':');
    const end = this.model.endTime.split(':');
    const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
    const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
    
    let diff = endMinutes - startMinutes;
    if (diff < 0) diff += 1440; // Handle overnight procedures
    this.model.duration = diff;
  }

  onSubmit() {
    if (!this.model.id) {
      const { id, serialNumber, ...newEntry } = this.model;
      this.save.emit(newEntry as Omit<CaseEntry, 'id' | 'serialNumber'>);
    } else {
      this.save.emit(this.model);
    }
  }
}