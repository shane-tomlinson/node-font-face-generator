# node-font-face-generator
A node module to generate language/browser dependent @font-face CSS declarations.

## Usage
1. Set up the config files.

2. Include node-font-face-generator in a node module.
```
const css_generator = require("node-font-face-generator");
```

3. Load the config files.
```
const font_config = loadFontsConfig();
const language_to_locations = loadLanguageToLocations();
```

4. Call the `setup` function.
```
css_generator.setup({
  fonts: font_config,
  language_to_locations: language_to_locations
});
```

5. When CSS for a custom font-face is needed, call `get_font_face`
```
var css = css_generator.get_font_css({
  ua: getUserAgent(),
  lang: languageToUser(),
  fonts: ["OpenSansRegular"]
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


