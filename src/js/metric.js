export class Metric {
	constructor(options, value=null) {
		this.options = options;
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

const noLeadingSpace = new Set(['%']);