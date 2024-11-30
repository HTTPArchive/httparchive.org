const OPACITY = 0.4;
const RGBA = [
  `rgba(4, 199, 253, ${OPACITY})`,
  `rgba(166, 42, 164, ${OPACITY})`,
  `rgba(18, 174, 248, ${OPACITY})`,
  `rgba(132, 36, 134, ${OPACITY})`,
  `rgba(4, 199, 253, 0.1)`,
  `rgba(166, 42, 164, 0.1)`,
  `rgba(18, 174, 248, 0.1)`,
  `rgba(132, 36, 134, 0.1)`
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

  static get DESKTOP_DIM() {
    return RGBA[4];
  }

  static get MOBILE_DIM() {
    return RGBA[5];
  }

  static get WEBPAGETEST() {
    return '#000000';
  }

}
