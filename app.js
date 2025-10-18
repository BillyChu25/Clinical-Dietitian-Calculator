// Food Exchange Planner PWA logic

// Daypart options (displayed using abbreviations for compact mobile UI)
const dayparts = {
  BF: 'Breakfast',
  MS: 'Morning Snack',
  L: 'Lunch',
  AS: 'Afternoon Snack',
  N: 'Dinner',
  NS: 'Night Snack',
};

const TEMPLATE_DAYPARTS = ['BF', 'L', 'N'];
const TEMPLATE_TARGETS = {
  1200: 1200,
  1400: 1400,
  1800: 1800,
};
const MACRO_ORDER = ['CHO', 'P', 'O', 'V', 'F', 'M', 'S'];

let foodData = [];
let foodById = new Map();
let macros = [];
let defaultItemsByMacro = {};
let templates = {};
let templatesReady = false;
let templateButtons = [];

// Fetch the dataset and initialise UI
fetch('food_exchange_dataset.json')
  .then((response) => response.json())
  .then((data) => {
    foodData = data;
    foodById = new Map(foodData.map((item) => [item.id, item]));
    initMacrosAndDefaults();
    initializeTemplates();
    templatesReady = true;
    setTemplateButtonsEnabled(true);
    // Add the first row on load for convenience
    addRow();
  })
  .catch((err) => {
    console.error('Failed to load food data:', err);
  });

function initMacrosAndDefaults() {
  const uniqueMacros = Array.from(new Set(foodData.map((item) => item.macro)));

  macros = MACRO_ORDER.filter((macro) => uniqueMacros.includes(macro));
  uniqueMacros.forEach((macro) => {
    if (!macros.includes(macro)) {
      macros.push(macro);
    }
  });

  defaultItemsByMacro = {};
  macros.forEach((macro) => {
    const item = foodData.find((it) => it.macro === macro);
    if (item) {
      defaultItemsByMacro[macro] = item;
    }
  });
}

function initializeTemplates() {
  templates = {};
  Object.entries(TEMPLATE_TARGETS).forEach(([key, targetCalories]) => {
    templates[key] = createTemplateForCalories(targetCalories);
  });
}

function createTemplateForCalories(targetCalories) {
  const rows = [];
  const rowLookup = new Map();

  TEMPLATE_DAYPARTS.forEach((daypart) => {
    macros.forEach((macro) => {
      const defaultItem = defaultItemsByMacro[macro];
      if (!defaultItem) {
        return;
      }
      const row = {
        daypart,
        macro,
        choice: defaultItem.id,
        portion: 1,
      };
      rows.push(row);
      rowLookup.set(`${daypart}-${macro}`, row);
    });
  });

  if (rows.length === 0) {
    return rows;
  }

  let totalEnergy = calculateTemplateEnergy(rows);
  const cycle = rows.map((row) => ({ daypart: row.daypart, macro: row.macro }));
  let index = 0;
  const maxIterations = 600;

  while (totalEnergy < targetCalories && index < maxIterations) {
    const { daypart, macro } = cycle[index % cycle.length];
    const key = `${daypart}-${macro}`;
    const row = rowLookup.get(key);
    if (row) {
      row.portion = parseFloat((row.portion + 0.5).toFixed(1));
      totalEnergy = calculateTemplateEnergy(rows);
    }
    index += 1;
  }

  return rows;
}

function calculateTemplateEnergy(templateRows) {
  return templateRows.reduce((sum, row) => {
    const item = foodById.get(row.choice);
    if (!item) {
      return sum;
    }
    return sum + item.energy * row.portion;
  }, 0);
}

// Add a new row to the plan table
function addRow(daypart, macro, choice, portion) {
  const tbody = document.getElementById('planBody');
  const row = document.createElement('tr');

  // Daypart cell
  const dayCell = document.createElement('td');
  const daySelect = document.createElement('select');
  for (const [abbr, fullName] of Object.entries(dayparts)) {
    const opt = document.createElement('option');
    opt.value = abbr;
    opt.textContent = abbr;
    opt.title = fullName;
    daySelect.appendChild(opt);
  }
  dayCell.appendChild(daySelect);
  row.appendChild(dayCell);

  // Macro cell
  const macroCell = document.createElement('td');
  const macroSelect = document.createElement('select');
  if (macros.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'N/A';
    macroSelect.appendChild(opt);
    macroSelect.disabled = true;
  } else {
    macros.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      macroSelect.appendChild(opt);
    });
  }
  macroCell.appendChild(macroSelect);
  row.appendChild(macroCell);

  // Choice cell
  const choiceCell = document.createElement('td');
  const choiceSelect = document.createElement('select');
  choiceCell.appendChild(choiceSelect);
  row.appendChild(choiceCell);

  // Portion cell
  const portionCell = document.createElement('td');
  const portionInput = document.createElement('input');
  portionInput.type = 'number';
  portionInput.min = '0';
  portionInput.step = '0.1';
  const initialPortion = portion != null ? portion : 1;
  portionInput.value = initialPortion;
  portionCell.appendChild(portionInput);
  row.appendChild(portionCell);

  // Energy, Protein, Fat cells
  const energyCell = document.createElement('td');
  energyCell.textContent = '0';
  const proteinCell = document.createElement('td');
  proteinCell.textContent = '0';
  const fatCell = document.createElement('td');
  fatCell.textContent = '0';
  row.appendChild(energyCell);
  row.appendChild(proteinCell);
  row.appendChild(fatCell);

  // Append row to table body
  tbody.appendChild(row);

  // Event listeners
  macroSelect.addEventListener('change', () => {
    populateChoices(choiceSelect, macroSelect.value);
    if (choiceSelect.options.length > 0) {
      choiceSelect.value = choiceSelect.options[0].value;
    }
    updateRow(row);
  });
  choiceSelect.addEventListener('change', () => updateRow(row));
  portionInput.addEventListener('input', () => updateRow(row));

  // Swipe to delete
  let touchstartX = 0;
  let touchendX = 0;

  row.addEventListener('touchstart', (e) => {
    touchstartX = e.changedTouches[0].screenX;
  });

  row.addEventListener('touchend', (e) => {
    touchendX = e.changedTouches[0].screenX;
    if (touchendX > touchstartX + 50) {
      row.remove();
      updateTotals();
    }
  });

  // Initial values
  if (daypart && dayparts[daypart]) {
    daySelect.value = daypart;
  }
  if (macro) {
    macroSelect.value = macro;
  }
  populateChoices(choiceSelect, macroSelect.value);
  if (choice != null) {
    choiceSelect.value = choice.toString();
  } else if (choiceSelect.options.length > 0) {
    choiceSelect.value = choiceSelect.options[0].value;
  }
  updateRow(row);
}

