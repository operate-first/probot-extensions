# Probot metrics endpoint

This extension enables you to expose Prometheus metrics from Probot with ease. It's a simple wrapper on top of `prom-client`.

## Installation

```bash
npm install --save @operate-first/probot-metrics
```

## Overview

- `useCounter(options)`: registers a Counter metric, consumes options for [Counter](https://github.com/siimon/prom-client#counter).
- `useGauge(options)`: registers a Gauge metric, consumes options for [Gauge](https://github.com/siimon/prom-client#gauge).
- `useHistogram(options)`: registers a Histogram metric, consumes options for [Histogram](https://github.com/siimon/prom-client#histogram).
- `useSummary(options)`: registers a Summary metric, consumes options for [Summary](https://github.com/siimon/prom-client#summary).
- `exposeMetrics(route)` to expose HTTP route from Probot on `<route>` (defaults to `/metrics`). Use as a [Probot HTTP route](https://probot.github.io/docs/http/):

## Usage

If you want to leverage this extension, it is required that your Probot instance has [a server exposed](https://probot.github.io/docs/http/) (This extension currently supports Prometheus PULL mode only, serverless deployments don't work like that.)

```js
const metrics = require('@operate-first/probot-metrics');

module.exports = (app, { getRouter }) => {
    const router = getRouter();
    metrics.exposeMetrics(router, '/metrics');
}
```

By default this extension tracks default Node.js metrics and exposes them (with `probot_` prefix). In addition to that you can define your own custom metrics.

### Define custom metrics

You can use `useCounter`, `useGauge`, `useHistogram` and `useSummary` to define custom metrics.

```js
const metrics = require('@operate-first/probot-metrics');

module.exports = app => {
    // Exposing the route is required in all cases
    //...

    const numberOfActionsTotal = metrics.useCounter({
        name: 'num_of_actions_total',
        help: 'Total number of actions received',
        labelNames: ['install', 'action'],
    });

    app.onAny((context) => {
        numberOfActionsTotal
        .labels({
            install: context.payload.installation.id,
            action: context.payload.action,
        })
        .inc();
    });
}
```
