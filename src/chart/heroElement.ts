import once from 'lodash/once';

// Note: window.HERO_ELEMENT_NAME and window.HERO_ELEMENT_NAMES is defined per
// route and is set in the HTML document's head: via a template helper:
const HERO_ELEMENT_NAME = 'tree map';
const measureName = 'hero-element-time';
const endMarkerName = 'hero-element-shown';
const performanceMetricsGAEventName = 'Performance Metrics';
const pageLoadPerformanceMarkerName = 'atlas-page-load';

const actuallySendHeroElementTiming = once((heroElementName: string) => {
  if ('performance' in window && performance.mark !== undefined && performance.measure !== undefined) {
    performance.mark(endMarkerName);
    (window as any).requestIdleCallback(() => {
      // Measure and send message only when browser is idle:
      try {
        performance.measure(
          measureName, pageLoadPerformanceMarkerName, endMarkerName,
        );
        const measures = performance.getEntriesByName(measureName);
        if (measures.length > 0) {
          const measure = measures[0];
          // Note: can only send integer values:
          const time = Math.round(measure.duration);
          const event = {
            hitType: 'event',
            eventCategory: performanceMetricsGAEventName,
            eventLabel: heroElementName,
            eventAction: 'Hero Element',
            nonInteraction: true,
            eventValue: time,
          };

          const ga = (window as any).ga;
          ga('send', event);
          ga('send', {
            hitType: 'timing',
            timingCategory: 'load',
            timingVar: 'Hero Element',
            timingValue: time,
            timingLabel: heroElementName,
          });
        }
      } catch (e) {
        console.error(e);
      }
    });
  }
});

export const sendHeroElementTiming = (heroElementName: string) => {
  if (heroElementName === HERO_ELEMENT_NAME) {
    actuallySendHeroElementTiming(heroElementName);
  }
};
