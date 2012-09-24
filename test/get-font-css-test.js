var fs                 = require("fs"),
    nodeunit           = require("nodeunit"),
    css_generator      = require("../lib/generate_css"),
    InvalidFontError   = css_generator.InvalidFontError,
    InvalidConfigError = css_generator.InvalidConfigError,
    MissingConfigError = css_generator.MissingConfigError;

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

function testCSSContains(test, ua, lang, types, done) {
  css_generator.get_font_css({
    ua: ua,
    lang: lang,
    fonts: ["OpenSansRegular"]
  }, function(err, css) {
    types.forEach(function(type) {
      test.notEqual(css.indexOf(type), -1, type + " found");
    });

    done();
  });
}

function setup(cb) {
  css_generator.setup({
    fonts: getFontConfig(),
    language_to_locations: getLanguageToLocationsConfig(),
    url_modifier: function(url) { return "/inserted_sha" + url; }
  });
  cb();
}

exports.test_css_generated = nodeunit.testCase({
  setUp: setup,

  "en maps to latin": function(test) {
    testCSSContains(test, "Firefox", "en", ["/inserted_sha/fonts/OpenSans-Regular-latin.woff"], test.done);
  },

  "it-ch maps to extended": function(test) {
    testCSSContains(test, "Firefox", "it-ch", ["/inserted_sha/fonts/OpenSans-Regular-extended.woff"], test.done);
  },

  "ru maps to cyrillic": function(test) {
    testCSSContains(test, "Firefox", "ru", ["/inserted_sha/fonts/OpenSans-Regular-cyrillic.woff"], test.done);
  },

  "unknown languages default to the extended font set": function(test) {
    testCSSContains(test, "Firefox", "cz", ["/inserted_sha/fonts/OpenSans-Regular-extended.woff"], test.done);
  },

  "missing font location falls back to extended": function(test) {
    // jp should use japanese which has no location defined
    testCSSContains(test, "Firefox", "jp", ["/inserted_sha/fonts/OpenSans-Regular-extended.woff"], test.done);
  },

  "Firefox, Chrome and Safari all support local and .woff files": function(test) {
    testCSSContains(test, "Firefox", "en", ["local", "/inserted_sha/fonts/OpenSans-Regular-latin.woff"],
      function() {
        testCSSContains(test, "Chrome", "en", ["local", "/inserted_sha/fonts/OpenSans-Regular-latin.woff"],
          function() {
            testCSSContains(test, "Safari", "en", ["local", "/inserted_sha/fonts/OpenSans-Regular-latin.woff"],
              test.done);
          });
    });
  },

  "IE and Opera support local and .eot files": function(test) {
    testCSSContains(test, "MSIE 8.0", "en", ["local", "/inserted_sha/fonts/OpenSans-Regular.eot"], function() {
      testCSSContains(test, "MSIE 9.0", "en", ["local", "/inserted_sha/fonts/OpenSans-Regular.eot"], function() {
        testCSSContains(test, "Opera", "en", ["local", "/inserted_sha/fonts/OpenSans-Regular.eot"], test.done);
      });
    });
  },

  "iOS supports local and ttf files": function(test) {
    testCSSContains(test, "iOS", "en", ["local", "/inserted_sha/fonts/OpenSans-Regular-latin.ttf"], test.done);
  }
});

function testMissingConfig(test, filter_item, done) {
  var config = {
    ua: "Firefox",
    lang: "en",
    fonts: ["OpenSansRegular"]
  };
  delete config[filter_item];

  css_generator.get_font_css(config, function(err, css) {
    test.ok(err instanceof MissingConfigError, "Correct error type");
    done();
  });
}

exports.expected_errors = nodeunit.testCase({
  setUp: setup,

  "missing configuration options throw MissingConfigError": function(test) {
    testMissingConfig(test, "ua", function() {
      testMissingConfig(test, "lang", function() {
        testMissingConfig(test, "fonts", test.done);
      });
    });
  },

  "invalid font returns with InvalidFontError": function(test) {
    css_generator.get_font_css({
      ua: "Firefox",
      lang: "en",
      fonts: ["UnknownFont"]
    }, function(err, css) {
      test.ok(err instanceof InvalidFontError, "Invalid Font Error");
      test.equal(err.message, "UnknownFont");
      test.done();
    });
  }

});
