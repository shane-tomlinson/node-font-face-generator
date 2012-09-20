# node-font-face-generator
A node module to generate language/browser dependent @font-face CSS declarations.

## Usage
1. Include node-font-face-generator in a node module.
```
const css_generator = require("node-font-face-generator");
```

2. Set up your configuration.
Two configuration items are needed for the css_generator, `fonts` and
`language_to_locations`.

`fonts` is an Object that holds a dictionary of fonts.

```
font_config = {
  "OpenSansRegular": {
    "fontFamily": "Open Sans",
    "fontStyle": "normal",
    "fontWeight": "400",
    "formats": [ {
        "type": "local",
        "location": "Open Sans"
      }, {
        "type": "local",
        "location": "OpenSans"
      }, {
        "type": "embedded-opentype",
        "location": "/fonts/OpenSans-Regular.eot"
      }, {
        "type": "woff",
        "location": {
          "latin": "/fonts/OpenSans-Regular-latin.woff",
          "cyrillic": "/fonts/OpenSans-Regular-cyrillic.woff",
          "extended": "/fonts/OpenSans-Regular-extended.woff"
        }
      }, {
        "type": "truetype",
        "location": {
          "latin": "/fonts/OpenSans-Regular-latin.ttf",
          "extended": "/fonts/OpenSans-Regular-extended.ttf"
        }
      } ]
  }
};
```

Multiple locations can be defined for a single font. This is useful to define
specific font files for different language "roots". For example, latin based
languages can be specified under the "latin" location, russian under
"cyrillic", and greek under "greek". If multiple locations are defined, `extended` *must* be defined. `extended` is the default if a language is not found in the `language_to_locations` table.

`language_to_locations` is an object that holds a dictionary of languages to
default locations. For example:

```
language_to_locations = {
  "en":    "latin",   // will match for en, en-US, en-UK, en-CA, ...
  "es":    "latin",   // will match for es, es-MX, en-AR, en-*
  "fr"     "latin",
  "ru":    "cyrillic",
  "ro":    "cyrillic",
  "bg":    "cyrillic",
  "jp":    "japanese"
};
```

If an exact match is not found for a country specific language, the language's root will be used. If a language's location is not found for a multi-location font, `extended` will be used.

3. Call the `setup` function with the configuration objects.
```
css_generator.setup({
  fonts: font_config,
  language_to_locations: language_to_locations
});
```

4. When CSS for a custom font-face is needed, call `get_font_face`
```
var css = css_generator.get_font_css({
  ua: getUserAgent(),
  lang: languageToUser(),
  fonts: ["OpenSansRegular"]
});
```

5. Do what you will with the CSS. Write it out to a .CSS file in a build script or handle it in an HTTP request.

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


