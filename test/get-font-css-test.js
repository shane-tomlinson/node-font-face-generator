var fs            = require("fs"),
    css_generator = require("../lib/generate_css"),
    nodeunit      = require("nodeunit");

function loadJSON(path) {
  var jsonStr = fs.readFileSync(path, "utf8");
  // strip out any comments
  jsonStr = jsonStr.replace(/\/\/.*/g, "");
  return JSON.parse(jsonStr);
}

function getFontConfig() {
  return loadJSON(__dirname + "/sample-config/fonts.json");
}

function getLanguageToLocationsConfig() {
  return loadJSON(__dirname + "/sample-config/language-to-location.json");
}

function testCSSContains(test, ua, lang, types) {
  var css = css_generator.get_font_css({
    ua: ua,
    lang: lang,
    fonts: ["OpenSansRegular"]
  });

  types.forEach(function(type) {
    test.notEqual(css.indexOf(type), -1, type + " found");
  });
}

exports.test_css_generated = nodeunit.testCase({
  setUp: function (cb) {
    css_generator.setup({
      fonts: getFontConfig(),
      language_to_locations: getLanguageToLocationsConfig(),
      url_modifier: function(url) { return "/inserted_sha" + url; }
    });
    cb();
  },
  tearDown: function (cb) {
    cb();
  },

  "en maps to latin": function(test) {
    testCSSContains(test, "Firefox", "en", ["/inserted_sha/fonts/OpenSans-Regular-latin.woff"]);
    test.done();
  },

  "it-ch maps to extended": function(test) {
    testCSSContains(test, "Firefox", "it-ch", ["/inserted_sha/fonts/OpenSans-Regular-extended.woff"]);
    test.done();
  },

  "ru maps to cyrillic": function(test) {
    testCSSContains(test, "Firefox", "ru", ["/inserted_sha/fonts/OpenSans-Regular-cyrillic.woff"]);
    test.done();
  },

  "unknown languages default to the extended font set": function(test) {
    testCSSContains(test, "Firefox", "cz", ["/inserted_sha/fonts/OpenSans-Regular-extended.woff"]);
    test.done();
  },

  "missing font location falls back to extended": function(test) {
    // jp should use japanese which has no location defined
    testCSSContains(test, "Firefox", "jp", ["/inserted_sha/fonts/OpenSans-Regular-extended.woff"]);
    test.done();
  },

  "Firefox, Chrome and Safari all support local and .woff files": function(test) {
    testCSSContains(test, "Firefox", "en", ["local", "/inserted_sha/fonts/OpenSans-Regular-latin.woff"]);
    testCSSContains(test, "Chrome", "en", ["local", "/inserted_sha/fonts/OpenSans-Regular-latin.woff"]);
    testCSSContains(test, "Safari", "en", ["local", "/inserted_sha/fonts/OpenSans-Regular-latin.woff"]);
    test.done();
  },

  "IE and Opera support local and .eot files": function(test) {
    testCSSContains(test, "MSIE 8.0", "en", ["local", "/inserted_sha/fonts/OpenSans-Regular.eot"]);
    testCSSContains(test, "MSIE 9.0", "en", ["local", "/inserted_sha/fonts/OpenSans-Regular.eot"]);
    testCSSContains(test, "Opera", "en", ["local", "/inserted_sha/fonts/OpenSans-Regular.eot"]);
    test.done();
  },


  "iOS supports local and ttf files": function(test) {
    testCSSContains(test, "iOS", "en", ["local", "/inserted_sha/fonts/OpenSans-Regular-latin.ttf"]);
    test.done();
  }

});
