import {metricsStore} from '../store/MetricsStore';

test("MetricsStore", () => {
  // console.log(metricsStore.getMetrics());
  let browser = metricsStore.getMetrics()[0];
  browser.requestCount++;
  browser.responseCount++;
  expect(browser.requestCount).toBe(1);
  expect(browser.responseCount).toBe(1);

  metricsStore.clear();
  browser = metricsStore.getMetrics()[0];
  expect(browser.requestCount).toBe(0);
  expect(browser.responseCount).toBe(0);

});
