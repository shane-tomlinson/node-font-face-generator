# node-font-face-generator
A node module to generate localeuage/browser dependent @font-face CSS declarations.

## Usage
1. Include node-font-face-generator in a node module.
```
const css_generator = require("node-font-face-generator");
```

2. Set up your configuration.
Two configuration items are needed for the css_generator, `fonts` and
`locale_to_url_keys`. `fonts` is an Object that holds a dictionary of fonts.
```
font_config = {
  "OpenSansRegular": {
    "fontFamily": "Open Sans",
    "fontStyle": "normal",
    "fontWeight": "400",
    "formats": [ {
        "type": "local",
        "url": "Open Sans"
      }, {
        "type": "local",
        "url": "OpenSans"
      }, {
        "type": "embedded-opentype",
        "url": "/fonts/OpenSans-Regular.eot"
      }, {
        "type": "woff",
        "url": {
          "latin": "/fonts/OpenSans-Regular-latin.woff",
          "cyrillic": "/fonts/OpenSans-Regular-cyrillic.woff",
          "extended": "/fonts/OpenSans-Regular-extended.woff"
        }
      }, {
        "type": "truetype",
        "url": {
          "latin": "/fonts/OpenSans-Regular-latin.ttf",
          "extended": "/fonts/OpenSans-Regular-extended.ttf"
        }
      } ]
  }
};
```
Multiple urls can be defined for a single font. This is useful to define
specific font files for different localeuage "roots". For example, latin based
localeuages can be specified under the "latin" url, russian under
"cyrillic", and greek under "greek". If multiple urls are defined, `extended` *must* be defined. `extended` is the default if a localeuage is not found in the `locale_to_url_keys` table.
`locale_to_url_keys` is an object that holds a dictionary of locales to urls. For example:
```
locale_to_url_keys = {
  "en":    "latin",   // will match for en, en-US, en-UK, en-CA, ...
  "es":    "latin",   // will match for es, es-MX, en-AR, en-*
  "fr"     "latin",
  "ru":    "cyrillic",
  "ro":    "cyrillic",
  "bg":    "cyrillic",
  "jp":    "japanese"
};
```
If an exact match is not found for a country specific localeuage, the localeuage's root will be used. If a localeuage's url is not found for a multi-url font, `extended` will be used.

3. Call the `setup` function with the configuration objects.
```
css_generator.setup({
  fonts: font_config,
  locale_to_url_keys: locale_to_url_keys
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


