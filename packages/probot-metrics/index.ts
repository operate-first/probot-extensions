import * as promClient from 'prom-client';
import { Router } from 'express';

const PREFIX = 'probot_';

if (process.env.NODE_ENV === 'production') {
  promClient.register.clear();
  promClient.collectDefaultMetrics({ prefix: PREFIX });
}

export const useCounter = (
  options: promClient.CounterConfiguration<string>
) => {
  const name = PREFIX + options.name;
  try {
    return new promClient.Counter({ ...options, name });
  } catch {
    return promClient.register.getSingleMetric(
      name
    ) as promClient.Counter<string>;
  }
};

export const useGauge = (options: promClient.GaugeConfiguration<string>) => {
  const name = PREFIX + options.name;
  try {
    return new promClient.Gauge({ ...options, name });
  } catch {
    return promClient.register.getSingleMetric(
      name
    ) as promClient.Gauge<string>;
  }
};
export const useHistogram = (
  options: promClient.HistogramConfiguration<string>
) => {
  const name = PREFIX + options.name;
  try {
    return new promClient.Histogram({ ...options, name });
  } catch {
    return promClient.register.getSingleMetric(
      name
    ) as promClient.Histogram<string>;
  }
};
export const useSummary = (
  options: promClient.SummaryConfiguration<string>
) => {
  const name = PREFIX + options.name;
  try {
    return new promClient.Summary({ ...options, name });
  } catch {
    return promClient.register.getSingleMetric(
      name
    ) as promClient.Summary<string>;
  }
};
export const exposeMetrics = (router: Router, route = '/metrics') => {
  router.get(route, async (_, response) => {
    response.setHeader('Content-type', promClient.register.contentType);
    response.end(await promClient.register.metrics());
  });
};
