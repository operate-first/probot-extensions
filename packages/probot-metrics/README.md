# Probot metrics exporter

This extension enables you to expose Prometheus metrics from Probot with ease. It's a simple wrapper on top of `prom-client`.

This extension features:

- `useCounter(options)`: registers a Counter metric, consumes options for [Counter](https://github.com/siimon/prom-client#counter).
- `useGauge(options)`: registers a Gauge metric, consumes options for [Gauge](https://github.com/siimon/prom-client#gauge).
- `useHistogram(options)`: registers a Histogram metric, consumes options for [Histogram](https://github.com/siimon/prom-client#histogram).
- `useSummary(options)`: registers a Summary metric, consumes options for [Summary](https://github.com/siimon/prom-client#summary).
- `exposeMetrics(route)` to expose HTTP route from Probot on `<route>` (defaults to `/metrics`). Use as a [Probot HTTP route](https://probot.github.io/docs/http/):

  ```js
  export default (app, { getRouter }) => {
    const router = getRouter();
    exposeMetrics(router, '/metrics');
  }
  ```