// Populate the choices dropdown based on macro type
function populateChoices(selectEl, macro) {
  selectEl.innerHTML = '';
  // Filter items by macro
  const filtered = foodData.filter((item) => item.macro === macro);
  if (filtered.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No options available';
    selectEl.appendChild(opt);
    selectEl.disabled = true;
    return;
  }
  selectEl.disabled = false;
  filtered.forEach((item) => {
    const opt = document.createElement('option');
    opt.value = item.id.toString();
    // Show English name and simple_portion for clarity
    opt.textContent = `${item.name_en} (${item.simple_portion})`;
    selectEl.appendChild(opt);
  });
}

// Update the macro results for a row
function updateRow(row) {
  const macroSelect = row.children[1].querySelector('select');
  const choiceSelect = row.children[2].querySelector('select');
  const portionInput = row.children[3].querySelector('input');
  const portion = parseFloat(portionInput.value) || 0;
  const itemId = Number(choiceSelect.value);
  const item = foodById.get(itemId);
  if (!item) {
    row.children[4].textContent = '0';
    row.children[5].textContent = '0';
    row.children[6].textContent = '0';
    updateTotals();
    return;
  }
  const energy = item.energy * portion;
  const protein = item.protein * portion;
  const fat = item.fat * portion;
  row.children[4].textContent = energy.toFixed(1);
  row.children[5].textContent = protein.toFixed(1);
  row.children[6].textContent = fat.toFixed(1);
  updateTotals();
}

// Update totals row
function updateTotals() {
  let totalEnergy = 0;
  let totalProtein = 0;
  let totalFat = 0;
  const rows = document.querySelectorAll('#planBody tr');
  rows.forEach((row) => {
    const energy = parseFloat(row.children[4].textContent) || 0;
    const protein = parseFloat(row.children[5].textContent) || 0;
    const fat = parseFloat(row.children[6].textContent) || 0;
    totalEnergy += energy;
    totalProtein += protein;
    totalFat += fat;
  });
  document.getElementById('totalEnergy').textContent = totalEnergy.toFixed(1);
  document.getElementById('totalProtein').textContent = totalProtein.toFixed(1);
  document.getElementById('totalFat').textContent = totalFat.toFixed(1);
}

// Clear all rows from the table
function clearTable() {
  const tbody = document.getElementById('planBody');
  tbody.innerHTML = '';
  updateTotals();
}

// Load a template
function loadTemplate(template) {
  if (!Array.isArray(template) || template.length === 0) {
    console.warn('Template not available or still loading.');
    return;
  }
  clearTable();
  template.forEach((item) => {
    addRow(item.daypart, item.macro, item.choice, item.portion);
  });
  updateTotals();
}

document.addEventListener('DOMContentLoaded', () => {
  templateButtons = Array.from(document.querySelectorAll('.template-buttons button'));
  setTemplateButtonsEnabled(templatesReady);

  // Attach event listener to the add row button
  document.getElementById('addRowBtn').addEventListener('click', () => addRow());

  // Attach event listeners to template buttons
  document.getElementById('template1200').addEventListener('click', () => handleTemplateClick('1200'));
  document.getElementById('template1400').addEventListener('click', () => handleTemplateClick('1400'));
  document.getElementById('template1800').addEventListener('click', () => handleTemplateClick('1800'));
});

function setTemplateButtonsEnabled(enabled) {
  if (!templateButtons.length) {
    return;
  }
  templateButtons.forEach((btn) => {
    btn.disabled = !enabled;
  });
}

function handleTemplateClick(templateKey) {
  if (!templatesReady) {
    console.warn('Templates are still loading. Please try again shortly.');
    return;
  }
  const template = templates[templateKey];
  loadTemplate(template);
}

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.log('Service worker registration failed:', err);
    });
  });
}
