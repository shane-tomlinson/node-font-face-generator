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

function setup(cb) {
  css_generator.setup({
    fonts: getFontConfig(),
    language_to_locations: getLanguageToLocationsConfig(),
    url_modifier: function(url) { return "/inserted_sha" + url; }
  });
  cb();
}

function testFontConfigContains(test, ua, lang, types, done) {
  function searchForType(formats, type) {
    for(var i=0, format; format=formats[i]; ++i) {
      if(format.type === type) return i;
    }
    return -1;
  }

  var fontConfigs = css_generator.get_font_configs({
    ua: ua,
    lang: lang,
    fonts: ["OpenSansRegular"]
  }, function(err, fontConfigs) {
    test.equal(err, null, "no error expected");

    var openSansFontConfig = fontConfigs[0];
    var formats = openSansFontConfig.formats;

    types.forEach(function(type) {
      test.ok(searchForType(formats, type) > -1, type + " found in formats");
    });

    test.done();
  });
}

function testFontConfigs(test, UAs, types) {
  var browser = UAs.shift();
  if (browser) {
    testFontConfigContains(test, browser, "en", types,
      testFontConfigs.bind(null, test, UAs, types));
  }
  else {
    test.done();
  }
}

exports.get_font_configs = nodeunit.testCase({
  setUp: setup,

  "en/Firefox, Safari, Chrome maps to woff/latin": function(test) {
    var UAs = ["Firefox", "Safari", "Chrome"];
    var types = ["woff", "local"];

    testFontConfigs(test, UAs, types);
  },

  "en/MSIE 8.0, MSIE 9.0, Opera map to embedded-opentype/latin": function(test) {
    var UAs = ["MSIE 8.0", "MSIE 9.0", "Opera"];
    var types = ["embedded-opentype", "local"];

    testFontConfigs(test, UAs, types);
  },

  "en/iOS maps to truetype/latin": function(test) {
    var UAs = ["iOS"];
    var types = ["truetype", "local"];

    testFontConfigs(test, UAs, types);
  }
});

function testCSSContains(test, ua, lang, types, done) {
  css_generator.get_font_css({
    ua: ua,
    lang: lang,
    fonts: ["OpenSansRegular"]
  }, function(err, css) {
    types.forEach(function(type) {
      test.notEqual(css.indexOf(type), -1, type + " found");
    });

    if (done) done();
    else test.done();
  });
}

function testCSSs(test, UAs, types, index) {
  index = index || 0;

  var ua = UAs[index];
  if (ua) {
    testCSSContains(test, ua, "en", types,
      testCSSs.bind(null, test, UAs, types, index + 1));
  }
  else {
    test.done();
  }
}

exports.get_font_css = nodeunit.testCase({
  setUp: setup,

  "en maps to latin": function(test) {
    testCSSContains(test, "Firefox", "en", ["/inserted_sha/fonts/OpenSans-Regular-latin.woff"]);
  },

  "it-ch maps to extended": function(test) {
    testCSSContains(test, "Firefox", "it-ch", ["/inserted_sha/fonts/OpenSans-Regular-extended.woff"]);
  },

  "ru maps to cyrillic": function(test) {
    testCSSContains(test, "Firefox", "ru", ["/inserted_sha/fonts/OpenSans-Regular-cyrillic.woff"]);
  },

  "unknown languages default to the extended font set": function(test) {
    testCSSContains(test, "Firefox", "cz", ["/inserted_sha/fonts/OpenSans-Regular-extended.woff"]);
  },

  "missing font location falls back to extended": function(test) {
    // jp should use japanese which has no location defined
    testCSSContains(test, "Firefox", "jp", ["/inserted_sha/fonts/OpenSans-Regular-extended.woff"]);
  },

  "Firefox, Chrome and Safari all support local and .woff files": function(test) {
    var UAs = ["Firefox", "Safari", "Chrome"];
    var types = ["local", "/inserted_sha/fonts/OpenSans-Regular-latin.woff"];

    testCSSs(test, UAs, types);
  },

  "IE and Opera support local and .eot files": function(test) {
    var UAs = ["MSIE 8.0", "MSIE 9.0", "Opera"];
    var types = ["local", "/inserted_sha/fonts/OpenSans-Regular.eot"];
    testCSSs(test, UAs, types);
  },

  "iOS supports local and ttf files": function(test) {
    var UAs = ["iOS"];
    var types = ["local", "/inserted_sha/fonts/OpenSans-Regular-latin.ttf"];
    testCSSs(test, UAs, types);
  }
});

function testMissingConfig(test, filter_item, funcName, done) {
  var config = {
    ua: "Firefox",
    lang: "en",
    fonts: ["OpenSansRegular"]
  };

  if (filter_item) delete config[filter_item];

  css_generator[funcName](config, function(err, css) {
    test.ok(err instanceof MissingConfigError, "Correct error type");

    if (done) done();
    else test.done();
  });
}

function testMissingConfigs(test, funcName) {
  testMissingConfig(test, "ua", funcName, function() {
    testMissingConfig(test, "lang", funcName, function() {
      testMissingConfig(test, "fonts", funcName);
    });
  });
}

function testInvalidFont(test, funcName) {
  css_generator[funcName]({
    ua: "Firefox",
    lang: "en",
    fonts: ["UnknownFont"]
  }, function(err, css) {
    test.ok(err instanceof InvalidFontError, "Invalid Font Error");
    test.equal(err.message, "UnknownFont");
    test.done();
  });
}

exports.expected_errors = nodeunit.testCase({
  setUp: setup,

  "setup not called before get_font_css": function(test) {
    css_generator.reset();
    testMissingConfig(test, null, "get_font_css");
  },

  "setup not called before get_font_configs": function(test) {
    css_generator.reset();
    testMissingConfig(test, null, "get_font_configs");
  },

  "missing configuration options throw MissingConfigError for get_font_css": function(test) {
    testMissingConfigs(test, "get_font_css");
  },

  "missing configuration options throw MissingConfigError for get_font_configs": function(test) {
    testMissingConfigs(test, "get_font_configs");
  },

  "InvalidFontError for get_font_css": function(test) {
    testInvalidFont(test, "get_font_css");
  },

  "InvalidFontError for get_font_configs": function(test) {
    testInvalidFont(test, "get_font_configs");
  }
});
