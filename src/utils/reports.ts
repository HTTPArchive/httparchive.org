/**
 * Reports data utility — replaces server/reports.py logic for build-time use.
 * Reads config/reports.json and returns typed report/metric data.
 */
import reportsRaw from '../../config/reports.json' assert { type: 'json' };

export type Metric = {
  id: string;
  name: string;
  description?: string;
  histogram?: { enabled?: boolean };
  timeseries?: { enabled?: boolean; fields?: string[] };
  [key: string]: unknown;
};

export type Report = {
  id: string;
  name: string;
  url?: string;
  summary?: string;
  image?: string;
  graphic?: {
    bgcolor?: string;
    primary: { icon?: string; text?: string; color?: string; width?: string };
    secondary?: { icon?: string; text?: string; color?: string; width?: string };
  };
  metrics: string[];
  minDate?: string;
  maxDate?: string;
  maxDateMetric?: string;
  datePattern?: string;
  view?: string;
  timeseries?: { enabled?: boolean };
};

export type Lens = {
  id: string;
  name: string;
};

type ReportsJson = {
  _reports: string[];
  _featured: string[];
  _metrics: Record<string, Omit<Metric, 'id'>>;
  _lens: Record<string, Omit<Lens, 'id'>>;
  [reportId: string]: unknown;
};

const data = reportsRaw as ReportsJson;

export function getReportIds(): string[] {
  return data._reports || [];
}

export function getFeaturedReportIds(): string[] {
  return data._featured || [];
}

export function getReport(reportId: string): Report | null {
  const report = data[reportId] as Omit<Report, 'id'> | undefined;
  if (!report) return null;
  return { ...report, id: reportId } as Report;
}

export function getReports(): Report[] {
  return getReportIds()
    .map(id => getReport(id))
    .filter(Boolean) as Report[];
}

export function getFeaturedReports(): Report[] {
  return getFeaturedReportIds()
    .map(id => getReport(id))
    .filter(Boolean) as Report[];
}

export function getMetric(metricId: string): Metric | null {
  const metric = data._metrics?.[metricId];
  if (!metric) return null;
  return { ...metric, id: metricId };
}

export function getLenses(): Record<string, Lens> {
  const raw = data._lens || {};
  return Object.fromEntries(
    Object.entries(raw).map(([id, lens]) => [id, { ...lens, id }])
  );
}

export function getReportUrl(report: Report): string {
  if (report.url) return report.url;
  return `/reports/${report.id}`;
}
