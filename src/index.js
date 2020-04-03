'use strict';

const INPUT_CLASS = 'air-ticket-form__field-input';
const SUGGEST_LIST_CLASS = 'air-ticket-form__field-suggest';
const CLEAR_CLASS = 'air-ticket-form__field-clear-button';

const SUGGEST_ITEM_CLASS = 'air-ticket-form__field-suggest-item';
const ACTIVE_SUGGEST_ITEM_CLASS = 'air-ticket-form__field-suggest-item_active';

const SUGGEST_ITEM_CITY_CLASS = 'air-ticket-form__field-suggest-item-city';
const SUGGEST_ITEM_COUNTRY_CLASS = 'air-ticket-form__field-suggest-item-country';
const SUGGEST_ITEM_CODE_CLASS = 'air-ticket-form__field-suggest-item-code';
const SUGGEST_ITEM_COPY_CLASS = 'air-ticket-form__field-suggest-item-copy';

const FETCH_INTERVAL = 200;

function debounce(callback, interval) {
  let timer = null;

  return (...args) => {
    clearTimeout(timer);

    return new Promise(executor => {
      timer = setTimeout(() => executor(callback(...args)), interval);
    });
  };
}
function createSpan(text, className) {
  const $span = document.createElement('span');
  $span.appendChild(document.createTextNode(text));
  if (className !== undefined) {
    $span.className = className;
  }

  return $span;
}
function findParent($element, classNames) {
  if ($element === null) {
    return null;
  } else {
    for (const className of classNames) {
      if ($element.className === className) {
        return $element;
      }
    }

    return findParent($element.parentElement, classNames);
  }
}
function hide() {
  this.style.display = 'none';
}
function show() {
  this.style.display = 'block';
}
function clear() {
  this.innerHTML = '';
}

