function sendWebVitals() {

  function sendWebVitalsGAEvents({name, delta, id, attribution, navigationType}) {

    let webVitalInfo = '(not set)';

    switch (name) {
      case 'CLS':
        webVitalInfo = attribution.largestShiftTarget;
        overrides = {
          debug_time: attribution.largestShiftTime,
          debug_load_state: attribution.loadState,
          debug_target: attribution.largestShiftTarget || '(not set)',
        };
        break;
      case 'FCP':
        webVitalInfo = attribution.firstByteToFCP;
        overrides = {
          debug_ttfb: attribution.timeToFirstByte,
          debug_fb2fcp: attribution.firstByteToFCP,
          debug_load_state: attribution.loadState,
          debug_target: attribution.loadState || '(not set)',
        };
        break;
      case 'FID':
      case 'INP':
        webVitalInfo = attribution.eventTarget;
        overrides = {
          debug_event: attribution.eventType,
          debug_time: attribution.eventTime,
          debug_load_state: attribution.loadState,
          debug_target: attribution.eventTarget || '(not set)',
        };
        break;
      case 'LCP':
        webVitalInfo = attribution.element;
        overrides = {
          debug_url: attribution.url,
          debug_ttfb: attribution.timeToFirstByte,
          debug_rld: attribution.resourceLoadDelay,
          debug_rlt: attribution.resourceLoadTime,
          debug_erd: attribution.elementRenderDelay,
          debug_target: attribution.element || '(not set)',
        };
        break;
      case 'TTFB':
        webVitalInfo = attribution.connectionTime;
        overrides = {
          debug_waiting_time: attribution.waitingTime,
          debug_dns_time: attribution.dnsTime,
          debug_connection_time: attribution.connectionTime,
          debug_request_time: attribution.requestTime,
        };
        break;
    }


    // Measure some other user preferences
    let dataSaver;
    let effectiveType;
    if ('connection' in navigator) {
      dataSaver = navigator.connection.saveData.toString();
      effectiveType = navigator.connection.effectiveType;
    }
    let deviceMemory;
    if ('deviceMemory' in navigator) {
      deviceMemory = navigator.deviceMemory.toString();
    }
    let prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches.toString();
    let prefersColorScheme;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      prefersColorScheme = 'dark';
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      prefersColorScheme = 'light';
    } else if (window.matchMedia('(prefers-color-scheme: no preference)').matches) {
      prefersColorScheme = 'no preference';
    } else {
      prefersColorScheme = 'not supported';
    }


    gtag('event', name, Object.assign(
      {
        event_category: 'Web Vitals',
        event_value: Math.round(name === 'CLS' ? delta * 1000 : delta),
        event_label: id,
        nonInteraction: true,

        // See: https://web.dev/debug-web-vitals-in-the-field/
        dimension1: webVitalInfo,
        dimension2: effectiveType,
        dimension3: dataSaver,
        dimension4: deviceMemory,
        dimension5: prefersReducedMotion,
        dimension6: prefersColorScheme,
        dimension7: navigationType,
      }, overrides));

  }

  // As the web-vitals script and this script is set with defer in order, so it should be loaded
  if (webVitals) {
    webVitals.onFCP(sendWebVitalsGAEvents);
    webVitals.onLCP(sendWebVitalsGAEvents);
    webVitals.onCLS(sendWebVitalsGAEvents);
    webVitals.onTTFB(sendWebVitalsGAEvents);
    webVitals.onFID(sendWebVitalsGAEvents);
    webVitals.onINP(sendWebVitalsGAEvents);
  } else {
    console.error('Web Vitals is not loaded!!');
  }

}

sendWebVitals();
