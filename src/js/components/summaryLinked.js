class SummaryLinked extends HTMLElement {
  constructor() {
    super();

    this.latest = {};
    this.placeholder = '000';

    this.attachShadow({ mode: 'open' });
    const template = document.getElementById('summary-linked').content.cloneNode(true);
    this.shadowRoot.appendChild(template);
  }

  connectedCallback() {
    this.renderComponent();
  }

  static get observedAttributes() {
    return ['key', 'title', 'loaded'];
  }

  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[ property ] = newValue;
    console.log('attributeChangedCallback of the summary', property, 'from', oldValue, 'to', newValue);
    this.renderComponent();
  }

  setTitle() {
    this.shadowRoot.querySelectorAll('.summary-linked-label a')
      .forEach( (node) => {
        node.textContent = this.title;
        node.setAttribute('href', this.link);
      } );
  }

  setData() {
    this.shadowRoot.querySelectorAll('.summary-linked-value')
      .forEach( (node) => {
        node.textContent = this.latest[this.key] || this.placeholder;
      } );

    this.shadowRoot.querySelectorAll('.summary-linked-description')
      .forEach( (node) => {
        node.textContent = this.latest.client ? `For ${this.latest.client}.` : this.placeholder;
      } );
  }

  renderComponent() {
    this.setTitle();
    this.setData();
  }
}

customElements.define('summary-linked', SummaryLinked);
