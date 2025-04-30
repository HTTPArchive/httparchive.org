class ComboBox {
  constructor(element, data) {
    this.element = element;

    this.data = data;
    this.filteredData = data;
    this.focusedOption = -1;
    this.focusedOptionStr = '';
    this.selected = [];
    this.maxSelected = 10;

    this.keyCodes = {
      keyUp: 38,
      keyDown: 40,
      ESC: 27,
      enter: 13,
    };

    this.updateContent();
    this.monitorInput();
  }

  updateContent(data) {
    const rows = data || this.data;
    // Add options in the dropdown list
    const listbox = this.element.querySelector('[role="listbox"]');
    rows.forEach((row, index) => {
      const option = document.createElement('div');
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.dataset.name = row;
      option.dataset.key = index;
      option.textContent = row;
      const logo = document.createElement('img');
      logo.setAttribute('alt', '');
      logo.setAttribute('src', `https://cdn.httparchive.org/static/icons/${row}.png`);
      logo.setAttribute('height', '14px');
      logo.setAttribute('width', 'auto');
      option.append(logo);
      if(this.selected.includes(row)) {
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
        } else if(!e.target.getAttribute('disabled') || e.target.getAttribute('disabled') === 'false') {
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
    const input = this.element.querySelector('input[type="text"]');
    input.setAttribute('aria-expanded', 'true');
    const listbox = this.element.querySelector('[role="listbox"]');
    listbox.classList.remove('hidden');
  }

  hideOptions() {
    const input = this.element.querySelector('input[type="text"]');
    input.setAttribute('aria-expanded', 'false');
    const options = this.element.querySelector('[role="listbox"]');
    options.classList.add('hidden');
  }

  filterOptions(e) {
    const search = e.target.value;
    const options = this.element.querySelector('[role="listbox"]');

    this.filteredData = this.data.filter(row => {
      return row.toLowerCase().includes(search.toLowerCase());
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

    if(listbox.classList.contains('hidden')) {
      this.showOptions();
    }

    const key = e.keyCode;
    switch(key) {
      case this.keyCodes.keyDown:
        const nextKey = this.focusedOption + 1;
        if(nextKey < options.length) {
          this.focusedOption = nextKey;
          this.updateHighlightedOption();
        }
        break;
      case this.keyCodes.keyUp:
        const previousKey = this.focusedOption - 1;
        if(previousKey > -1) {
          this.focusedOption = previousKey;
          this.updateHighlightedOption();
        }
        break;
      case this.keyCodes.ESC:
        this.hideOptions();
        break;
      case this.keyCodes.enter:
        e.preventDefault();
        const listbox = this.element.querySelector('[role="listbox"]');
        if(!listbox.classList.contains('hidden')) {
          const option = options[this.focusedOption];
          const selected = option.getAttribute('aria-selected');
          if(selected === 'true') {
            this.unselectElement(option.dataset.name);
          } else {
            this.selectElement(option);
          }
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
  }

  selectElement(option) {
    /* Set the state of the element to selected */
    option.setAttribute('aria-selected', 'true');

    /* Add selected element to an overview list */
    const selection = document.createElement('li');
    selection.dataset.name = option.dataset.name;

    const deleteSelection = document.createElement('button');
    deleteSelection.setAttribute('type', 'button');
    deleteSelection.textContent = `${option.dataset.name}`;
    deleteSelection.dataset.name = option.dataset.name;
    deleteSelection.addEventListener('click', () => this.unselectElement(option.dataset.name));

    /* Add the app logo */
    const appIcon = document.createElement('img');
    appIcon.setAttribute('src', `https://cdn.httparchive.org/static/icons/${option.dataset.name}.png`);
    appIcon.setAttribute('alt', '');
    appIcon.classList.add('logo');
    deleteSelection.prepend(appIcon);

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

    /* Keep track of the selected apps */
    if(!this.selected.includes(option.dataset.name)) {
      this.selected.push(option.dataset.name);
    }

    /* Don't allow more than 10 selected*/
    if(this.selected.length >= this.maxSelected) {
      const unselected = this.element.querySelectorAll('[role="listbox"] [role="option"][aria-selected="false"]');
      unselected.forEach(element => element.setAttribute('disabled', true));
    }

    /* Add an invisible input field so the selected techs get submitted */
    const submitOption = document.createElement('input');
    submitOption.setAttribute('value', option.dataset.name);
    submitOption.setAttribute('type', 'checkbox');
    submitOption.setAttribute('name', 'tech');
    submitOption.setAttribute('checked', true);
    submitOption.setAttribute('tabindex', '-1');
    submitOption.textContent = option.dataset.name;
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
