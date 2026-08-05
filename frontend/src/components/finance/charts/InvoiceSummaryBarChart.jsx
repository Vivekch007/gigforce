import React from 'react';
import { Bar } from 'react-chartjs-2';
import './chartSetup';
import { CHART_COLORS, CHART_FONT } from './chartSetup';
import { formatINR } from '../../../utils/currency';

function InvoiceSummaryBarChart({ invoiced = 0, paid = 0, outstanding = 0 }) {
  const data = {
    labels: ['Total Invoiced', 'Total Paid', 'Outstanding'],
    datasets: [
      {
        data: [invoiced, paid, outstanding],
        backgroundColor: [CHART_COLORS.invoiced, CHART_COLORS.paid, CHART_COLORS.outstanding],
        borderRadius: 4,
        maxBarThickness: 72,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      // The x-axis category labels already identify each bar as visible text,
      // so a redundant color-swatch legend isn't needed for this single-series chart.
      legend: { display: false },
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
      <Bar data={data} options={options} />
    </div>
  );
}

export default InvoiceSummaryBarChart;
