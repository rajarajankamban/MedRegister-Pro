import { Component, inject, effect, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaseService } from '../services/case.service';
import * as d3 from 'd3';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- Stats Overview -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p class="text-sm font-medium text-slate-500 mb-1">Total Earnings</p>
          <h3 class="text-3xl font-bold text-slate-900">₹{{ caseService.totalEarnings() | number }}</h3>
          <div class="mt-2 flex items-center text-emerald-600 text-sm font-medium">
            <span class="mr-1">↑ 12%</span>
            <span>vs last month</span>
          </div>
        </div>
        
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p class="text-sm font-medium text-slate-500 mb-1">Total Procedures</p>
          <h3 class="text-3xl font-bold text-slate-900">{{ caseService.cases().length }}</h3>
          <div class="mt-2 flex items-center text-slate-600 text-sm font-medium">
            <span>Average: {{ (caseService.totalEarnings() / (caseService.cases().length || 1)) | currency:'INR':'symbol':'1.0-0' }} / case</span>
          </div>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p class="text-sm font-medium text-slate-500 mb-1">Top Hospital</p>
          <h3 class="text-3xl font-bold text-slate-900">{{ topHospital()?.name || 'N/A' }}</h3>
          <div class="mt-2 text-slate-600 text-sm font-medium">
            <span>₹{{ topHospital()?.value | number }} earned here</span>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h4 class="text-lg font-bold text-slate-800 mb-6">Hospital Revenue Split</h4>
          <div #chartContainer class="h-64 w-full"></div>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h4 class="text-lg font-bold text-slate-800 mb-4">Recent Performance Analysis</h4>
          <div class="space-y-4">
            @for (h of caseService.hospitalStats(); track h.name) {
              <div>
                <div class="flex justify-between text-sm font-medium mb-1">
                  <span>{{ h.name }}</span>
                  <span>₹{{ h.value | number }}</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2">
                  <div class="bg-blue-600 h-2 rounded-full" [style.width.%]="(h.value / (caseService.totalEarnings() || 1)) * 100"></div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent {
  caseService = inject(CaseService);
  chartContainer = viewChild<ElementRef>('chartContainer');

  topHospital = () => {
    const stats = this.caseService.hospitalStats();
    if (stats.length === 0) return null;
    return [...stats].sort((a, b) => b.value - a.value)[0];
  };

  constructor() {
    effect(() => {
      const el = this.chartContainer();
      if (el) {
        this.renderChart(el.nativeElement);
      }
    });
  }

  renderChart(element: HTMLElement) {
    const data = this.caseService.hospitalStats();
    if (!data.length) return;

    d3.select(element).selectAll('*').remove();

    const margin = { top: 10, right: 10, bottom: 30, left: 40 };
    const width = element.clientWidth - margin.left - margin.right;
    const height = element.clientHeight - margin.top - margin.bottom;

    const svg = d3.select(element)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .range([0, width])
      .domain(data.map(d => d.name))
      .padding(0.4);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) as number])
      .range([height, 0]);

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('font-family', 'Inter')
      .style('font-size', '10px');

    svg.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('~s')))
      .selectAll('text')
      .style('font-family', 'Inter');

    svg.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => x(d.name) || 0)
      .attr('y', d => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.value))
      .attr('fill', '#3b82f6')
      .attr('rx', 4);
  }
}