import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import useDashboardStore from '../store';
import { ChevronDown, TrendingUp } from 'lucide-react';

// Converts any value the backend might send into a plain number or null.
// Handles: plain numbers, null/undefined, {value:…} objects, {date,value} objects.
function toChartValue(item) {
  if (item === null || item === undefined) return null;
  if (typeof item === 'number') return item;
  if (typeof item === 'object' && 'value' in item) return Number(item.value);
  const n = Number(item);
  return isNaN(n) ? null : n;
}

// Helper function to parse dates and aggregate
function calculateTimeSeries(rawData, column) {
  if (!rawData || !column) return { seriesData: [], xAxisData: [] };

  const monthlyCounts = {};
  for (const row of rawData) {
    try {
      const date = new Date(row[column]);
      if (isNaN(date.getTime())) continue;

      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyCounts[monthYear] = (monthlyCounts[monthYear] || 0) + 1;
    } catch (e) {
      // Ignore errors for this row
    }
  }

  const sortedDates = Object.keys(monthlyCounts).sort();
  const data = sortedDates.map(date => monthlyCounts[date]);

  return {
    seriesData: [{ name: "Record Count (Actual)", type: "line", smooth: true, data }],
    xAxisData: sortedDates,
  };
}

export default function TimeSeriesTrends({ initialColumn, initialData, initialXAxis, allColumns, anomalies = [], forecastData = [] }) {
  const { rawData } = useDashboardStore();

  const [selectedColumn, setSelectedColumn] = useState(initialColumn || '');

  useEffect(() => {
    if (initialColumn) setSelectedColumn(initialColumn);
  }, [initialColumn]);

  const handleColumnChange = (e) => setSelectedColumn(e.target.value);

  const currentAnomaliesRaw = Array.isArray(anomalies)
    ? anomalies.map(item => ({
      date: item?.date ?? '',
      value:
        typeof item?.value === 'object'
          ? JSON.stringify(item.value)
          : Number(item?.value ?? 0)
    }))
    : [];

  // Normalise forecastData once — converts {date,value} objects → plain numbers
  const normalizedForecast = useMemo(() =>
    (Array.isArray(forecastData) ? forecastData : []).map(toChartValue),
    [forecastData]
  );

  const { actualSeriesData, forecastSeriesData, xAxisData } = useMemo(() => {
    if (selectedColumn === initialColumn) {
      // Backend path: initialData[0].data holds actual values
      const act = Array.isArray(initialData) ? (initialData[0]?.data ?? []) : [];
      return {
        actualSeriesData: act.map(toChartValue),
        forecastSeriesData: normalizedForecast,
        xAxisData: initialXAxis || [],
      };
    }

    // User changed the column — recalculate from raw data (no forecast)
    const result = calculateTimeSeries(rawData, selectedColumn);
    const act = result.seriesData[0]?.data ?? [];
    return {
      actualSeriesData: act.map(toChartValue),
      forecastSeriesData: [],
      xAxisData: result.xAxisData,
    };
  }, [rawData, selectedColumn, initialColumn, initialData, initialXAxis, normalizedForecast]);

  const currentAnomalies = selectedColumn === initialColumn ? currentAnomaliesRaw : [];

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderWidth: 1,
      borderColor: '#e0e7f1',
      textStyle: { color: '#261c1a' },
    },
    legend: { bottom: 0, icon: 'circle' },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xAxisData || [],
      axisLine: { lineStyle: { color: '#6b7280' } },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'dashed', color: '#e0e7f1' } },
    },
    series: [
      {
        name: "Actual",
        type: "line",
        smooth: true,
        // toChartValue already applied in useMemo, but guard here too
        data: Array.isArray(actualSeriesData)
          ? actualSeriesData.map(v =>
            typeof v === 'object'
              ? Number(v.value ?? 0)
              : Number(v)
          )
          : [],
        itemStyle: { color: '#D07C5C' },
        lineStyle: { width: 3 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(208, 124, 92, 0.2)' },
              { offset: 1, color: 'rgba(208, 124, 92, 0)' },
            ],
          },
        },
        markPoint: {
          data: currentAnomalies.map(a => ({
            name: 'Anomaly',
            coord: [a.date, Number(a.value)],
            value: '!',
            itemStyle: { color: '#ef4444' }
          }))
        },
      },
      {
        name: "Forecast",
        type: "line",
        smooth: true,
        lineStyle: { type: 'dashed', width: 2, color: '#261c1a' },
        itemStyle: { color: '#261c1a' },
        data: Array.isArray(forecastSeriesData)
          ? forecastSeriesData.map(v =>
            typeof v === 'object'
              ? Number(v.value ?? 0)
              : Number(v)
          )
          : []
      },
    ],
  };

  if (!allColumns || allColumns.length === 0) {
    return (
      <div className="card time-series-chart" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: 'var(--color-battle-grey)' }}>No valid time/date column found for trend analysis.</p>
      </div>
    );
  }

  return (
    <div className="card time-series-chart advanced-chart">
      <div className="card-header-with-controls">
        <div className="card-title">
          <TrendingUp size={18} style={{ marginRight: '8px', color: '#D07C5C' }} />
          Predictive Insights
        </div>
        <div className="chart-controls">
          <ChevronDown size={16} className="select-icon" />
          <select className="chart-select" value={selectedColumn} onChange={handleColumnChange}>
            <option value="" disabled>Select a column</option>
            {allColumns.map(header => (
              <option key={header} value={header}>{header}</option>
            ))}
          </select>
        </div>
      </div>
      <ReactECharts option={option} style={{ height: '350px' }} />
    </div>
  );
}