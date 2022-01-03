function sendWebVitals() {
  function sendWebVitalsGAEvents({name, delta, id}) {
    ga('send', 'event', {
      eventAction: name,
      eventCategory: 'Web Vitals',
      eventValue: Math.round(name === 'CLS' ? delta * 1000 : delta),
      eventLabel: id,
      nonInteraction: true,
    });
  }

  // As the web-vitals script and this script is set with defer in order, so it should be loaded
  if (webVitals) {
    webVitals.getFCP(sendWebVitalsGAEvents);
    webVitals.getLCP(sendWebVitalsGAEvents);
    webVitals.getCLS(sendWebVitalsGAEvents);
    webVitals.getTTFB(sendWebVitalsGAEvents);
    webVitals.getFID(sendWebVitalsGAEvents);
  } else {
    console.error('Web Vitals is not loaded!!');
  }

}

sendWebVitals();
