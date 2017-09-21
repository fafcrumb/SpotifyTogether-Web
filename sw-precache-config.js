/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

/* eslint-env node */

module.exports = {
  navigateFallback: 'index.html',
  staticFileGlobs: [
    '/index.html',
    '/manifest.json',
    '/bower_components/webcomponentsjs/webcomponents-loader.js',
  ],
  dynamicUrlToDependencies: {
    '/': ['index.html']
  },
  runtimeCaching: [
    {
      urlPattern: /\/bower_components\/webcomponentsjs\/.*.js/,
      handler: 'fastest',
      options: {
        cache: {
          name: 'webcomponentsjs-polyfills-cache'
        }
      }
    },
    {
      urlPattern: /^https:\/\/www\.gstatic\.com\/firebasejs\/4\.3\.1/,
      handler: 'cacheFirst',
      options: {
        cache: {
          name: 'firebase-scripts-cache-v4.3.1'
        }
      }
    },
    {
      urlPattern: /^https:\/\/api\.spotify\.com\/v1\/search/,
      handler: 'fastest',
      options: {
        cache: {
          name: 'spotify-search-cache-v1',
          maxEntries: 200
        }
      }
    }
  ]
};
