/*jshint es5: true, node: true, esnext: true
 */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const ejs              = require('ejs'),
      fs               = require('fs'),
      path             = require('path'),
      ua_parser        = require('useragent'),
      errors           = require('./errors'),
      InvalidFontError = errors.InvalidFontError,
      InvalidConfigError = errors.InvalidConfigError,
      MissingConfigError = errors.MissingConfigError,
      DefaultUrlKeys   = require('./locale_to_url_keys');

exports.InvalidFontError = InvalidFontError;
exports.InvalidConfigError = InvalidConfigError;
exports.MissingConfigError = MissingConfigError;

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'fonts_css.ejs');
const TEMPLATE_STR = fs.readFileSync(TEMPLATE_PATH, 'utf8');

'use strict';

var localeToUrlKeys,
    registeredFonts,
    urlModifier,
    host;

/**
 * Check to make sure the setup function has been called
 * @throws MissingConfigError
 */
function checkSetup() {
  if (!(registeredFonts)) {
    throw new MissingConfigError('setup must be called before get_font_css');
  }
}


/**
 * Check that a required option is defined in the list of options
 * @throws MissingConfigError
 */
function checkRequired(options, name) {
  if (!options) {
    throw new MissingConfigError('options not specified');
  }
  else if (name && !(name in options)) {
    throw new MissingConfigError('Missing required option: ' + name);
  }
}

function supportsLocal(ua) {
  return ua === 'all'
      || ua.family === 'Firefox' && ((ua.major > 3)
                                  || (ua.major === 3 && ua.minor >= 5))
      || ua.family === 'Chrome' && (ua.major >= 4)
      || ua.family === 'Safari' && ((ua.major > 3)
                                  || (ua.major === 3 && ua.minor >= 2))
      || ua.family === 'IE' && ((ua.major > 5)
                                  || (ua.major === 5 && ua.minor >= 5))
      || ua.family === 'Opera' && (ua.major >= 10)
      || ua.family === 'Mobile Safari'
      || ua.family === 'Chrome Mobile';
}

function supportsWoff(ua) {
  return ua === 'all'
      || ua.family === 'Firefox' && ((ua.major > 3)
                                  || (ua.major === 3 && ua.minor >= 6))
      || ua.family === 'Chrome' && (ua.major >= 5)
      || ua.family === 'Safari' && ((ua.major > 5)
                                  || (ua.major === 5 && ua.minor >= 1))
      || ua.family === 'IE' && (ua.major >= 9)
      || ua.family === 'Opera' && ((ua.major > 11)
                                || (ua.major === 11 && ua.minor >= 10))
      || ua.family === 'Chrome Mobile';
}

function supportsEmbeddedOpentype(ua) {
  return ua === 'all'
      || ua.family === 'IE' && (ua.major >= 7);
}

function supportsTruetype(ua) {
  return ua === 'all'
      || ua.family === 'Firefox' && ((ua.major > 3)
                                  || (ua.major === 3 && ua.minor >= 5))
      || ua.family === 'Chrome' && (ua.major >= 4)
      || ua.family === 'Safari' && ((ua.major > 3)
                                  || (ua.major === 3 && ua.minor >= 1))
      || ua.family === 'IE' && (ua.major >= 9)
      || ua.family === 'Opera' && (ua.major >= 10)
      || ua.family === 'Mobile Safari'
      || ua.family === 'Chrome Mobile';
}


function supportsSVG(ua) {
  return ua === 'all'
      || ua.family === 'Chrome' && (ua.major >= 4)
      || ua.family === 'Safari' && ((ua.major > 3)
                                  || (ua.major === 3 && ua.minor >= 2))
      || ua.family === 'Opera' && (ua.major >= 9)
      || ua.family === 'Mobile Safari' && ((ua.major > 3)
                                  || (ua.major === 3 && ua.minor >= 2))
      || ua.family === 'Chrome Mobile';
}

function getSupportedFormatsForUA(ua) {
  var parsedUA = ua === 'all' ? ua : ua_parser.lookup(ua);
  parsedUA.major = parseInt(parsedUA.major, 10);
  parsedUA.minor = parseInt(parsedUA.minor, 10);

  return {
    local: supportsLocal(parsedUA),
    /* opentype is a superset of truetype
     * http://superuser.com/questions/96390/difference-between-otf-open-type-or-ttf-true-type-font-formats
     */
    truetype: supportsTruetype(parsedUA),
    opentype: supportsTruetype(parsedUA),
    /* embedded-opentype is the compact form of opentype
     * http://en.wikipedia.org/wiki/Embedded_OpenType
     */
    woff: supportsWoff(parsedUA),
    svg: supportsSVG(parsedUA),
    'embedded-opentype': supportsEmbeddedOpentype(parsedUA)
  };
}

