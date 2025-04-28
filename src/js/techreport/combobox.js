class ComboBox {
  constructor(element, data) {
    this.element = element;

    this.data = data;
    this.filteredData = data;
    this.focusedOption = -1;
    this.focusedOptionStr = '';
    this.selected = [];

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
        } else {
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
    option.setAttribute('aria-selected', 'true');
    const selection = document.createElement('li');
    const deleteSelection = document.createElement('button');
    deleteSelection.setAttribute('type', 'button');
    deleteSelection.textContent = `${option.dataset.name} [Delete]`;
    deleteSelection.dataset.name = option.dataset.name;
    deleteSelection.addEventListener('click', () => this.unselectElement(option.dataset.name));
    selection.dataset.name = option.dataset.name;
    selection.append(deleteSelection);
    const selectionContainer = this.element.querySelector('#combobox-tech-selected');
    selectionContainer.append(selection);
    if(!this.selected.includes(option.dataset.name)) {
      this.selected.push(option.dataset.name);
    }

    const submitOption = document.createElement('input');
    submitOption.setAttribute('value', option.dataset.name);
    submitOption.setAttribute('type', 'checkbox');
    submitOption.setAttribute('name', 'tech');
    submitOption.setAttribute('checked', true);
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
      this.selected = this.selected.slice(index, 1);
    }
    const submitOption = this.element.querySelector(`[data-component="submit-options"] option[value="${optionName}"]`);
    submitOption.remove();
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
