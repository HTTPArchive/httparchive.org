// class drilldownHeader extends HTMLElement {
//   constructor() {
//     super();
//     this.filters = {};
//     this.categories = [];

//     this.attachShadow({ mode: 'open' });
//     const template = document.getElementById('drilldown-header').content.cloneNode(true);
//     this.shadowRoot.appendChild(template);
//   }

//   connectedCallback() {
//     this.renderComponent();
//   }

//   static get observedAttributes() {
//     return ['loaded', 'title'];
//   }

//   attributeChangedCallback(property, oldValue, newValue) {
//     if (oldValue === newValue) return;
//     this[ property ] = newValue;
//     console.log('will re-render', oldValue, newValue, 'for prop', property);
//     this.renderComponent();
//   }

//   setTitle() {
//     const title = this.title;
//     console.log(title);
//     this.shadowRoot.querySelectorAll('h1 span.main-title')
//       .forEach( node => node.textContent = title );
//   }

//   setTags() {
//     if(this.categories.length > 0) {
//       const list = this.shadowRoot.querySelector('.category-list');
//       list.innerHTML = '';
//       this.categories.forEach((category)  => {
//         const cellTemplate = document.getElementById('category-cell').content.cloneNode(true);
//         cellTemplate.querySelector('li.cell').textContent = category;
//         list.appendChild(cellTemplate);
//       });
//     }
//   }

//   renderComponent() {
//     this.setTitle();
//     this.setTags();
//   }
// }

// customElements.define('drilldown-header', drilldownHeader);

function setTitle(title) {
  const mainTitle = document.querySelector('h1 span.main-title');
  mainTitle.textContent = title;
}

function setCategories(categories) {
  console.log('set categories', categories);
  if(categories.length > 0) {
    const list = document.querySelector('.intro .category-list');
    console.log('list', list);
    list.innerHTML = '';
    categories.forEach((category)  => {
      const cellTemplate = document.getElementById('category-cell').content.cloneNode(true);
      cellTemplate.querySelector('li.cell').textContent = category;
      list.appendChild(cellTemplate);
    });
  }
}

function update(data, filters) {
  const app = filters.app.join(',');
  setTitle(app);
  console.log('update w data', data);
  setCategories(data[0][0]?.category?.split(","));
}

export const DrilldownHeader = {
  update,
}
