import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import './chartSetup';
import { CHART_COLORS, CHART_FONT } from './chartSetup';

function PaymentStatusDonutChart({ pending = 0, paid = 0, failed = 0 }) {
  const total = pending + paid + failed;

  const data = {
    labels: ['Pending', 'Paid', 'Failed'],
    datasets: [
      {
        data: [pending, paid, failed],
        backgroundColor: [CHART_COLORS.statusPending, CHART_COLORS.statusPaid, CHART_COLORS.statusFailed],
        borderColor: '#FFFFFF',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: CHART_COLORS.ink, font: CHART_FONT, usePointStyle: true },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed;
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            return ` ${ctx.label}: ${value} (${pct}%)`;
          },
        },
      },
    },
  };

  if (total === 0) {
    return <p className="text-muted small text-center py-4 mb-0">No payments recorded yet.</p>;
  }

  return (
    <div style={{ height: 220 }}>
      <Doughnut data={data} options={options} />
    </div>
  );
}

export default PaymentStatusDonutChart;
