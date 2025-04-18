// Required for loading Zone.js
import 'zone.js/dist/zone';

// Global Boomerang instance
declare global {
  interface Window {
    BOOMR: any;
    Prototype: any;
  }
}

// When using the IE11 browser and Prototypejs, OpenTelemetry cannot be loaded.
// This is caused by the OpenTelemetry framework due to a polyfill of core-js which is used in OpenTelemetry
// and the fact, that Prototypejs adds a `entries` attribute to the array class.
//
// As a workaround, we remove the entries attribute of the Array object, load OpenTelemetry and add the entries
// attribute in order to not break the target application.
//
// See https://github.com/NovatecConsulting/boomerang-opentelemetry-plugin/issues/27#issue-1067341825
const isIE = !!(<any>window.document).documentMode;
const usesPrototype = !!window.Prototype;

let currentEntriesFn;
if (isIE && usesPrototype) {
  currentEntriesFn = Array.prototype.entries;
  delete Array.prototype.entries;
}

if (currentEntriesFn) {
  Array.prototype.entries = currentEntriesFn;
}

// Get current plugin version specified in package.json
const { version } = require('../package.json');

import OpenTelemetryTracingImpl from './impl';

/**
 * Skeleton template for all boomerang plugins.
 *
 * Use this code as a starting point for your own plugins.
 */
(function (): void {
  // First, make sure BOOMR is actually defined.  It's possible that your plugin
  // is loaded before boomerang, in which case you'll need this.
  window.BOOMR = window.BOOMR || {};
  window.BOOMR.plugins = window.BOOMR.plugins || {};

  // A private object to encapsulate all your implementation details
  // This is optional, but the way we recommend you do it.
  const impl = new OpenTelemetryTracingImpl();

  //
  // Public exports
  //
  window.BOOMR.plugins.OpenTelemetry = {
    init: (config: any) => {
      // list of user configurable properties
      const properties = Object.keys(impl.getProps());

      // This block is only needed if you actually have user configurable properties
      window.BOOMR.utils.pluginConfig(
        impl.getProps(),
        config,
        'OpenTelemetry',
        properties
      );

      // resolve beacon url
      const beaconUrl = config['beacon_url'];
      if (beaconUrl !== undefined && typeof beaconUrl === 'string') {
        impl.setBeaconUrl(beaconUrl);
      }

      // Other initialization code here
      try {
        impl.register();
      } catch (error) {
        console.error('Error while registering OpenTelemetry plugin.', error);
      }

      // Subscribe to any BOOMR events here.
      // Unless your code will explicitly be called by the developer
      // or by another plugin, you must to do this.

      return this;
    },

    // Return the current OpenTelemetry-Plugin version from package.json
    // Has to be updated for every release!
    version: version,

    // Executes the specified function within the context of the given span
    withSpan: impl.withSpan,

    // Getting an OpenTelemetry tracer instance for manual tracing
    getTracer: impl.getTracer,

    // Returns the internally used OpenTelemetry API
    getOpenTelemetryApi: impl.getOpenTelemetryApi,

    // Adds a custom variable to the current span as well as all following spans
    // that are created by opentelemetry.js
    // Adds optionally a custom variable to the current beacon
    addVarToSpans: (key: string, value: string, addToBeacon: boolean = false): void => {
      impl.addVarToSpans(key, value);

      if(addToBeacon) window.BOOMR.addVar(key, value);
    },

    // Starts a new transaction, if document_load.recordTransaction is enabled
    startNewTransaction: impl.startNewTransaction,

    is_complete: () => {
      // This method should determine if the plugin has completed doing what it
      // needs to do and return true if so or false otherwise
      return impl.isInitialized();
    },
  };
})();
