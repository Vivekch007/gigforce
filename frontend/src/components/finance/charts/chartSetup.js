import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// chart.js renders to <canvas>, which cannot read CSS custom properties directly -
// these mirror the app's design tokens (frontend/src/css/index.css) and a
// CVD-validated status palette for chart marks specifically.
export const CHART_COLORS = {
  invoiced: '#2a78d6', // categorical slot 1 (close to --gf-primary #2563EB)
  paid: '#1baf7a', // categorical slot 3 (aqua)
  outstanding: '#eb6834', // categorical slot 2 (orange)
  statusPending: '#fab219',
  statusPaid: '#0ca30c',
  statusFailed: '#d03b3b',
  ink: '#111827', // --gf-text
  mutedInk: '#6B7280', // --gf-muted
  gridline: '#E5E7EB', // --gf-border
};

export const CHART_FONT = {
  family: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  size: 12,
};