function getURLKeyForLocale(fontConfig, locale, urls) {
  // locales can be split on either - or _. Check for both.
  var baseLocale = locale.split('-')[0];
  if (baseLocale === locale) baseLocale = locale.split('_')[0];

  var fontDefinedLocaleToUrlKeys = fontConfig.localeToUrlKeys || {};

  /**
   * Search order for locales:
   *
   * look in the list of URLs to see if the locale is available.
   * look in the list of URLs to see if the baseLocale is available.
   * look in the fontDefinedLocaleToUrlKeys to see if the locale is
   *    specified.
   * look in the fontDefinedLocaleToUrlKeys to see if the baseLocale is
   *    specified.
   * look in localeToUrlKeys to see if the locale is specified.
   * look in localeToUrlKeys to see if the baseLocale is specified.
   * look in DefaultUrlKeys to see if the locale is specified.
   * look in DefaultUrlKeys to see if the baseLocale is specified.
   * fall back to default.
   */
  var urlKey = locale in urls ? locale :
               baseLocale in urls ? baseLocale :
               locale in fontDefinedLocaleToUrlKeys ? fontDefinedLocaleToUrlKeys[locale] :
               baseLocale in fontDefinedLocaleToUrlKeys ? fontDefinedLocaleToUrlKeys[baseLocale] :
               locale in localeToUrlKeys ? localeToUrlKeys[locale] :
               baseLocale in localeToUrlKeys ? localeToUrlKeys[baseLocale] :
               locale in DefaultUrlKeys ? DefaultUrlKeys[locale] :
               baseLocale in DefaultUrlKeys ? DefaultUrlKeys[baseLocale] :
               'default';
  return urlKey;
}

function getURLForLocale(fontConfig, locale, urls) {
  if (typeof urls === 'string') return urls;

  checkRequired(urls, 'default');

  var url = urls[getURLKeyForLocale(fontConfig, locale, urls)] || urls['default'];

  if (host) {
    if (needsJoiningSlash(url)) url = host + "/" + url;
    else url = host + url;
  }

  return url;
}

function needsJoiningSlash(url) {
  return ! /^\//.test(url);
}

function filterConfigForUAAndLocale(ua, locale, fontConfig) {
  var uaSpecificConfig = {};
  for (var key in fontConfig) {
    if (key === 'formats') {
      uaSpecificConfig.formats = [];
      var uaSupportedFormats = getSupportedFormatsForUA(ua);
      fontConfig.formats.forEach(function(format) {
        if (uaSupportedFormats[format.type]) {
          var formatConfig = {
            type: format.type,
            url: getURLForLocale(fontConfig, locale, format.url),
            id: format.id
          };
          uaSpecificConfig.formats.push(formatConfig);
        }
      });
    }
    else {
      uaSpecificConfig[key] = fontConfig[key];
    }
  }

  return uaSpecificConfig;
}

/*
 * Get an array of font configurations that can be used to generate font
 * CSS.
 *
 * @method get_font_configs
 * @param {object} options
 * @param {string} options.ua - user agent requesting fonts
 * @param {string} options.locale - locale user agent is using
 * @param {Array of strings} options.fonts - list of fonts to get CSS for.
 * @param {function} done - called with two parameters when complete, err and
 *   fontConfigs.
 */
exports.get_font_configs = function(options, done) {
  try {
    checkSetup();

    checkRequired(options);
    checkRequired(options, 'ua');
    checkRequired(options, 'locale');
    checkRequired(options, 'fonts');

    var ua = options.ua,
        locale = options.locale,
        requestedFontNames = options.fonts,
        requestedFonts = [];

    requestedFontNames.forEach(function(requestedFontName) {
      var fontConfig = registeredFonts[requestedFontName];
      if (fontConfig) {
        requestedFonts.push(filterConfigForUAAndLocale(ua, locale, fontConfig));
      }
      else {
        throw new InvalidFontError(requestedFontName);
      }
    });

    done(null, requestedFonts);
  } catch(e) {
    done(e, null);
  }
};

function getCSSForFontConfigs(supportedFonts) {
  var cssStr = ejs.render(TEMPLATE_STR, {
    fonts: supportedFonts,
    urlModifier: urlModifier
  });

  return cssStr;
}

/*
 * @method reset
 */
exports.reset = function() {
  localeToUrlKeys = registeredFonts = urlModifier = null;
};

/*
 * @method setup
 * @param {object} options
 * @param {object} options.fonts - list of supported font configs.
 * @param {object} options.localeToUrlKeys - mapping of default urls for
 * a locale.
 * @param {function} (options.urlModifier) - A function that modifies font
 * URLs. This can be useful for caching/cache busting.
 * @param {string} (options.host) - host where fonts are located.
 * @param {function} [done] - called when complete.
 */
exports.setup = function(options, done) {
  checkRequired(options);
  checkRequired(options, 'fonts');

  localeToUrlKeys = options.localeToUrlKeys || {};
  registeredFonts = options.fonts;
  urlModifier = options.urlModifier || function(str) { return str; };
  host = options.host;
  done && done(null);
};

/*
 * @method get_font_css
 * @param {object} options
 * @param {string} options.ua - user agent requesting fonts
 * @param {string} options.locale - locale user agent is using
 * @param {Array of strings} options.fonts - list of fonts to get CSS for.
 * @param {function} done - called with two parameters when complete, err and
 *   css.
 */
exports.get_font_css = function(options, done) {
  exports.get_font_configs(options, function(err, fontConfigs) {
    if (err) {
      done(err, null);
      return;
    }

    var css = getCSSForFontConfigs(fontConfigs);
    done(null, css);
  });
};