function setupSuggest($field) {
  const $input = $field.querySelector('.' + INPUT_CLASS);
  const $suggestList = $field.querySelector('.' + SUGGEST_LIST_CLASS);
  const $clear = $field.querySelector('.' + CLEAR_CLASS);

  let active = false;
  let currentSuggestItemIndex = -1;
  let currentSuggestItemValue = '';

  const updateFormSuggestItem = function(change) {
    const formSuggestItems = $suggestList.childNodes;
    if (currentSuggestItemIndex >= 0 && currentSuggestItemIndex < formSuggestItems.length) {
      const currentFormSuggestItem = formSuggestItems.item(currentSuggestItemIndex);
      currentFormSuggestItem.className = SUGGEST_ITEM_CLASS;
    }

    change();

    if (currentSuggestItemIndex >= 0 && currentSuggestItemIndex < formSuggestItems.length) {
      const currentFormSuggestItem = formSuggestItems.item(currentSuggestItemIndex);
      currentFormSuggestItem.className = ACTIVE_SUGGEST_ITEM_CLASS;
    }
  };
  const changeFormSuggestItem = function(change) {
    updateFormSuggestItem(function() {
      if (currentSuggestItemIndex === -1) {
        currentSuggestItemValue = $input.value;
      }

      change();

      const $suggestItems = $suggestList.childNodes;
      if (currentSuggestItemIndex >= 0 && currentSuggestItemIndex < $suggestItems.length) {
        const $suggestItem = $suggestItems.item(currentSuggestItemIndex);
        const $suggestItemCity = $suggestItem.querySelector('.' + SUGGEST_ITEM_CITY_CLASS);
        $input.value = $suggestItemCity.textContent;
      } else {
        $input.value = currentSuggestItemValue;
      }
    });
  };

  const setFormSuggestItem = function(index = currentSuggestItemIndex) {
    updateFormSuggestItem(function() {
      currentSuggestItemIndex = index;
    });
  };
  const selectFormSuggestItem = function(index = currentSuggestItemIndex) {
    changeFormSuggestItem(function() {
      currentSuggestItemIndex = index;
    });
  };

  const selectNextFormSuggestItem = function() {
    const index = currentSuggestItemIndex + 1;
    selectFormSuggestItem(index === $suggestList.childNodes.length ? -1 : index);
  };
  const selectPreviousFormSuggestItem = function() {
    const length = $suggestList.childNodes.length;
    const index = currentSuggestItemIndex === -1 ? length : currentSuggestItemIndex;
    selectFormSuggestItem(index - 1);
  };

  const parseSuggestItem = function(json) {
    return {
      city: json.name,
      country: json.country_name,
      code: json.code
    };
  };
  const fetcher = function(term) {
    if (term.length === 0) {
      $suggestList.load([]);
    } else {
      const apiUrl = `https://autocomplete.travelpayouts.com/places2?term=${term}&types[]=city&types[]=airport&max=10&locale=uk`;

      fetch(apiUrl)
        .then(response => response.json())
        .catch(error => console.error(`Error while getting API response: ${apiUrl}, ${error}`))
        .then(json => $suggestList.load(json.map(parseSuggestItem)))
        .catch(error => console.error(`Error while parsing data from API: ${apiUrl}, ${error}`));
    }
  };
  const debouncedFetcher = debounce(fetcher, FETCH_INTERVAL, false);

  $clear.hide = hide.bind($clear);
  $clear.show = show.bind($clear);
  $suggestList.hide = hide.bind($suggestList);
  $suggestList.show = show.bind($suggestList);
  $suggestList.clear = clear.bind($suggestList);
  $suggestList.load = function(suggestItems) {
    this.clear();
    currentSuggestItemIndex = -1;

    for (const suggestItem of suggestItems) {
      const $suggestItem = document.createElement('li');

      $suggestItem.appendChild(createSpan(suggestItem.city, SUGGEST_ITEM_CITY_CLASS));
      $suggestItem.appendChild(createSpan(suggestItem.country, SUGGEST_ITEM_COUNTRY_CLASS));
      $suggestItem.appendChild(createSpan(suggestItem.code, SUGGEST_ITEM_CODE_CLASS));
      $suggestItem.appendChild(createSpan('✈', SUGGEST_ITEM_COPY_CLASS));
      $suggestItem.className = SUGGEST_ITEM_CLASS;
      this.appendChild($suggestItem);
    }
  };
  $suggestList.addEventListener('mouseover', e => {
    const $suggestItem = findParent(e.target, [SUGGEST_ITEM_CLASS, ACTIVE_SUGGEST_ITEM_CLASS]);

    if ($suggestItem) {
      setFormSuggestItem(Array.from($suggestList.children).indexOf($suggestItem));
    }
  });
  $suggestList.addEventListener('click', e => {
    const $suggestItem = findParent(e.target, [SUGGEST_ITEM_CLASS, ACTIVE_SUGGEST_ITEM_CLASS]);

    if ($suggestItem) {
      selectFormSuggestItem(Array.from($suggestList.children).indexOf($suggestItem));

      if (e.target.className !== SUGGEST_ITEM_COPY_CLASS) {
        currentSuggestItemValue = $input.value;
        $suggestList.clear();
      } else {
        debouncedFetcher($input.value);
      }
      $input.focus();
    }
  });

  document.addEventListener('DOMContentLoaded', function() {
    $input.addEventListener('input', () => {
      debouncedFetcher($input.value);
      if ($input.value === '') {
        $clear.hide();
      } else {
        $clear.show();
      }
    });
    $clear.addEventListener('click', () => {
      $clear.hide();
      $suggestList.clear();
      $input.value = '';
    });
    $input.addEventListener('keydown', e => {
      switch (e.keyCode) {
        case 13:
          if (currentSuggestItemIndex !== -1 && active) {
            if (e.shiftKey) {
              debouncedFetcher($input.value);
            } else {
              $suggestList.clear();
            }
            currentSuggestItemValue = $input.value;
            e.preventDefault();
          }
          break;
        case 38:
          selectPreviousFormSuggestItem();
          e.preventDefault();
          break;
        case 40:
          selectNextFormSuggestItem();
          e.preventDefault();
          break;
      }
    });
    $input.addEventListener('focusin', () => {
      active = true;
      $suggestList.show();
    });
    document.addEventListener('focusin', e => {
      if (!$field.contains(e.target)) {
        active = false;
        $suggestList.hide();
      }
    });
  });

  $clear.hide();
}

const fromField = document.querySelector('#from-place-field');
const toField = document.querySelector('#to-place-field');

setupSuggest(fromField);
setupSuggest(toField);
