/*jshint es5: true, node: true, esnext: true
 */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const ejs              = require("ejs"),
      fs               = require("fs"),
      path             = require("path"),
      ua_parser        = require("ua-parser"),
      errors           = require("./errors"),
      InvalidFontError = errors.InvalidFontError,
      InvalidConfigError = errors.InvalidConfigError,
      MissingConfigError = errors.MissingConfigError;

exports.InvalidFontError = InvalidFontError;
exports.InvalidConfigError = InvalidConfigError;
exports.MissingConfigError = MissingConfigError;

"use strict";

var localeToURLKeys,
    registeredFonts,
    urlModifier;

/**
 * Check to make sure the setup function has been called
 * @throws MissingConfigError
 */
function checkSetup() {
  if(!(registeredFonts)) {
    throw new MissingConfigError("setup must be called before get_font_css");
  }
}


/**
 * Check that a required option is defined in the list of options
 * @throws MissingConfigError
 */
function checkRequired(options, name) {
  if(!options) {
    throw new MissingConfigError("options not specified");
  }
  else if (name && !(name in options)) {
    throw new MissingConfigError("Missing required option: " + name);
  }
}

function supportsLocal(ua) {
  return ua === "all"
      || ua.family === "Firefox" && ((ua.major > 3)
                                  || (ua.major === 3 && ua.minor >= 5))
      || ua.family === "Chrome" && (ua.major >= 4)
      || ua.family === "Safari" && ((ua.major > 3)
                                  || (ua.major === 3 && ua.minor >= 2))
      || ua.family === "IE" && ((ua.major > 5)
                                  || (ua.major === 5 && ua.minor >= 5))
      || ua.family === "Opera" && (ua.major >= 10)
      || ua.family === "Mobile Safari";
}

function supportsWoff(ua) {
  return ua === "all"
      || ua.family === "Firefox" && ((ua.major > 3)
                                  || (ua.major === 3 && ua.minor >= 6))
      || ua.family === "Chrome" && (ua.major >= 5)
      || ua.family === "Safari" && ((ua.major > 5)
                                  || (ua.major === 5 && ua.minor >= 1))
      || ua.family === "IE" && (ua.major >= 9)
      || ua.family === "Opera" && ((ua.major > 11)
                                || (ua.major === 11 && ua.minor >= 10));
}

function supportsEmbeddedOpentype(ua) {
  return ua === "all"
      || ua.family === "IE" && (ua.major >= 7);
}

function supportsTruetype(ua) {
  return ua === "all"
      || ua.family === "Firefox" && ((ua.major > 3)
                                  || (ua.major === 3 && ua.minor >= 5))
      || ua.family === "Chrome" && (ua.major >= 4)
      || ua.family === "Safari" && ((ua.major > 3)
                                  || (ua.major === 3 && ua.minor >= 1))
      || ua.family === "IE" && (ua.major >= 9)
      || ua.family === "Opera" && (ua.major >= 10)
      || ua.family === "Mobile Safari";
}


function supportsSVG(ua) {
  return ua === "all"
      || ua.family === "Chrome" && (ua.major >= 4)
      || ua.family === "Safari" && ((ua.major > 3)
                                  || (ua.major === 3 && ua.minor >= 2))
      || ua.family === "Opera" && (ua.major >= 9)
      || ua.family === "Mobile Safari" && ((ua.major > 3)
                                  || (ua.major === 3 && ua.minor >= 2))
}

function getSupportedFormatsForUA(ua) {
  var parsedUA = ua === "all" ? ua : ua_parser.parse(ua);
  return {
    local: supportsLocal(parsedUA),
    truetype: supportsTruetype(parsedUA),
    woff: supportsWoff(parsedUA),
    svg: supportsSVG(parsedUA),
    "embedded-opentype": supportsEmbeddedOpentype(parsedUA)
  };
}

function getURLKeyForLocale(locale, urls) {
  // locales can be split on either - or _. Check for both.
  var baseLocale = locale.split("-")[0];
  if (baseLocale === locale) baseLocale = locale.split("_")[0];

  // first, look in the list of URLs to see if the locale is available.
  // second, look in the list of URLs to see if the baseLocale is available.
  // third, look in localeToURLKeys to see if the locale is specified.
  // forth, look in localeToURLKeys to see if the baseLocale is specified.
  // fifth, fall back to default.
  var urlKey = locale in urls ? locale :
               baseLocale in urls ? baseLocale :
               locale in localeToURLKeys ? localeToURLKeys[locale] :
               baseLocale in localeToURLKeys ? localeToURLKeys[baseLocale] :
               "default";
  return urlKey;
}

function getURLForLocale(locale, urls) {
  if(typeof urls === "string") return urls;

  checkRequired(urls, "default");

  return urls[getURLKeyForLocale(locale, urls)] || urls["default"];
}

function filterConfigForUAAndLocale(ua, locale, fontConfig) {
  var uaSpecificConfig = {};
  for (var key in fontConfig) {
    if (key === "formats") {
      uaSpecificConfig.formats = [];
      var uaSupportedFormats = getSupportedFormatsForUA(ua);
      fontConfig.formats.forEach(function(format) {
        if (uaSupportedFormats[format.type]) {
          var formatConfig = {
            type: format.type,
            url: getURLForLocale(locale, format.url)
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
    checkRequired(options, "ua");
    checkRequired(options, "locale");
    checkRequired(options, "fonts");

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
}

function getCSSForFontConfigs(supportedFonts) {
  var templatePath = path.join(__dirname, "..", "templates", "fonts_css.ejs");
  var templateStr = fs.readFileSync(templatePath, "utf8");
  var cssStr = ejs.render(templateStr, {
    fonts: supportedFonts,
    urlModifier: urlModifier
  });

  return cssStr;
}

/*
 * @method reset
 */
exports.reset = function() {
  localeToURLKeys = registeredFonts = urlModifier = null;
};

/*
 * @method setup
 * @param {object} options
 * @param {object} options.fonts - list of supported font configs.
 * @param {object} options.locale_to_url_keys - mapping of default urls for
 * a locale.
 * @param {function} (options.url_modifier) - A function that modifies font
 * URLs. This can be Useful for caching/cache busting.
 */
exports.setup = function(options) {
  checkRequired(options);
  checkRequired(options, "fonts");

  localeToURLKeys = options.locale_to_url_keys || {};
  registeredFonts = options.fonts;
  urlModifier = options.url_modifier || function(str) { return str; };
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

