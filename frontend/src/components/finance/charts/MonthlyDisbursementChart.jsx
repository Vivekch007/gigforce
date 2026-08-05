import React from 'react';
import { Bar } from 'react-chartjs-2';
import './chartSetup';
import { CHART_COLORS, CHART_FONT } from './chartSetup';
import { formatINR } from '../../../utils/currency';

// data: [{ month: 'Jan 2026', amount: 12345 }, ...] in chronological order
function MonthlyDisbursementChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-muted small text-center py-4 mb-0">No processed payments yet.</p>;
  }

  const chartData = {
    labels: data.map((d) => d.month),
    datasets: [
      {
        label: 'Disbursed',
        data: data.map((d) => d.amount),
        backgroundColor: CHART_COLORS.invoiced,
        borderRadius: 4,
        maxBarThickness: 40,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }, // single series - the card heading already names it
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${formatINR(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: CHART_COLORS.ink, font: CHART_FONT },
      },
      y: {
        beginAtZero: true,
        grid: { color: CHART_COLORS.gridline },
        ticks: {
          color: CHART_COLORS.mutedInk,
          font: CHART_FONT,
          callback: (value) => formatINR(value),
        },
      },
    },
  };

  return (
    <div style={{ height: 260 }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}

export default MonthlyDisbursementChart;
