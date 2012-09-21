/*jshint es5: true, node: true, esnext: true
 */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


var util = require('util');

function createCustomErrorType(custom_type, name) {
  var CustomError = function(msg) {
    Error.captureStackTrace(this, this.constructor);
    this.message = msg || 'Error';
  };
  util.inherits(CustomError, Error);
  CustomError.prototype.name = name;
  exports[custom_type] = CustomError;
}

createCustomErrorType("InvalidFontError", "Invalid Font Error");
createCustomErrorType("InvalidConfigError", "Invalid Config Error");
createCustomErrorType("MissingConfigError", "Missing Config Error");
