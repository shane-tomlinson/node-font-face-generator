var fs                 = require("fs"),
    path               = require("path"),
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
  return loadJSON(path.join(__dirname, "sample-config", "fonts.json"));
}

function getLocaleToURLKeys() {
  return loadJSON(path.join(__dirname, "sample-config", "locale-to-url.json"));
}

function setupWithLocaleToURLKeys(done) {
  css_generator.setup({
    fonts: getFontConfig(),
    localeToUrlKeys: getLocaleToURLKeys(),
    urlModifier: function(url) { return "/inserted_sha" + url; }
  }, done);
}

function setupWithoutLocaleToURLKeys(done) {
  css_generator.setup({
    fonts: getFontConfig()
  }, done);
}

function testFontConfigContains(test, ua, locale, types, done) {
  function searchForType(formats, type) {
    for(var i=0, format; format=formats[i]; ++i) {
      if(format.type === type) return i;
    }
    return -1;
  }

  var fontConfigs = css_generator.get_font_configs({
    ua: ua,
    locale: locale,
    fonts: ["OpenSansRegular"]
  }, function(err, fontConfigs) {
    test.equal(err, null, "no error expected");

    var openSansFontConfig = fontConfigs[0];
    var formats = openSansFontConfig.formats;

    types.forEach(function(type) {
      test.ok(searchForType(formats, type) > -1, type + " found in formats for ua: " + ua);
    });

    done();
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
  setUp: setupWithLocaleToURLKeys,

  "en/Firefox >= 3.6, Safari >= 5.1, Chrome >= 5.0, Chrome Mobile >= 18.0, IE >= 9.0, Opera >= 11.10 maps to woff/latin": function(test) {
    var UAs = ["Firefox/3.6", "Version/5.1 Safari/", "Chrome/5.0", "Chrome/18.0 Mobile", "Opera/9.80 Version/11.10", "MSIE 9.0", "MSIE 10.0", "Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv 11.0) like Gecko"];
    var types = ["woff", "local"];

    testFontConfigs(test, UAs, types);
  },

  "en/MSIE 8.0, MSIE 9.0, map to embedded-opentype, local/latin": function(test) {
    var UAs = ["MSIE 8.0", "MSIE 9.0"];
    var types = ["embedded-opentype", "local"];

    testFontConfigs(test, UAs, types);
  },

  "en/iOS, Safari >= 3.1, Opera >= 10.0, Firefox >= 3.5, Chrome >= 4, Chrome Mobile >= 18, IE >= 9.0 maps to truetype/latin": function(test) {
    var UAs = ["iPhone OS 2_0 Version/2.0", "Version/3.1 Safari/", "Opera/9.80 Version/10.0", "Firefox/3.5", "Chrome/4.0", "Chrome/18.0 Mobile", "MSIE 9.0"];
    var types = ["truetype"];

    testFontConfigs(test, UAs, types);
  },

  "en/all maps to all fonts": function(test) {
    var UAs = ["all"];
    var types = ["local", "truetype", "opentype", "embedded-opentype", "woff"];

    testFontConfigs(test, UAs, types);
  }
});


function testCSSContains(test, ua, locale, types, done) {
  css_generator.get_font_css({
    ua: ua,
    locale: locale,
    fonts: ["OpenSansRegular"]
  }, function(err, css) {
    test.equal(err, null);

    types.forEach(function(type) {
      test.notEqual(css.indexOf(type), -1, type + " not found for " + ua);
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

exports.get_font_css_no_localeToUrlKeys = nodeunit.testCase({
  setUp: setupWithoutLocaleToURLKeys,

  "latin maps to latin": function(test) {
    testCSSContains(test, "Firefox/4.0", "latin", ["/fonts/OpenSans-Regular-latin.woff"]);
  },

  "en maps to latin": function(test) {
    testCSSContains(test, "Firefox/4.0", "en", ["/fonts/OpenSans-Regular-latin.woff"]);
  },

  "ru maps to cyrillic": function(test) {
    testCSSContains(test, "Firefox/4.0", "ru", ["/fonts/OpenSans-Regular-cyrillic.woff"]);
  },

  "el is aliased but maps to default because not available in available fonts": function(test) {
    testCSSContains(test, "Firefox/4.0", "el", ["/fonts/OpenSans-Regular-default.woff"]);
  },

  "jp not defined so maps to default": function(test) {
    testCSSContains(test, "Firefox/4.0", "jp", ["/fonts/OpenSans-Regular-default.woff"]);
  },

  "cz is defined in font specific localeToUrlKeys to chinese": function(test) {
    testCSSContains(test, "Firefox/4.0", "cz", ["/fonts/OpenSans-Regular-chinese.woff"]);
  }
});

exports.get_font_css = nodeunit.testCase({
  setUp: setupWithLocaleToURLKeys,

  "en maps to latin": function(test) {
    testCSSContains(test, "Firefox/4.0", "en", ["/inserted_sha/fonts/OpenSans-Regular-latin.woff"]);
  },

  "en-UK maps to latin because en maps to latin": function(test) {
    testCSSContains(test, "Firefox/4.0", "en-UK", ["/inserted_sha/fonts/OpenSans-Regular-latin.woff"]);
  },

  // The next two tests make sure baseLocales defined that are aliased in
  // locale-to-url are working correctly
  "en_US maps to latin because en maps to latin": function(test) {
    testCSSContains(test, "Firefox/4.0", "en_US", ["/inserted_sha/fonts/OpenSans-Regular-latin.woff"]);
  },

  // pt is not aliased, it should find itself.
  "pt maps to pt": function(test) {
    testCSSContains(test, "Firefox/4.0", "pt", ["/inserted_sha/fonts/OpenSans-Regular-pt.woff"]);
  },

  // The next two tests make sure baseLocales that are not aliased are working
  // correctly
  "pt-BR maps to pt": function(test) {
    testCSSContains(test, "Firefox/4.0", "pt-BR", ["/inserted_sha/fonts/OpenSans-Regular-pt.woff"]);
  },

  "pt_BR maps to pt": function(test) {
    testCSSContains(test, "Firefox/4.0", "pt_BR", ["/inserted_sha/fonts/OpenSans-Regular-pt.woff"]);
  },


  "it-ch maps to default": function(test) {
    testCSSContains(test, "Firefox/4.0", "it-ch", ["/inserted_sha/fonts/OpenSans-Regular-default.woff"]);
  },

  "ru maps to cyrillic": function(test) {
    testCSSContains(test, "Firefox/4.0", "ru", ["/inserted_sha/fonts/OpenSans-Regular-cyrillic.woff"]);
  },

  "cz defined in font specific localeToUrlKeys takes precedence over definition in generic localeToUrlKeys": function(test) {
    testCSSContains(test, "Firefox/4.0", "cz", ["/inserted_sha/fonts/OpenSans-Regular-chinese.woff"]);
  },

  "unknown languages default to the default font set": function(test) {
    testCSSContains(test, "Firefox/4.0", "af", ["/inserted_sha/fonts/OpenSans-Regular-default.woff"]);
  },

  "missing font location falls back to default": function(test) {
    // jp should use japanese which has no location defined
    testCSSContains(test, "Firefox/4.0", "jp", ["/inserted_sha/fonts/OpenSans-Regular-default.woff"]);
  },

  "Firefox >= 3.6, Chrome > 5.0, Chrome Mobile > 18.0, Safari > 5.1, Opera >= 11.10 all support local and .woff files": function(test) {
    var UAs = ["Firefox/4.0", "Version/5.1 Safari/", "Chrome/5.0", "Chrome/18.0 Mobile", "Opera/9.80 Version/11.10"];
    var types = ["local", "/inserted_sha/fonts/OpenSans-Regular-latin.woff"];

    testCSSs(test, UAs, types);
  },

  "IE supports local and eot files": function(test) {
    var UAs = ["MSIE 8.0", "MSIE 9.0"];
    var types = ["local", "/inserted_sha/fonts/OpenSans-Regular.eot"];
    testCSSs(test, UAs, types);
  },

  "iOS, Safari < 5.1, IE >= 9.0 supports local, otf and ttf files": function(test) {
    var UAs = ["iPhone OS 2_0 Version/2.0", "Version/5.0 Safari/", "MSIE 9.0"];
    var types = ["local",
                 "/inserted_sha/fonts/OpenSans-Regular-latin.ttf",
                 "/inserted_sha/fonts/OpenSans-Regular-latin.otf"
                 ];
    testCSSs(test, UAs, types);
  },

  "iOS >= 3.2, Safari >= 3.2, Chrome >= 4, Chrome Mobile >= 18, Opera >= 9 support svg": function(test) {
    var UAs = [
        "iPhone OS 2_0 Version/3.2",
        "Version/3.2 Safari/",
        "Chrome/4.0",
        "Chrome/18.0 Mobile",
        "Opera/9.0",
      ];
    var types = [ "/inserted_sha/fonts/OpenSans-Regular.svg#opensans-regular" ];
    testCSSs(test, UAs, types);
  },

  "all supports local, otf, ttf, eot, woff, and svg files": function(test) {
    var UAs = ["all"];
    var types = [ "local",
                  "/inserted_sha/fonts/OpenSans-Regular-latin.ttf",
                  "/inserted_sha/fonts/OpenSans-Regular-latin.otf",
                  "/inserted_sha/fonts/OpenSans-Regular.eot",
                  "/inserted_sha/fonts/OpenSans-Regular-latin.woff",
                  "/inserted_sha/fonts/OpenSans-Regular.svg#opensans-regular"
                ];
    testCSSs(test, UAs, types);
  }
});

function testMissingConfig(test, filter_item, funcName, done) {
  var config = {
    ua: "Firefox/4.0",
    locale: "en",
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
    testMissingConfig(test, "locale", funcName, function() {
      testMissingConfig(test, "fonts", funcName);
    });
  });
}

function testInvalidFont(test, funcName) {
  css_generator[funcName]({
    ua: "Firefox/4.0",
    locale: "en",
    fonts: ["UnknownFont"]
  }, function(err, css) {
    test.ok(err instanceof InvalidFontError, "Invalid Font Error");
    test.equal(err.message, "UnknownFont");
    test.done();
  });
}

exports.expected_errors = nodeunit.testCase({
  setUp: setupWithLocaleToURLKeys,

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

exports.specify_host_for_cdn = nodeunit.testCase({
  setUp: function(done) {
    css_generator.setup({
      fonts: getFontConfig(),
      host: 'https://cdn.fonthost.org'
    }, done);
  },

  "font URLs contain host": function(test) {
    testCSSContains(test, "Firefox/4.0", "en", ["https://cdn.fonthost.org/fonts/OpenSans-Regular-latin.woff"]);
  }

});
