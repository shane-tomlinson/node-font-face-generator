# node-font-face-generator
A node module to generate locale/browser dependent @font-face CSS declarations.

## Usage
1. Include node-font-face-generator in a node module.
```
const css_generator = require("node-font-face-generator");
```

2. Set up your configuration.
Call `.setup` with two paramters, `fonts` and `localeToUrlKeys`

`fonts` is an Object that holds a dictionary of fonts.
```
font_config = {
  "OpenSansRegular": {
    "fontFamily": "Open Sans",
    "fontStyle": "normal",
    "fontWeight": "400",
    "formats": [ {
        "type": "local",
        "url": "Open Sans"            // TrueType name (for most OSs)
      }, {
        "type": "local",
        "url": "Open Sans-Regular"    // PostScript name (for OSX)
      }, {
        "type": "embedded-opentype",
        "url": "/fonts/OpenSans-Regular.eot"
      }, {
        "type": "woff",
        "url": {
          "latin": "/fonts/OpenSans-Regular-latin.woff",
          "cyrillic": "/fonts/OpenSans-Regular-cyrillic.woff",
          "default": "/fonts/OpenSans-Regular-default.woff",
          "chinese": "/fonts/OpenSans-Regular-chinese.woff",
        }
      }, {
        "type": "truetype",
        "url": {
          "latin": "/fonts/OpenSans-Regular-latin.ttf",
          "default": "/fonts/OpenSans-Regular-default.ttf"
        }
      } ],
    // font specific locale to URL keys. Locales defined here override
    // the generic localeToUrlKeys passed in as configuration to
    // .setup.
    "localeToUrlKeys": {
      "cz": "chinese"
    }
  }
};
```

A font have multiple, locale specific URLs. For example, Latin based locales can be specified under the `latin` url, Russian under `cyrillic`, and Greek under `greek`. If multiple urls are defined, the fallback locale `default` *must* be defined.

`localeToUrlKeys` is an optional object that holds a dictionary of locales to urls. localeToUrlKeys kicks in if a locale cannot be directly found in the url list specified for a font. For example:

```
localeToUrlKeys = {
  "en":    "english",   // will match for en, en-US, en-UK, en-CA, ...
  "es":    "spanish",   // will match for es, es-MX, en-AR, en-*
  "fr"     "french",
  "ru":    "russian",
  "ro":    "romanian",
  "bg":    "bulgarian",
  "jp":    "japanese"
};
```

`localeToUrlKeys` may be defined generically for all fonts via the `setup` function, or as an alternative, for each individual font. The rules for how a locale matches to a URL are:

* first, look in the list of URLs specified for a font to see if the locale is available.
* next, look in the list of URLs specified for a font to see if the baseLocale is available.
* next, look in the font specific localeToUrlKeys to see if the locale is specified.
* next, look in the font specific localeToUrlKeys to see if the baseLocale is specified.
* next, look in the generic localeToUrlKeys to see if the locale is specified.
* next, look in the generic localeToUrlKeys to see if the baseLocale is specified.
* next, look in DefaultUrlKeys to see if the locale is specified.
* next, look in DefaultUrlKeys to see if the baseLocale is specified.
* finally, fall back to default.

`DefaultUrlKeys` are a base set of localeToUrlKeys that are compatible with Google Font Directory's `subset.pl` utility. The list is found in `lib/locale_to_url_keys.js`

3. Call the `setup` function with the configuration objects.
```
css_generator.setup({
  fonts: font_config,
  localeToUrlKeys: localeToUrlKeys
});
```

4. When CSS for a custom font-face is needed, call `get_font_css` with the
   configuration and a callback. The callback follows node convention and will
   be called with two parameters when complete. The first parameter is any
   error that is thrown (or null), the second is the CSS (or null).
```
var css = css_generator.get_font_css({
  ua: getUserAgent(),
  locale: getUsersLocale(),
  fonts: ["OpenSansRegular"]
}, function(err, css) {
  if (err) {
    // handle the error
    ...
  }
  else if (css) {
    // do something with the CSS
  }
  else {
    // this should never ever happen
  }
});
```

5. It is possible to generate one @font-face with declarations for all
   browsers using `ua: 'all'`. This is useful to create CSS for inclusion
   in a larger CSS file as part of a build script.
```
var css = css_generator.get_font_css({
  ua: 'all',
  locale: getUsersLocale(),
  fonts: ["OpenSansRegular"]
}, function(err, css) {
  if (err) {
    // handle the error
    ...
  }
  else if (css) {
    // This will be the css with fonts declared for all browsers.
  }
  else {
    // this should never ever happen
  }
});
```

6. Do what you will with the CSS. Write it out to a .CSS file in a build script or handle it in an HTTP request.

## Author:
* Shane Tomlinson
* shane@shanetomlinson.com
* stomlinson@mozilla.com
* set117@yahoo.com
* https://shanetomlinson.com
* http://github.com/stomlinson
* http://github.com/shane-tomlinson
* @shane_tomlinson

## Getting involved:
I am happy to review submissions!

## License:
This software is available under version 2.0 of the MPL:

  https://www.mozilla.org/MPL/


