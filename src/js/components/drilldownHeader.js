class drilldownHeader extends HTMLElement {
  constructor() {
    super();
    this.filters = {};
    this.categories = [];

    this.attachShadow({ mode: 'open' });
    const template = document.getElementById('drilldown-header').content.cloneNode(true);
    this.shadowRoot.appendChild(template);
  }

  connectedCallback() {
    this.renderComponent();
  }

  static get observedAttributes() {
    return ['loaded'];
  }

  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[ property ] = newValue;
    console.log('will re-render', oldValue, newValue, 'for prop', property);
    this.renderComponent();
  }

  setTitle() {
    const title = this.filters.appString;
    this.shadowRoot.querySelectorAll('h1 span.main-title')
      .forEach( node => node.textContent = title );
  }

  setTags() {
    const list = this.shadowRoot.querySelector('.category-list');

    list.innerHTML = '';
    this.categories.forEach((category)  => {
      const cellTemplate = document.getElementById('category-cell').content.cloneNode(true);
      cellTemplate.querySelector('li.cell').textContent = category;
      list.appendChild(cellTemplate);
    });
  }

  renderComponent() {
    this.setTitle();
    this.setTags();
  }
}

customElements.define('drilldown-header', drilldownHeader);
