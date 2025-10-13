// Food Exchange Planner PWA logic

// Daypart and macro options
const dayparts = [
  'Breakfast',
  'Morning Snack',
  'Lunch',
  'Afternoon Snack',
  'Dinner',
  'Night Snack',
];
const macros = ['CHO', 'P', 'V', 'O'];

let foodData = [];

// Fetch the dataset and initialise UI
fetch('food_exchange_dataset.json')
  .then((response) => response.json())
  .then((data) => {
    foodData = data;
    // Add the first row on load for convenience
    addRow();
  })
  .catch((err) => {
    console.error('Failed to load food data:', err);
  });

// Add a new row to the plan table
function addRow() {
  const tbody = document.getElementById('planBody');
  const row = document.createElement('tr');

  // Daypart cell
  const dayCell = document.createElement('td');
  const daySelect = document.createElement('select');
  dayparts.forEach((dp) => {
    const opt = document.createElement('option');
    opt.value = dp;
    opt.textContent = dp;
    daySelect.appendChild(opt);
  });
  dayCell.appendChild(daySelect);
  row.appendChild(dayCell);

  // Macro cell
  const macroCell = document.createElement('td');
  const macroSelect = document.createElement('select');
  macros.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    macroSelect.appendChild(opt);
  });
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
  portionInput.value = '1';
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
    updateRow(row);
  });
  choiceSelect.addEventListener('change', () => updateRow(row));
  portionInput.addEventListener('input', () => updateRow(row));

  // Initial values
  macroSelect.value = macros[0];
  populateChoices(choiceSelect, macros[0]);
  choiceSelect.selectedIndex = 0;
  updateRow(row);
}

// Populate the choices dropdown based on macro type
function populateChoices(selectEl, macro) {
  selectEl.innerHTML = '';
  // Filter items by macro
  const filtered = foodData.filter((item) => item.macro === macro);
  filtered.forEach((item) => {
    const opt = document.createElement('option');
    opt.value = item.id.toString();
    // Show English name and serving for clarity
    opt.textContent = `${item.name_en} (${item.serving})`;
    selectEl.appendChild(opt);
  });
}

// Update the macro results for a row
function updateRow(row) {
  const macroSelect = row.children[1].querySelector('select');
  const choiceSelect = row.children[2].querySelector('select');
  const portionInput = row.children[3].querySelector('input');
  const portion = parseFloat(portionInput.value) || 0;
  // Find the selected item
  const itemId = parseInt(choiceSelect.value);
  const item = foodData.find((it) => it.id === itemId);
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

// Attach event listener to the add row button
document.getElementById('addRowBtn').addEventListener('click', addRow);

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.log('Service worker registration failed:', err);
    });
  });
}