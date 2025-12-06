class ComboBox {
  constructor(element, data, selected) {
    this.element = element;

    this.data = data;
    this.filteredData = data;
    this.focusedOption = -1;
    this.focusedOptionStr = '';
    this.selected = selected || [];
    this.maxSelected = 10;

    this.updateContent();
    this.monitorInput();

    this.selected.forEach(name => this.showSelectedElement(name));
    this.element.querySelector('input[type="text"][disabled]').removeAttribute('disabled');
  }

  updateContent(data) {
    const rows = data || this.data;
    // Add options in the dropdown list
    const listbox = this.element.querySelector('[role="listbox"]');
    rows.forEach((row, index) => {
      const icon = row.icon;
      const option = document.createElement('div');
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.dataset.name = row.technology;
      option.dataset.key = index;
      option.textContent = row.technology;
      option.id = `${this.element.dataset.id}-${row.technology.replaceAll(' ','-')}`;
      const logo = document.createElement('img');
      logo.setAttribute('alt', '');
      logo.setAttribute('src', `https://reports-dev-2vzgiib6.uc.gateway.dev/v1/static/icons/${icon}`);
      logo.setAttribute('loading', 'lazy');
      option.append(logo);
      if(this.selected.includes(row.technology)) {
        option.setAttribute('aria-selected', true);
      }
      listbox.append(option);
    });
  }

  monitorInput() {
    const input = this.element.querySelector('input[type="text"]');
    const listbox = this.element.querySelector('[role="listbox"]');
    listbox.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if(e.target.getAttribute('role') === 'option') {
        const selected = e.target.getAttribute('aria-selected');
        if(selected === 'true') {
          this.unselectElement(e.target.dataset.name);
        } else if(!e.target.getAttribute('disabled') || e.target.getAttribute('disabled') === 'false') {
          this.selectElement(e.target);
        }
      }
    });
    input.addEventListener('click', this.showOptions.bind(this));
    input.addEventListener('input', this.filterOptions.bind(this));
    input.addEventListener('blur', this.inputBlur.bind(this));
    input.addEventListener('keydown', this.navigateOptions.bind(this));
  }

  inputBlur() {
    this.hideOptions();
  }

  showOptions() {
    const input = this.element.querySelector('[role="combobox"]');
    input.setAttribute('aria-expanded', 'true');
    const listbox = this.element.querySelector('[role="listbox"]');
    listbox.classList.remove('hidden');
  }

  hideOptions() {
    const input = this.element.querySelector('[role="combobox"]');
    input.setAttribute('aria-expanded', 'false');
    const options = this.element.querySelector('[role="listbox"]');
    options.classList.add('hidden');
  }

  filterOptions(e) {
    const search = e.target.value;
    const options = this.element.querySelector('[role="listbox"]');

    this.filteredData = this.data.filter(row => {
      return row.technology.toLowerCase().includes(search.toLowerCase());
    });

    options.textContent = '';
    this.updateContent(this.filteredData);

    if(options.classList.contains('hidden')) {
      this.showOptions();
    }

    if(this.filteredData.includes(this.focusedOptionStr)) {
      this.focusedOption = this.filteredData.indexOf(this.focusedOptionStr);
      this.updateHighlightedOption();
    } else {
      this.focusedOption = -1;
    }
  }

  navigateOptions(e) {
    const listbox = this.element.querySelector('[role="listbox"]');
    const options = this.element.querySelectorAll('[role="option"]');
    const key = e.key;

    if(listbox.classList.contains('hidden') && key !== 'ArrowLeft' && key !== 'ArrowRight') {
      this.showOptions();
    }

    switch(key) {
      case 'ArrowDown':
        this.highlightNext(options.length);
        break;
      case 'ArrowUp':
        this.highlightPrevious(-1);
        break;
      case 'Escape':
        this.hideOptions();
        break;
      case 'Enter':
        e.preventDefault();
        this.selectOption(options[this.focusedOption]);
    }
  }

  highlightNext(max) {
    const nextKey = this.focusedOption + 1;
    if(nextKey < max) {
      this.focusedOption = nextKey;
      this.updateHighlightedOption();
    }
  }

  highlightPrevious(min) {
    const previousKey = this.focusedOption - 1;
    if(previousKey > min) {
      this.focusedOption = previousKey;
      this.updateHighlightedOption();
    }
  }

  selectOption(option) {
    const listbox = this.element.querySelector('[role="listbox"]');
    if(!listbox.classList.contains('hidden')) {
      const selected = option.getAttribute('aria-selected');
      if(selected === 'true') {
        this.unselectElement(option.dataset.name);
      } else {
        this.selectElement(option);
      }
    }
  }

  updateHighlightedOption() {
    const options = this.element.querySelector('[role="listbox"]');
    const currentlySelected = options.querySelectorAll('.highlighted[role="option"]');
    currentlySelected.forEach(selected => selected.classList.remove('highlighted'));
    const option = options.querySelector(`[data-key="${this.focusedOption}"]`);
    option.classList.add('highlighted');
    this.scrollToElement(option);
    this.focusedOptionStr = this.filteredData[this.focusedOption];
    const input = this.element.querySelector('input[type="text"]');
    input.setAttribute('aria-activedescendant',`${option.id}`);
  }

  selectElement(option) {
    /* Set the state of the element to selected */
    option.setAttribute('aria-selected', 'true');


    /* Keep track of the selected apps */
    if(!this.selected.includes(option.dataset.name)) {
      this.selected.push(option.dataset.name);
    }

    /* Don't allow more than 10 selected */
    if(this.selected.length >= this.maxSelected) {
      const unselected = this.element.querySelectorAll('[role="listbox"] [role="option"][aria-selected="false"]');
      unselected.forEach(element => element.setAttribute('disabled', true));
    }

    this.showSelectedElement(option.dataset.name);
  }

  showSelectedElement(name) {
    const icon = this.data.find(((tech) => tech.technology == name))?.icon;
    /* Add selected element to an overview list */
    const selection = document.createElement('li');
    selection.dataset.name = name;

    const deleteSelection = document.createElement('button');
    deleteSelection.setAttribute('type', 'button');
    deleteSelection.textContent = `${name}`;
    deleteSelection.dataset.name = name;
    deleteSelection.addEventListener('click', () => this.unselectElement(name));

    /* Add the app logo */
    const appIcon = document.createElement('img');
    appIcon.setAttribute('src', `https://reports-dev-2vzgiib6.uc.gateway.dev/v1/static/icons/${encodeURI(icon)}`);
    appIcon.setAttribute('alt', '');
    appIcon.classList.add('logo');
    deleteSelection.append(appIcon);

    /* Add the delete icon */
    const deleteIcon = document.createElement('img');
    deleteIcon.setAttribute('src', '/static/img/close-filters.svg');
    deleteIcon.setAttribute('alt', 'delete');
    deleteIcon.classList.add('delete');
    deleteSelection.append(deleteIcon);

    /* Add the delete app button to the list */
    selection.append(deleteSelection);
    const selectionContainer = this.element.querySelector('#combobox-tech-selected');
    selectionContainer.append(selection);

    /* Add an invisible input field so the selected techs get submitted */
    const submitOption = document.createElement('input');
    submitOption.setAttribute('value', name);
    submitOption.setAttribute('type', 'checkbox');
    submitOption.setAttribute('name', 'tech');
    submitOption.setAttribute('checked', true);
    submitOption.setAttribute('tabindex', '-1');
    submitOption.textContent = name;
    const submitOptions = this.element.querySelector('[data-component="submit-options"]');
    submitOptions.append(submitOption);
  }

  unselectElement(optionName) {
    const option = document.querySelector(`[role="option"][data-name="${optionName}"]`);
    if(option) {
      option.setAttribute('aria-selected', 'false');
    }
    const selection = this.element.querySelector(`#combobox-tech-selected li[data-name="${optionName}"]`);
    selection.remove();
    if(this.selected.includes(optionName)) {
      const index = this.selected.indexOf(optionName);
      this.selected.splice(index, 1);
    }
    const submitOption = this.element.querySelector(`[data-component="submit-options"] input[value="${optionName}"]`);
    submitOption.remove();

    if(this.selected.length < this.maxSelected) {
      const disabled = this.element.querySelectorAll('[role="listbox"] [role="option"][disabled="true"]');
      disabled.forEach(element => element.setAttribute('disabled', false));
    }
  }

  scrollToElement(element) {
    const container = this.element.querySelector('[role="listbox"]');
    const isAbove = element.offsetTop < container.scrollTop;
    const isBelow = element.offsetTop > container.offsetHeight;
    if(isAbove || isBelow) {
      container.scrollTop = element.offsetTop;
    }
  }
}

export default ComboBox;
