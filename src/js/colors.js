const OPACITY = 0.4;
const RGBA = [
  `rgb(4, 199, 253, ${OPACITY})`,
  `rgb(166, 42, 164, ${OPACITY})`,
  `rgb(18, 174, 248, ${OPACITY})`,
  `rgb(132, 36, 134, ${OPACITY})`
];
const HEX = ['#04c7fd', '#a62aa4', '#12aef8', '#842486'];

export class Colors {

  static getAll({rgba}={rgba: false}) {
    if (rgba) {
      return RGBA;
    }

    return HEX;
  }

  static get DESKTOP() {
    return HEX[0];
  }

  static get MOBILE() {
    return HEX[1];
  }

  static get WEBPAGETEST() {
    return '#000000';
  }

}
