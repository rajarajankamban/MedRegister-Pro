import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaseService } from '../services/case.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- Toggle & Quick Summary -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div class="flex p-1 bg-slate-200 rounded-xl">
          <button 
            (click)="reportType.set('monthly')"
            [class.bg-white]="reportType() === 'monthly'"
            [class.shadow-sm]="reportType() === 'monthly'"
            [class.text-blue-600]="reportType() === 'monthly'"
            class="px-6 py-2 rounded-lg text-sm font-bold transition-all text-slate-500">
            Monthly
          </button>
          <button 
            (click)="reportType.set('annual')"
            [class.bg-white]="reportType() === 'annual'"
            [class.shadow-sm]="reportType() === 'annual'"
            [class.text-blue-600]="reportType() === 'annual'"
            class="px-6 py-2 rounded-lg text-sm font-bold transition-all text-slate-500">
            Annual
          </button>
        </div>

        <div class="flex items-center gap-4 w-full md:w-auto">
          <button 
            (click)="caseService.refreshCases()"
            class="p-2.5 text-slate-400 hover:text-blue-600 bg-white rounded-xl border border-slate-200 hover:border-blue-100 transition-all shadow-sm"
            title="Refresh Data">
            <svg class="w-5 h-5" [class.animate-spin]="caseService.isLoading()" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
          <div class="bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl flex-1 md:flex-none">
            <p class="text-[10px] uppercase tracking-wider text-blue-500 font-bold">Total Period Value</p>
            <p class="text-lg font-black text-blue-700">₹{{ totalPeriodAmount() | number }}</p>
          </div>
        </div>
      </div>

      <!-- Report Table -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100">
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {{ reportType() === 'monthly' ? 'Month' : 'Year' }}
                </th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Cash Total (₹)</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Bank/UPI Total (₹)</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Total Cases</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-black text-slate-900 text-right">Total Amount (₹)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              @for (row of activeSummary(); track row.period) {
                <tr class="hover:bg-slate-50/50 transition-colors">
                  <td class="px-6 py-5">
                    <div class="text-sm font-bold text-slate-900">{{ row.period }}</div>
                  </td>
                  <td class="px-6 py-5 text-right">
                    <div class="text-sm font-medium text-emerald-600">₹{{ row.cashTotal | number }}</div>
                  </td>
                  <td class="px-6 py-5 text-right">
                    <div class="text-sm font-medium text-blue-600">₹{{ row.digitalTotal | number }}</div>
                  </td>
                  <td class="px-6 py-5 text-center">
                    <div class="inline-flex px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                      {{ row.totalCases }} Cases
                    </div>
                  </td>
                  <td class="px-6 py-5 text-right">
                    <div class="text-sm font-black text-slate-900">₹{{ row.totalAmount | number }}</div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="px-6 py-24 text-center">
                    <div class="flex flex-col items-center gap-3 max-w-xs mx-auto">
                      <div class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      </div>
                      <p class="text-slate-900 font-bold">No Records Found</p>
                      <p class="text-slate-400 text-xs font-medium">Try clicking the refresh icon if you recently added cases.</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
            @if (activeSummary().length > 0) {
              <tfoot class="bg-slate-50 font-bold border-t-2 border-slate-100">
                 <tr>
                  <td class="px-6 py-4 text-sm text-slate-900 font-black uppercase tracking-wider">Grand Total</td>
                  <td class="px-6 py-4 text-sm text-emerald-600 text-right">₹{{ grandTotals().cash | number }}</td>
                  <td class="px-6 py-4 text-sm text-blue-600 text-right">₹{{ grandTotals().digital | number }}</td>
                  <td class="px-6 py-4 text-sm text-slate-900 text-center">{{ grandTotals().cases }}</td>
                  <td class="px-6 py-4 text-sm text-slate-900 font-black text-right">₹{{ totalPeriodAmount() | number }}</td>
                </tr>
              </tfoot>
            }
          </table>
        </div>
      </div>

      <div class="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 items-center">
        <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <p class="text-xs text-amber-700 font-medium">
          Note: Bank/UPI Total includes Bank Transfer and UPI payments. Credits are excluded from financial totals but included in case counts.
        </p>
      </div>
    </div>
  `
})
export class ReportsComponent {
  caseService = inject(CaseService);
  reportType = signal<'monthly' | 'annual'>('monthly');

  activeSummary = computed(() => 
    this.reportType() === 'monthly' ? (this.caseService.monthlySummary() || []) : (this.caseService.annualSummary() || [])
  );

  totalPeriodAmount = computed(() => 
    this.activeSummary().reduce((acc, curr) => acc + (curr.totalAmount || 0), 0)
  );

  grandTotals = computed(() => {
    const summary = this.activeSummary();
    return {
      cash: summary.reduce((acc, curr) => acc + (curr.cashTotal || 0), 0),
      digital: summary.reduce((acc, curr) => acc + (curr.digitalTotal || 0), 0),
      cases: summary.reduce((acc, curr) => acc + (curr.totalCases || 0), 0)
    };
  });
}