/* eslint no-extend-native: off
    -------------
! no-extend native is off so that the JS code can be as close to the java code as possible */

String.prototype.equalsIgnoreCase = function (compareString) {
  return this.toLowerCase() === compareString.toLowerCase()
}
