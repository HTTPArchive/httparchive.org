export class Metric {
  constructor(options, value=null) {
    this.options = options;

    if (wholeNumber.has(options.type)) {
      value = Math.round(value);
    }
    this.value = value;
  }

  toString() {
    let type = this.options.type;
    if (this.options.singular && this.value === 1) {
      type = this.options.singular;
    }
    return `${this.value}${noLeadingSpace.has(type) ? '' : ' '}${type}`;
  }
}

// Whitelist of units that directly follow the value (eg "10%").
// Otherwise, the unit is preceded by a space (eg "10 KB").
const noLeadingSpace = new Set(['%']);

// Whitelist of units for which values should appear as whole numbers (eg "2 requests").
// Otherwise, the values would appear as floats (eg "2.0 requests").
const wholeNumber = new Set(['Connections', 'Requests']);
