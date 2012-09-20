/*jshint es5: true, node: true, esnext: true
 */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const ejs     = require("ejs"),
      fs      = require("fs"),
      path    = require("path");

"use strict";

var languageToLocations,
    registeredFonts,
    urlModifier;

function supportsWoff(ua) {
  return ua.indexOf("Firefox") > -1 || ua.indexOf("Chrome") > -1 || ua.indexOf("Safari") > -1;
}

function supportsEmbeddedOpentype(ua) {
  return ua.indexOf("MSIE") > -1 || ua.indexOf("Opera") > -1;
}

function supportsTruetype(ua) {
  return ua.indexOf("iOS") > -1;
}

function getSupportedFormatsForUA(ua) {
  return {
    local: true,
    truetype: supportsTruetype(ua),
    woff: supportsWoff(ua),
    "embedded-opentype": supportsEmbeddedOpentype(ua)
  };
}

function getFontTypeForLanguage(lang) {
  var genericLang = lang.split("-")[0];
  // If language specific font set is not found, use the extended font set.
  return languageToLocations[lang] || languageToLocations[genericLang] || "extended";
}

function getLocationForLanguage(lang, locations) {
  if(typeof locations === "string") return locations;

  if(!locations.extended) throw new Error("location.extended must be specified");

  return locations[getFontTypeForLanguage(lang)] || locations.extended;
}

function filterConfigForUAAndLanguage(ua, lang, fontConfig) {
  var uaSpecificConfig = {};
  for (var key in fontConfig) {
    if (key === "formats") {
      uaSpecificConfig.formats = [];
      var uaSupportedFormats = getSupportedFormatsForUA(ua);

      fontConfig.formats.forEach(function(format) {
        if (uaSupportedFormats[format.type]) {
          var formatConfig = {
            type: format.type,
            location: getLocationForLanguage(lang, format.location)
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

function getFontConfigs(options) {
  var ua = options.ua,
      lang = options.lang,
      requestedFontNames = options.fonts,
      requestedFonts = [];

  requestedFontNames.forEach(function(requestedFontName) {
    var fontConfig = registeredFonts[requestedFontName];
    if (fontConfig) {
      requestedFonts.push(filterConfigForUAAndLanguage(ua, lang, fontConfig));
    }
    else throw new Error("invalid font: " + requestedFontName);
  });

  return requestedFonts;
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

function checkRequired(options, name) {
  if(!options) {
    throw new Error("options not specified");
  }
  else if (name && !(name in options)) {
    throw new Error("Missing required option: " + name);
  }
}

/*
 * @method setup
 * @param {object} options
 * @param {object} options.fonts - list of supported font configs.
 * @param {object} options.language_to_locations - mapping of default locations
 * for a language.
 * @param {function} (options.url_modifier) - A function that modifies font
 * URLs. This can be Useful for caching/cache busting.
 */
exports.setup = function(options) {
  checkRequired(options);
  checkRequired(options, "fonts");
  checkRequired(options, "language_to_locations");

  languageToLocations = options.language_to_locations;
  registeredFonts = options.fonts;
  urlModifier = options.url_modifier || function(str) { return str; };
};

/*
 * @method get_font_css
 * @param {object} options
 * @param {string} options.ua - user agent requesting fonts
 * @param {string} options.lang - language user agent is using
 * @param {Array of strings} options.fonts - list of fonts to get CSS for.
 */
exports.get_font_css = function(options) {
  if(!(languageToLocations && registeredFonts)) {
    throw new Error("setup must be called before get_font_css");
  }

  checkRequired(options);
  checkRequired(options, "ua");
  checkRequired(options, "lang");
  checkRequired(options, "fonts");

  var fontConfigs = getFontConfigs({
    ua: options.ua,
    lang: options.lang,
    fonts: options.fonts
  });

  return getCSSForFontConfigs(fontConfigs);
};

