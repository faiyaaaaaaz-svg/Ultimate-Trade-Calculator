const DATA = window.WEB_CALCULATOR_DATA || {
  instruments: [],
  models: [],
  conversionPrices: []
};

function formatMoney(value) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatPlainNumber(value, decimals = 5) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
}

function formatMacroPercent(value) {
  return `${formatPlainNumber(value, 2)}%`;
}

function formatPosition(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function setOptions(selectElement, placeholderText, values) {
  selectElement.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = placeholderText;
  selectElement.appendChild(placeholder);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectElement.appendChild(option);
  });

  refreshSearchableSelect(selectElement);
}


function initializeSearchableSelects() {
  document.querySelectorAll("select").forEach((selectElement) => {
    if (selectElement.dataset.searchableReady === "true") return;

    selectElement.dataset.searchableReady = "true";
    selectElement.classList.add("native-select-hidden");

    const wrapper = document.createElement("div");
    wrapper.className = "searchable-select";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "searchable-trigger";

    const triggerText = document.createElement("span");
    triggerText.className = "searchable-trigger-text";

    const arrow = document.createElement("span");
    arrow.className = "searchable-arrow";
    arrow.setAttribute("aria-hidden", "true");

    trigger.appendChild(triggerText);
    trigger.appendChild(arrow);

    const panel = document.createElement("div");
    panel.className = "searchable-panel";

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "searchable-input";
    searchInput.placeholder = "Search options...";
    searchInput.autocomplete = "off";

    const list = document.createElement("div");
    list.className = "searchable-list";

    panel.appendChild(searchInput);
    panel.appendChild(list);

    wrapper.appendChild(trigger);
    wrapper.appendChild(panel);

    selectElement.insertAdjacentElement("afterend", wrapper);

    selectElement.searchableControl = {
      wrapper,
      trigger,
      triggerText,
      searchInput,
      list
    };

    function openDropdown() {
      closeSearchableDropdowns(wrapper);
      wrapper.classList.add("is-open");
      const parentCard = wrapper.closest(".card");
      if (parentCard) parentCard.classList.add("dropdown-open");
      renderSearchableOptions(selectElement, "");
      searchInput.value = "";
      setTimeout(() => searchInput.focus(), 0);
    }

    function closeDropdown() {
      wrapper.classList.remove("is-open");
      const parentCard = wrapper.closest(".card");
      if (parentCard) parentCard.classList.remove("dropdown-open");
      searchInput.value = "";
    }

    trigger.addEventListener("click", () => {
      if (wrapper.classList.contains("is-open")) {
        closeDropdown();
      } else {
        openDropdown();
      }
    });

    searchInput.addEventListener("input", () => {
      renderSearchableOptions(selectElement, searchInput.value);
    });

    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeDropdown();
        trigger.focus();
        return;
      }

      if (event.key === "Enter") {
        const firstOption = list.querySelector(".searchable-option");
        if (firstOption) {
          firstOption.click();
        }
      }
    });

    selectElement.addEventListener("change", () => {
      refreshSearchableSelect(selectElement);
    });

    refreshSearchableSelect(selectElement);
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".searchable-select")) {
      closeSearchableDropdowns();
    }
  });
}

function closeSearchableDropdowns(exceptWrapper) {
  document.querySelectorAll(".card.dropdown-open").forEach((card) => {
    card.classList.remove("dropdown-open");
  });

  document.querySelectorAll(".searchable-select.is-open").forEach((wrapper) => {
    if (exceptWrapper && wrapper === exceptWrapper) return;
    wrapper.classList.remove("is-open");
  });
}

function refreshSearchableSelect(selectElement) {
  if (!selectElement || !selectElement.searchableControl) return;

  const { trigger, triggerText } = selectElement.searchableControl;
  const selectedOption = selectElement.options[selectElement.selectedIndex];
  const placeholderOption = selectElement.options[0];
  const selectedText = selectedOption ? selectedOption.textContent : "";
  const placeholderText = placeholderOption ? placeholderOption.textContent : "Select option";

  triggerText.textContent = selectedText || placeholderText;
  trigger.classList.toggle("is-placeholder", !selectElement.value);
  renderSearchableOptions(selectElement, "");
}

function renderSearchableOptions(selectElement, searchTerm) {
  if (!selectElement || !selectElement.searchableControl) return;

  const { list } = selectElement.searchableControl;
  const normalizedSearch = String(searchTerm || "").trim().toLowerCase();
  const options = Array.from(selectElement.options);
  const filteredOptions = options.filter((option) => {
    if (!normalizedSearch) return true;
    return option.textContent.toLowerCase().includes(normalizedSearch);
  });

  list.innerHTML = "";

  if (!filteredOptions.length) {
    const empty = document.createElement("div");
    empty.className = "searchable-empty";
    empty.textContent = "No matching options";
    list.appendChild(empty);
    return;
  }

  filteredOptions.forEach((option) => {
    const optionButton = document.createElement("button");
    optionButton.type = "button";
    optionButton.className = "searchable-option";
    optionButton.textContent = option.textContent;
    optionButton.classList.toggle("is-selected", option.value === selectElement.value);

    optionButton.addEventListener("click", () => {
      selectElement.value = option.value;
      refreshSearchableSelect(selectElement);
      closeSearchableDropdowns();
      selectElement.dispatchEvent(new Event("change", { bubbles: true }));
    });

    list.appendChild(optionButton);
  });
}

function refreshAllSearchableSelects() {
  document.querySelectorAll("select").forEach((selectElement) => {
    refreshSearchableSelect(selectElement);
  });
}


function getInstrumentByName(name) {
  return DATA.instruments.find((item) => item.instrumentName === name);
}

function getModelByName(name, marketType) {
  return DATA.models.find(
    (item) => item.modelName === name && item.marketType === marketType
  );
}

function getConversionByInstrument(name) {
  return DATA.conversionPrices.find((item) => item.instrumentName === name);
}

function populateInstrumentSelectByMarket(selectElement, marketValue) {
  if (!marketValue) {
    setOptions(selectElement, "Select instrument", []);
    return;
  }

  const instrumentList = DATA.instruments
    .filter((item) => item.active && item.marketType === marketValue)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
    .map((item) => item.instrumentName);

  setOptions(selectElement, "Select instrument", instrumentList);
}

function populateModelSelectByMarket(selectElement, marketValue) {
  if (!marketValue) {
    setOptions(selectElement, "Select model", []);
    return;
  }

  const modelList = DATA.models
    .filter((item) => item.active && item.marketType === marketValue)
    .map((item) => item.modelName);

  setOptions(selectElement, "Select model", modelList);
}

function setupCopyButton(buttonElement, textElement, defaultLabel) {
  buttonElement.addEventListener("click", async () => {
    const textToCopy = textElement.textContent.trim();
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      buttonElement.textContent = "Copied!";
      setTimeout(() => {
        buttonElement.textContent = defaultLabel;
      }, 1400);
    } catch (error) {
      buttonElement.textContent = "Copy failed";
      setTimeout(() => {
        buttonElement.textContent = defaultLabel;
      }, 1400);
    }
  });
}

/* -----------------------------------
   TAB SWITCHING
----------------------------------- */
const tabs = document.querySelectorAll(".tab");
const calculatorCards = document.querySelectorAll(".calculator-card");
const tabTriggers = document.querySelectorAll(".tab, .calculator-card");
const marginSection = document.getElementById("marginSection");
const pnlSection = document.getElementById("pnlSection");
const maxlotSection = document.getElementById("maxlotSection");
const riskSection = document.getElementById("riskSection");

const sectionMap = {
  margin: marginSection,
  pnl: pnlSection,
  maxlot: maxlotSection,
  risk: riskSection
};

function showSection(tabName, scrollToSection = false) {
  Object.entries(sectionMap).forEach(([name, section]) => {
    if (!section) return;
    section.style.display = name === tabName ? "block" : "none";
  });

  document.body.dataset.activeTool = tabName;

  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
    tab.setAttribute("aria-selected", tab.dataset.tab === tabName ? "true" : "false");
  });

  calculatorCards.forEach((card) => {
    card.classList.toggle("active", card.dataset.tab === tabName);
  });

  closeSearchableDropdowns();

  if (scrollToSection && sectionMap[tabName]) {
    setTimeout(() => {
      sectionMap[tabName].scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }
}

tabTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => {
    showSection(trigger.dataset.tab, true);
  });
});

/* -----------------------------------
   MARGIN CALCULATOR
----------------------------------- */
const market = document.getElementById("market");
const instrument = document.getElementById("instrument");
const model = document.getElementById("model");
const modelGroup = document.getElementById("modelGroup");
const price = document.getElementById("price");
const lot = document.getElementById("lotSize");
const manualCheck = document.getElementById("useManualLeverage");
const manualInput = document.getElementById("manualLeverage");
const manualWrap = document.getElementById("manualLeverageWrap");
const result = document.getElementById("result");
const contractSizeEl = document.getElementById("contractSize");
const conversionEl = document.getElementById("conversionFactor");
const leverageEl = document.getElementById("leverageUsed");
const helper = document.getElementById("helperBox");
const marginMacroText = document.getElementById("marginMacroText");
const copyMarginMacroBtn = document.getElementById("copyMarginMacroBtn");

function populateModel() {
  if (manualCheck.checked) {
    setOptions(model, "Select model", []);
    return;
  }

  populateModelSelectByMarket(model, market.value);
}

function updateVisibility() {
  if (manualCheck.checked) {
    modelGroup.style.display = "none";
    manualWrap.style.display = "flex";
  } else {
    modelGroup.style.display = "";
    manualWrap.style.display = "none";
    manualInput.value = "";
  }
}

function updateLeverageDisplay() {
  if (manualCheck.checked) {
    leverageEl.textContent = manualInput.value ? manualInput.value : "Manual leverage not mentioned!";
    return;
  }

  const selectedModel = getModelByName(model.value, market.value);
  leverageEl.textContent = selectedModel ? selectedModel.defaultLeverage : "-";
}

function updateMarginHelperText() {
  if (!market.value) {
    helper.textContent = "Select a market to begin.";
    return;
  }
  if (!instrument.value) {
    helper.textContent = "Now choose an instrument.";
    return;
  }
  if (manualCheck.checked && !manualInput.value) {
    helper.textContent = "Enter manual leverage to proceed.";
    return;
  }
  if (!manualCheck.checked && !model.value) {
    helper.textContent = "Now choose a model.";
    return;
  }
  if (!price.value) {
    helper.textContent = "Enter the current price.";
    return;
  }
  if (!lot.value) {
    helper.textContent = "Enter the lot size.";
    return;
  }

  helper.textContent = "All required inputs are ready.";
}

function updateMarginMacro() {
  const selectedInstrument = getInstrumentByName(instrument.value);
  const selectedModel = getModelByName(model.value, market.value);
  const selectedConversion = getConversionByInstrument(instrument.value);

  if (!market.value || !instrument.value || !price.value || !lot.value) {
    marginMacroText.textContent = "Please complete the Margin Calculator inputs to generate the explanation text.";
    return;
  }

  if (manualCheck.checked && !manualInput.value) {
    marginMacroText.textContent = "Please enter the manual leverage to generate the explanation text.";
    return;
  }

  if (!manualCheck.checked && !model.value) {
    marginMacroText.textContent = "Please select a model to generate the explanation text.";
    return;
  }

  if (!selectedInstrument) {
    marginMacroText.textContent = "Instrument data is missing, so the explanation text cannot be generated yet.";
    return;
  }

  const priceValue = Number(price.value);
  const lotValue = Number(lot.value);
  const contractSize = Number(selectedInstrument.contractSize || 0);
  const conversionFactor = selectedConversion ? Number(selectedConversion.finalConversionFactor || 1) : 1;
  const leverageValue = manualCheck.checked
    ? Number(manualInput.value || 0)
    : Number(selectedModel?.defaultLeverage || 0);

  if (!priceValue || !lotValue || !contractSize || !conversionFactor || !leverageValue) {
    marginMacroText.textContent = "Please complete the Margin Calculator inputs to generate the explanation text.";
    return;
  }

  const preConversionMargin = (priceValue * contractSize * lotValue) / leverageValue;
  const convertedMargin = preConversionMargin * conversionFactor;
  const formulaIntro =
`The formula for calculating margin is as follows:
Required Margin = (Price × Contract Size × Lot Size) ÷ Leverage`;

  if (Math.abs(convertedMargin - preConversionMargin) < 0.0000001) {
    marginMacroText.textContent =
`${formulaIntro}

Based on the pair ${instrument.value}, with a price of ${formatPlainNumber(priceValue, 5)}, lot size of ${formatPlainNumber(lotValue, 2)}, and a leverage of ${formatPlainNumber(leverageValue, 2)}, the required margin to open the trade is $${formatMoney(convertedMargin)}.`;
    return;
  }

  marginMacroText.textContent =
`${formulaIntro}

Based on the pair ${instrument.value}, with a price of ${formatPlainNumber(priceValue, 5)}, lot size of ${formatPlainNumber(lotValue, 2)}, and a leverage of ${formatPlainNumber(leverageValue, 2)}, the calculated margin before USD conversion is ${formatMoney(preConversionMargin)}. After converting to USD, the required margin is approximately $${formatMoney(convertedMargin)}.`;
}

function calculateMargin() {
  updateLeverageDisplay();
  updateMarginHelperText();

  const selectedInstrument = getInstrumentByName(instrument.value);
  const selectedModel = getModelByName(model.value, market.value);
  const selectedConversion = getConversionByInstrument(instrument.value);

  const priceValue = Number(price.value);
  const lotValue = Number(lot.value);

  contractSizeEl.textContent = "-";
  conversionEl.textContent = "-";
  result.textContent = "0.00";

  if (!selectedInstrument) {
    updateMarginMacro();
    return;
  }

  contractSizeEl.textContent = selectedInstrument.contractSize;

  const conversionFactor = selectedConversion ? Number(selectedConversion.finalConversionFactor || 1) : 1;
  conversionEl.textContent = conversionFactor;

  let leverageValue = 0;
  if (manualCheck.checked) {
    leverageValue = Number(manualInput.value || 0);
  } else {
    if (!selectedModel) {
      updateMarginMacro();
      return;
    }
    leverageValue = Number(selectedModel.defaultLeverage || 0);
  }

  if (priceValue && lotValue && leverageValue) {
    const margin =
      (priceValue * Number(selectedInstrument.contractSize) * lotValue / leverageValue) *
      conversionFactor;

    result.textContent = formatMoney(margin);
  }

  updateMarginMacro();
}

function onMarginMarketChange() {
  populateInstrumentSelectByMarket(instrument, market.value);
  populateModel();
  instrument.value = "";
  model.value = "";
  refreshAllSearchableSelects();
  calculateMargin();
}

function onManualToggleChange() {
  updateVisibility();
  populateModel();
  model.value = "";
  refreshAllSearchableSelects();
  calculateMargin();
}

/* -----------------------------------
   PNL CALCULATOR
----------------------------------- */
const pnlMarket = document.getElementById("pnlMarket");
const pnlInstrument = document.getElementById("pnlInstrument");
const pnlPosition = document.getElementById("pnlPosition");
const pnlOpenPrice = document.getElementById("pnlOpenPrice");
const pnlClosePrice = document.getElementById("pnlClosePrice");
const pnlLotSize = document.getElementById("pnlLotSize");
const pnlResult = document.getElementById("pnlResult");
const pnlPips = document.getElementById("pnlPips");
const pnlMovement = document.getElementById("pnlMovement");
const pnlConversionFactor = document.getElementById("pnlConversionFactor");
const pnlHelperBox = document.getElementById("pnlHelperBox");
const pnlMacroText = document.getElementById("pnlMacroText");
const copyPnlMacroBtn = document.getElementById("copyPnlMacroBtn");

function updatePnlHelperText() {
  if (!pnlMarket.value) {
    pnlHelperBox.textContent = "Select a market to begin.";
    return;
  }
  if (!pnlInstrument.value) {
    pnlHelperBox.textContent = "Now choose an instrument.";
    return;
  }
  if (!pnlPosition.value) {
    pnlHelperBox.textContent = "Choose buy or sell.";
    return;
  }
  if (!pnlOpenPrice.value) {
    pnlHelperBox.textContent = "Enter the opening price.";
    return;
  }
  if (!pnlClosePrice.value) {
    pnlHelperBox.textContent = "Enter the closing price.";
    return;
  }
  if (!pnlLotSize.value) {
    pnlHelperBox.textContent = "Enter the lot size.";
    return;
  }

  pnlHelperBox.textContent = "PnL inputs are ready.";
}

function updatePnlMacro() {
  const selectedInstrument = getInstrumentByName(pnlInstrument.value);
  const selectedConversion = getConversionByInstrument(pnlInstrument.value);

  if (!pnlMarket.value || !pnlInstrument.value || !pnlPosition.value || !pnlOpenPrice.value || !pnlClosePrice.value || !pnlLotSize.value) {
    pnlMacroText.textContent = "Please complete the PnL Calculator inputs to generate the explanation text.";
    return;
  }

  if (!selectedInstrument) {
    pnlMacroText.textContent = "Instrument data is missing, so the explanation text cannot be generated yet.";
    return;
  }

  const openValue = Number(pnlOpenPrice.value);
  const closeValue = Number(pnlClosePrice.value);
  const lotValue = Number(pnlLotSize.value);
  const contractSize = Number(selectedInstrument.contractSize || 0);
  const pipSize = Number(selectedInstrument.pipSize || 0);
  const conversionFactor = selectedConversion ? Number(selectedConversion.finalConversionFactor || 1) : 1;

  if (!openValue || !closeValue || !lotValue || !contractSize || !pipSize || !conversionFactor) {
    pnlMacroText.textContent = "Please complete the PnL Calculator inputs to generate the explanation text.";
    return;
  }

  const rawMovement = closeValue - openValue;
  const directionMovement = pnlPosition.value === "buy" ? rawMovement : -rawMovement;
  const pipMovement = directionMovement / pipSize;
  const pnlUsd = directionMovement * contractSize * lotValue * conversionFactor;

  pnlMacroText.textContent =
`The estimated PnL for a ${pnlPosition.value.toUpperCase()} position on ${pnlInstrument.value} from price ${formatPlainNumber(openValue, 5)} to ${formatPlainNumber(closeValue, 5)} with ${formatPlainNumber(lotValue, 2)} lot(s) is ${formatMoney(pnlUsd)} USD. This position represents ${formatPlainNumber(pipMovement, 2)} pips.`;
}

function calculatePnl() {
  updatePnlHelperText();

  const selectedInstrument = getInstrumentByName(pnlInstrument.value);
  const selectedConversion = getConversionByInstrument(pnlInstrument.value);

  pnlResult.textContent = "0.00";
  pnlPips.textContent = "-";
  pnlMovement.textContent = "-";
  pnlConversionFactor.textContent = "-";

  if (!selectedInstrument || !pnlPosition.value) {
    updatePnlMacro();
    return;
  }

  const openValue = Number(pnlOpenPrice.value);
  const closeValue = Number(pnlClosePrice.value);
  const lotValue = Number(pnlLotSize.value);

  if (!openValue || !closeValue || !lotValue) {
    updatePnlMacro();
    return;
  }

  const conversionFactor = selectedConversion ? Number(selectedConversion.finalConversionFactor || 1) : 1;
  const rawMovement = closeValue - openValue;
  const directionMovement = pnlPosition.value === "buy" ? rawMovement : -rawMovement;
  const pipSize = Number(selectedInstrument.pipSize || 0);
  const contractSize = Number(selectedInstrument.contractSize || 0);

  if (!pipSize || !contractSize) {
    updatePnlMacro();
    return;
  }

  const pipMovement = directionMovement / pipSize;
  const pnlUsd = directionMovement * contractSize * lotValue * conversionFactor;

  pnlResult.textContent = formatMoney(pnlUsd);
  pnlPips.textContent = formatPlainNumber(pipMovement, 2);
  pnlMovement.textContent = formatPlainNumber(directionMovement, 5);
  pnlConversionFactor.textContent = conversionFactor;

  updatePnlMacro();
}

function onPnlMarketChange() {
  populateInstrumentSelectByMarket(pnlInstrument, pnlMarket.value);
  pnlInstrument.value = "";
  refreshAllSearchableSelects();
  calculatePnl();
}

/* -----------------------------------
   ADD / REMOVE PIPS CALCULATOR
----------------------------------- */
const pipMarket = document.getElementById("pipMarket");
const pipInstrument = document.getElementById("pipInstrument");
const pipOpenPrice = document.getElementById("pipOpenPrice");
const pipAction = document.getElementById("pipAction");
const pipAmount = document.getElementById("pipAmount");
const pipResult = document.getElementById("pipResult");
const pipSizeUsed = document.getElementById("pipSizeUsed");
const pipHelperBox = document.getElementById("pipHelperBox");
const pipMacroText = document.getElementById("pipMacroText");
const copyPipMacroBtn = document.getElementById("copyPipMacroBtn");

function updatePipHelperText() {
  if (!pipMarket.value) {
    pipHelperBox.textContent = "Select a market to begin.";
    return;
  }
  if (!pipInstrument.value) {
    pipHelperBox.textContent = "Now choose an instrument.";
    return;
  }
  if (!pipOpenPrice.value) {
    pipHelperBox.textContent = "Enter the opening price.";
    return;
  }
  if (!pipAction.value) {
    pipHelperBox.textContent = "Choose add or remove.";
    return;
  }
  if (!pipAmount.value) {
    pipHelperBox.textContent = "Enter the pip or point amount.";
    return;
  }

  pipHelperBox.textContent = "Add / Remove Pips inputs are ready.";
}

function updatePipMacro() {
  const selectedInstrument = getInstrumentByName(pipInstrument.value);

  if (!pipMarket.value || !pipInstrument.value || !pipOpenPrice.value || !pipAction.value || !pipAmount.value) {
    pipMacroText.textContent = "Please complete the Add / Remove Pips Calculator inputs to generate the explanation text.";
    return;
  }

  if (!selectedInstrument) {
    pipMacroText.textContent = "Instrument data is missing, so the explanation text cannot be generated yet.";
    return;
  }

  const openValue = Number(pipOpenPrice.value);
  const amountValue = Number(pipAmount.value);
  const pipSize = Number(selectedInstrument.pipSize || 0);

  if (!openValue || !amountValue || !pipSize) {
    pipMacroText.textContent = "Please complete the Add / Remove Pips Calculator inputs to generate the explanation text.";
    return;
  }

  let newPrice = openValue;
  if (pipAction.value === "add") newPrice = openValue + (amountValue * pipSize);
  if (pipAction.value === "remove") newPrice = openValue - (amountValue * pipSize);

  pipMacroText.textContent =
`For ${pipInstrument.value}, starting from an opening price of ${formatPlainNumber(openValue, 5)}, ${pipAction.value === "add" ? "adding" : "removing"} ${formatPlainNumber(amountValue, 2)} pips / points gives a new estimated price of ${formatPlainNumber(newPrice, 5)}.`;
}

function calculatePipPrice() {
  updatePipHelperText();

  const selectedInstrument = getInstrumentByName(pipInstrument.value);

  pipResult.textContent = "0.00";
  pipSizeUsed.textContent = "-";

  if (!selectedInstrument) {
    updatePipMacro();
    return;
  }

  const openValue = Number(pipOpenPrice.value);
  const amountValue = Number(pipAmount.value);
  const pipSize = Number(selectedInstrument.pipSize || 0);

  pipSizeUsed.textContent = pipSize;

  if (!openValue || !amountValue || !pipSize || !pipAction.value) {
    updatePipMacro();
    return;
  }

  let newPrice = openValue;
  if (pipAction.value === "add") newPrice = openValue + (amountValue * pipSize);
  if (pipAction.value === "remove") newPrice = openValue - (amountValue * pipSize);

  pipResult.textContent = formatPlainNumber(newPrice, 5);

  updatePipMacro();
}

function onPipMarketChange() {
  populateInstrumentSelectByMarket(pipInstrument, pipMarket.value);
  pipInstrument.value = "";
  refreshAllSearchableSelects();
  calculatePipPrice();
}

/* -----------------------------------
   MAX LOT CALCULATOR
----------------------------------- */
const maxlotMarket = document.getElementById("maxlotMarket");
const maxlotInstrument = document.getElementById("maxlotInstrument");
const maxlotModel = document.getElementById("maxlotModel");
const maxlotModelGroup = document.getElementById("maxlotModelGroup");
const maxlotAccountSize = document.getElementById("maxlotAccountSize");
const maxlotPrice = document.getElementById("maxlotPrice");
const maxlotUseManualLeverage = document.getElementById("maxlotUseManualLeverage");
const maxlotManualLeverage = document.getElementById("maxlotManualLeverage");
const maxlotManualLeverageWrap = document.getElementById("maxlotManualLeverageWrap");
const maxlotResult = document.getElementById("maxlotResult");
const maxlotContractSize = document.getElementById("maxlotContractSize");
const maxlotConversionFactor = document.getElementById("maxlotConversionFactor");
const maxlotLeverageUsed = document.getElementById("maxlotLeverageUsed");
const maxlotHelperBox = document.getElementById("maxlotHelperBox");
const maxlotMacroText = document.getElementById("maxlotMacroText");
const copyMaxlotMacroBtn = document.getElementById("copyMaxlotMacroBtn");

function populateMaxlotModel() {
  if (maxlotUseManualLeverage.checked) {
    setOptions(maxlotModel, "Select model", []);
    return;
  }

  populateModelSelectByMarket(maxlotModel, maxlotMarket.value);
}

function updateMaxlotVisibility() {
  if (maxlotUseManualLeverage.checked) {
    maxlotModelGroup.style.display = "none";
    maxlotManualLeverageWrap.style.display = "flex";
  } else {
    maxlotModelGroup.style.display = "";
    maxlotManualLeverageWrap.style.display = "none";
    maxlotManualLeverage.value = "";
  }
}

function updateMaxlotLeverageDisplay() {
  if (maxlotUseManualLeverage.checked) {
    maxlotLeverageUsed.textContent = maxlotManualLeverage.value ? maxlotManualLeverage.value : "Manual leverage not mentioned!";
    return;
  }

  const selectedModel = getModelByName(maxlotModel.value, maxlotMarket.value);
  maxlotLeverageUsed.textContent = selectedModel ? selectedModel.defaultLeverage : "-";
}

function updateMaxlotHelperText() {
  if (!maxlotMarket.value) {
    maxlotHelperBox.textContent = "Select a market to begin.";
    return;
  }
  if (!maxlotInstrument.value) {
    maxlotHelperBox.textContent = "Now choose an instrument.";
    return;
  }
  if (maxlotUseManualLeverage.checked && !maxlotManualLeverage.value) {
    maxlotHelperBox.textContent = "Enter manual leverage to proceed.";
    return;
  }
  if (!maxlotUseManualLeverage.checked && !maxlotModel.value) {
    maxlotHelperBox.textContent = "Now choose a model.";
    return;
  }
  if (!maxlotAccountSize.value) {
    maxlotHelperBox.textContent = "Enter the account size.";
    return;
  }
  if (!maxlotPrice.value) {
    maxlotHelperBox.textContent = "Enter the current price.";
    return;
  }

  maxlotHelperBox.textContent = "All required inputs are ready.";
}

function updateMaxlotMacro() {
  const selectedInstrument = getInstrumentByName(maxlotInstrument.value);
  const selectedModel = getModelByName(maxlotModel.value, maxlotMarket.value);
  const selectedConversion = getConversionByInstrument(maxlotInstrument.value);

  if (!maxlotMarket.value || !maxlotInstrument.value || !maxlotAccountSize.value || !maxlotPrice.value) {
    maxlotMacroText.textContent = "Please complete the Max Lot Calculator inputs to generate the explanation text.";
    return;
  }

  if (maxlotUseManualLeverage.checked && !maxlotManualLeverage.value) {
    maxlotMacroText.textContent = "Please enter the manual leverage to generate the explanation text.";
    return;
  }

  if (!maxlotUseManualLeverage.checked && !maxlotModel.value) {
    maxlotMacroText.textContent = "Please select a model to generate the explanation text.";
    return;
  }

  if (!selectedInstrument) {
    maxlotMacroText.textContent = "Instrument data is missing, so the explanation text cannot be generated yet.";
    return;
  }

  const accountSizeValue = Number(maxlotAccountSize.value);
  const priceValue = Number(maxlotPrice.value);
  const contractSize = Number(selectedInstrument.contractSize || 0);
  const conversionFactor = selectedConversion ? Number(selectedConversion.finalConversionFactor || 1) : 1;
  const leverageValue = maxlotUseManualLeverage.checked
    ? Number(maxlotManualLeverage.value || 0)
    : Number(selectedModel?.defaultLeverage || 0);

  if (!accountSizeValue || !priceValue || !contractSize || !conversionFactor || !leverageValue) {
    maxlotMacroText.textContent = "Please complete the Max Lot Calculator inputs to generate the explanation text.";
    return;
  }

  const maxLot =
    (accountSizeValue * leverageValue) /
    (priceValue * contractSize * conversionFactor);

  const formulaIntro =
`How the maximum lot size is calculated:
Lot Size = (Required Margin × Leverage) ÷ (Price × Contract Size)
(For the maximum lot size calculation, we assume that Required Margin ≈ Available Balance.)`;

  if (maxLot < 0.01) {
    maxlotMacroText.textContent =
`${formulaIntro}

The computed maximum lot size is below 0.01 lots, so it’s effectively not tradable. With your current balance ($${formatMoney(accountSizeValue)}), leverage (${formatPlainNumber(leverageValue, 3)}), and price ${formatPlainNumber(priceValue, 5)}, the system rounds this to Not Enough Margin to open the trade. Consider taking a smaller lot size.`;
    return;
  }

  maxlotMacroText.textContent =
`${formulaIntro}

With a balance of $${formatMoney(accountSizeValue)}, leverage (${formatPlainNumber(leverageValue, 3)}), and price ${formatPlainNumber(priceValue, 5)}, the maximum lot size you can open on ${maxlotInstrument.value} is ${formatPlainNumber(maxLot, 2)}.`;
}

function calculateMaxlot() {
  updateMaxlotLeverageDisplay();
  updateMaxlotHelperText();

  const selectedInstrument = getInstrumentByName(maxlotInstrument.value);
  const selectedModel = getModelByName(maxlotModel.value, maxlotMarket.value);
  const selectedConversion = getConversionByInstrument(maxlotInstrument.value);

  const accountSizeValue = Number(maxlotAccountSize.value);
  const priceValue = Number(maxlotPrice.value);

  maxlotContractSize.textContent = "-";
  maxlotConversionFactor.textContent = "-";
  maxlotResult.textContent = "0.00";

  if (!selectedInstrument) {
    updateMaxlotMacro();
    return;
  }

  maxlotContractSize.textContent = selectedInstrument.contractSize;

  const conversionFactor = selectedConversion ? Number(selectedConversion.finalConversionFactor || 1) : 1;
  maxlotConversionFactor.textContent = conversionFactor;

  let leverageValue = 0;
  if (maxlotUseManualLeverage.checked) {
    leverageValue = Number(maxlotManualLeverage.value || 0);
  } else {
    if (!selectedModel) {
      updateMaxlotMacro();
      return;
    }
    leverageValue = Number(selectedModel.defaultLeverage || 0);
  }

  if (!accountSizeValue || !priceValue || !leverageValue) {
    updateMaxlotMacro();
    return;
  }

  const maxLot =
    (accountSizeValue * leverageValue) /
    (priceValue * Number(selectedInstrument.contractSize) * conversionFactor);

  maxlotResult.textContent = formatPlainNumber(maxLot, 2);

  updateMaxlotMacro();
}

function onMaxlotMarketChange() {
  populateInstrumentSelectByMarket(maxlotInstrument, maxlotMarket.value);
  populateMaxlotModel();
  maxlotInstrument.value = "";
  maxlotModel.value = "";
  refreshAllSearchableSelects();
  calculateMaxlot();
}

function onMaxlotManualToggleChange() {
  updateMaxlotVisibility();
  populateMaxlotModel();
  maxlotModel.value = "";
  refreshAllSearchableSelects();
  calculateMaxlot();
}

/* -----------------------------------
   RISK BY MONEY AND LOT
----------------------------------- */
const riskMoneyAccountBalance = document.getElementById("riskMoneyAccountBalance");
const riskMoneyMarket = document.getElementById("riskMoneyMarket");
const riskMoneyInstrument = document.getElementById("riskMoneyInstrument");
const riskMoneyPosition = document.getElementById("riskMoneyPosition");
const riskMoneyEntryPrice = document.getElementById("riskMoneyEntryPrice");
const riskMoneyLotSize = document.getElementById("riskMoneyLotSize");
const riskMoneyRisk = document.getElementById("riskMoneyRisk");
const riskMoneyReward = document.getElementById("riskMoneyReward");

const riskMoneyStopLoss = document.getElementById("riskMoneyStopLoss");
const riskMoneyTakeProfit = document.getElementById("riskMoneyTakeProfit");
const riskMoneyPipSize = document.getElementById("riskMoneyPipSize");
const riskMoneyConversionFactor = document.getElementById("riskMoneyConversionFactor");
const riskMoneyContractSize = document.getElementById("riskMoneyContractSize");
const riskMoneySlPips = document.getElementById("riskMoneySlPips");
const riskMoneyTpPips = document.getElementById("riskMoneyTpPips");
const riskMoneyHelperBox = document.getElementById("riskMoneyHelperBox");
const riskMoneyMacroText = document.getElementById("riskMoneyMacroText");
const copyRiskMoneyMacroBtn = document.getElementById("copyRiskMoneyMacroBtn");

function updateRiskMoneyHelperText() {
  if (!riskMoneyAccountBalance.value) {
    riskMoneyHelperBox.textContent = "Enter the account balance to begin.";
    return;
  }
  if (!riskMoneyMarket.value) {
    riskMoneyHelperBox.textContent = "Now choose a market.";
    return;
  }
  if (!riskMoneyInstrument.value) {
    riskMoneyHelperBox.textContent = "Now choose an instrument.";
    return;
  }
  if (!riskMoneyPosition.value) {
    riskMoneyHelperBox.textContent = "Choose buy or sell.";
    return;
  }
  if (!riskMoneyEntryPrice.value) {
    riskMoneyHelperBox.textContent = "Enter the entry price.";
    return;
  }
  if (!riskMoneyLotSize.value) {
    riskMoneyHelperBox.textContent = "Enter the lot size.";
    return;
  }
  if (!riskMoneyRisk.value) {
    riskMoneyHelperBox.textContent = "Enter the risk amount.";
    return;
  }
  if (!riskMoneyReward.value) {
    riskMoneyHelperBox.textContent = "Enter the reward amount.";
    return;
  }

  riskMoneyHelperBox.textContent = "Risk by Money & Lot inputs are ready.";
}

function updateRiskMoneyMacro() {
  const selectedInstrument = getInstrumentByName(riskMoneyInstrument.value);
  const selectedConversion = getConversionByInstrument(riskMoneyInstrument.value);

  if (!riskMoneyAccountBalance.value || !riskMoneyMarket.value || !riskMoneyInstrument.value || !riskMoneyPosition.value || !riskMoneyEntryPrice.value || !riskMoneyLotSize.value || !riskMoneyRisk.value || !riskMoneyReward.value) {
    riskMoneyMacroText.textContent = "Please complete the Risk by Money & Lot inputs to generate the explanation text.";
    return;
  }

  if (!selectedInstrument) {
    riskMoneyMacroText.textContent = "Instrument data is missing, so the explanation text cannot be generated yet.";
    return;
  }

  const entryPrice = Number(riskMoneyEntryPrice.value);
  const lotSize = Number(riskMoneyLotSize.value);
  const riskAmount = Number(riskMoneyRisk.value);
  const rewardAmount = Number(riskMoneyReward.value);
  const contractSize = Number(selectedInstrument.contractSize || 0);
  const conversionFactor = selectedConversion ? Number(selectedConversion.finalConversionFactor || 1) : 1;

  if (!entryPrice || !lotSize || !riskAmount || !rewardAmount || !contractSize || !conversionFactor) {
    riskMoneyMacroText.textContent = "Please complete the Risk by Money & Lot inputs to generate the explanation text.";
    return;
  }

  const priceRiskMove = riskAmount / (contractSize * lotSize * conversionFactor);
  const priceRewardMove = rewardAmount / (contractSize * lotSize * conversionFactor);

  let stopLoss = entryPrice;
  let takeProfit = entryPrice;

  if (riskMoneyPosition.value === "buy") {
    stopLoss = entryPrice - priceRiskMove;
    takeProfit = entryPrice + priceRewardMove;
  } else {
    stopLoss = entryPrice + priceRiskMove;
    takeProfit = entryPrice - priceRewardMove;
  }

  riskMoneyMacroText.textContent =
`If you wish to place a trade on ${riskMoneyInstrument.value}, and enter the trade at ${formatPlainNumber(entryPrice, 5)}, with a ${formatPosition(riskMoneyPosition.value)} position, with a lot size of ${formatPlainNumber(lotSize, 2)}, intending to risk ${formatMoney(riskAmount)}, and a reward of ${formatMoney(rewardAmount)}, then you have to place your Stop Loss (SL) at ${formatPlainNumber(stopLoss, 5)} and Take Profit (TP) at ${formatPlainNumber(takeProfit, 5)}.`;
}

function calculateRiskMoney() {
  updateRiskMoneyHelperText();

  const selectedInstrument = getInstrumentByName(riskMoneyInstrument.value);
  const selectedConversion = getConversionByInstrument(riskMoneyInstrument.value);

  riskMoneyStopLoss.textContent = "0.00";
  riskMoneyTakeProfit.textContent = "0.00";
  riskMoneyPipSize.textContent = "-";
  riskMoneyConversionFactor.textContent = "-";
  riskMoneyContractSize.textContent = "-";
  riskMoneySlPips.textContent = "-";
  riskMoneyTpPips.textContent = "-";

  if (!selectedInstrument || !riskMoneyPosition.value) {
    updateRiskMoneyMacro();
    return;
  }

  const entryPrice = Number(riskMoneyEntryPrice.value);
  const lotSize = Number(riskMoneyLotSize.value);
  const riskAmount = Number(riskMoneyRisk.value);
  const rewardAmount = Number(riskMoneyReward.value);

  if (!entryPrice || !lotSize || !riskAmount || !rewardAmount) {
    updateRiskMoneyMacro();
    return;
  }

  const pipSize = Number(selectedInstrument.pipSize || 0);
  const contractSize = Number(selectedInstrument.contractSize || 0);
  const conversionFactor = selectedConversion ? Number(selectedConversion.finalConversionFactor || 1) : 1;

  riskMoneyPipSize.textContent = pipSize;
  riskMoneyConversionFactor.textContent = conversionFactor;
  riskMoneyContractSize.textContent = contractSize;

  if (!pipSize || !contractSize || !conversionFactor) {
    updateRiskMoneyMacro();
    return;
  }

  const priceRiskMove = riskAmount / (contractSize * lotSize * conversionFactor);
  const priceRewardMove = rewardAmount / (contractSize * lotSize * conversionFactor);

  let stopLoss = entryPrice;
  let takeProfit = entryPrice;

  if (riskMoneyPosition.value === "buy") {
    stopLoss = entryPrice - priceRiskMove;
    takeProfit = entryPrice + priceRewardMove;
  } else {
    stopLoss = entryPrice + priceRiskMove;
    takeProfit = entryPrice - priceRewardMove;
  }

  const slPips = Math.abs(entryPrice - stopLoss) / pipSize;
  const tpPips = Math.abs(takeProfit - entryPrice) / pipSize;

  riskMoneyStopLoss.textContent = formatPlainNumber(stopLoss, 5);
  riskMoneyTakeProfit.textContent = formatPlainNumber(takeProfit, 5);
  riskMoneySlPips.textContent = formatPlainNumber(slPips, 2);
  riskMoneyTpPips.textContent = formatPlainNumber(tpPips, 2);

  updateRiskMoneyMacro();
}

function onRiskMoneyMarketChange() {
  populateInstrumentSelectByMarket(riskMoneyInstrument, riskMoneyMarket.value);
  riskMoneyInstrument.value = "";
  refreshAllSearchableSelects();
  calculateRiskMoney();
}

/* -----------------------------------
   RISK BY PERCENTAGE
----------------------------------- */
const riskPercentAccountBalance = document.getElementById("riskPercentAccountBalance");
const riskPercentMarket = document.getElementById("riskPercentMarket");
const riskPercentInstrument = document.getElementById("riskPercentInstrument");
const riskPercentPosition = document.getElementById("riskPercentPosition");
const riskPercentEntryPrice = document.getElementById("riskPercentEntryPrice");
const riskPercentRiskPercent = document.getElementById("riskPercentRiskPercent");
const riskPercentRewardPercent = document.getElementById("riskPercentRewardPercent");
const riskPercentSlPips = document.getElementById("riskPercentSlPips");

const riskPercentLotSize = document.getElementById("riskPercentLotSize");
const riskPercentStopLoss = document.getElementById("riskPercentStopLoss");
const riskPercentTakeProfit = document.getElementById("riskPercentTakeProfit");
const riskPercentRiskDollar = document.getElementById("riskPercentRiskDollar");
const riskPercentRewardDollar = document.getElementById("riskPercentRewardDollar");
const riskPercentPipSize = document.getElementById("riskPercentPipSize");
const riskPercentConversionFactor = document.getElementById("riskPercentConversionFactor");
const riskPercentContractSize = document.getElementById("riskPercentContractSize");
const riskPercentHelperBox = document.getElementById("riskPercentHelperBox");
const riskPercentMacroText = document.getElementById("riskPercentMacroText");
const copyRiskPercentMacroBtn = document.getElementById("copyRiskPercentMacroBtn");

function updateRiskPercentHelperText() {
  if (!riskPercentAccountBalance.value) {
    riskPercentHelperBox.textContent = "Enter the account balance to begin.";
    return;
  }
  if (!riskPercentMarket.value) {
    riskPercentHelperBox.textContent = "Now choose a market.";
    return;
  }
  if (!riskPercentInstrument.value) {
    riskPercentHelperBox.textContent = "Now choose an instrument.";
    return;
  }
  if (!riskPercentPosition.value) {
    riskPercentHelperBox.textContent = "Choose buy or sell.";
    return;
  }
  if (!riskPercentEntryPrice.value) {
    riskPercentHelperBox.textContent = "Enter the entry price.";
    return;
  }
  if (!riskPercentRiskPercent.value) {
    riskPercentHelperBox.textContent = "Enter the risk percentage.";
    return;
  }
  if (!riskPercentRewardPercent.value) {
    riskPercentHelperBox.textContent = "Enter the reward percentage.";
    return;
  }
  if (!riskPercentSlPips.value) {
    riskPercentHelperBox.textContent = "Enter the SL in pips or points.";
    return;
  }

  riskPercentHelperBox.textContent = "Risk by Percentage inputs are ready.";
}

function updateRiskPercentMacro() {
  const selectedInstrument = getInstrumentByName(riskPercentInstrument.value);
  const selectedConversion = getConversionByInstrument(riskPercentInstrument.value);

  if (!riskPercentAccountBalance.value || !riskPercentMarket.value || !riskPercentInstrument.value || !riskPercentPosition.value || !riskPercentEntryPrice.value || !riskPercentRiskPercent.value || !riskPercentRewardPercent.value || !riskPercentSlPips.value) {
    riskPercentMacroText.textContent = "Please complete the Risk by Percentage inputs to generate the explanation text.";
    return;
  }

  if (!selectedInstrument) {
    riskPercentMacroText.textContent = "Instrument data is missing, so the explanation text cannot be generated yet.";
    return;
  }

  const accountBalance = Number(riskPercentAccountBalance.value);
  const entryPrice = Number(riskPercentEntryPrice.value);
  const riskPercentValue = Number(riskPercentRiskPercent.value);
  const rewardPercentValue = Number(riskPercentRewardPercent.value);
  const slPipsValue = Number(riskPercentSlPips.value);
  const pipSize = Number(selectedInstrument.pipSize || 0);
  const contractSize = Number(selectedInstrument.contractSize || 0);
  const conversionFactor = selectedConversion ? Number(selectedConversion.finalConversionFactor || 1) : 1;

  if (!accountBalance || !entryPrice || !riskPercentValue || !rewardPercentValue || !slPipsValue || !pipSize || !contractSize || !conversionFactor) {
    riskPercentMacroText.textContent = "Please complete the Risk by Percentage inputs to generate the explanation text.";
    return;
  }

  const riskDollar = accountBalance * (riskPercentValue / 100);
  const rewardDollar = accountBalance * (rewardPercentValue / 100);
  const lotSize = Math.abs(riskDollar / (conversionFactor * contractSize * pipSize * slPipsValue));

  let stopLoss = entryPrice;
  let takeProfit = entryPrice;

  if (riskPercentPosition.value === "buy") {
    stopLoss = entryPrice - (slPipsValue * pipSize);
    takeProfit = entryPrice + (rewardDollar / (conversionFactor * contractSize * lotSize));
  } else {
    stopLoss = entryPrice + (slPipsValue * pipSize);
    takeProfit = entryPrice - (rewardDollar / (conversionFactor * contractSize * lotSize));
  }

  riskPercentMacroText.textContent =
`If you wish to place a trade on ${riskPercentInstrument.value}, and enter the trade at ${formatPlainNumber(entryPrice, 5)}, with a ${formatPosition(riskPercentPosition.value)} position, on your account size of ${formatMoney(accountBalance)}, willing to risk ${formatMacroPercent(riskPercentValue)}, and aiming for a reward of ${formatMacroPercent(rewardPercentValue)}, and decide to set your Stop Loss (SL) at a distance of ${formatPlainNumber(slPipsValue, 2)} pips, then the appropriate lot size for that position should be ${formatPlainNumber(lotSize, 2)} lots. Additionally, you have to set your Stop Loss (SL) at ${formatPlainNumber(stopLoss, 5)} and Take Profit (TP) at ${formatPlainNumber(takeProfit, 5)}.`;
}

function calculateRiskPercent() {
  updateRiskPercentHelperText();

  const selectedInstrument = getInstrumentByName(riskPercentInstrument.value);
  const selectedConversion = getConversionByInstrument(riskPercentInstrument.value);

  riskPercentLotSize.textContent = "0.00";
  riskPercentStopLoss.textContent = "0.00";
  riskPercentTakeProfit.textContent = "0.00";
  riskPercentRiskDollar.textContent = "-";
  riskPercentRewardDollar.textContent = "-";
  riskPercentPipSize.textContent = "-";
  riskPercentConversionFactor.textContent = "-";
  riskPercentContractSize.textContent = "-";

  if (!selectedInstrument || !riskPercentPosition.value) {
    updateRiskPercentMacro();
    return;
  }

  const accountBalance = Number(riskPercentAccountBalance.value);
  const entryPrice = Number(riskPercentEntryPrice.value);
  const riskPercentValue = Number(riskPercentRiskPercent.value);
  const rewardPercentValue = Number(riskPercentRewardPercent.value);
  const slPipsValue = Number(riskPercentSlPips.value);

  if (!accountBalance || !entryPrice || !riskPercentValue || !rewardPercentValue || !slPipsValue) {
    updateRiskPercentMacro();
    return;
  }

  const pipSize = Number(selectedInstrument.pipSize || 0);
  const contractSize = Number(selectedInstrument.contractSize || 0);
  const conversionFactor = selectedConversion ? Number(selectedConversion.finalConversionFactor || 1) : 1;

  riskPercentPipSize.textContent = pipSize;
  riskPercentConversionFactor.textContent = conversionFactor;
  riskPercentContractSize.textContent = contractSize;

  if (!pipSize || !contractSize || !conversionFactor) {
    updateRiskPercentMacro();
    return;
  }

  const riskDollar = accountBalance * (riskPercentValue / 100);
  const rewardDollar = accountBalance * (rewardPercentValue / 100);

  const lotSize = Math.abs(
    riskDollar / (conversionFactor * contractSize * pipSize * slPipsValue)
  );

  let stopLoss = entryPrice;
  let takeProfit = entryPrice;

  if (riskPercentPosition.value === "buy") {
    stopLoss = entryPrice - (slPipsValue * pipSize);
    takeProfit = entryPrice + (rewardDollar / (conversionFactor * contractSize * lotSize));
  } else {
    stopLoss = entryPrice + (slPipsValue * pipSize);
    takeProfit = entryPrice - (rewardDollar / (conversionFactor * contractSize * lotSize));
  }

  riskPercentLotSize.textContent = formatPlainNumber(lotSize, 2);
  riskPercentStopLoss.textContent = formatPlainNumber(stopLoss, 5);
  riskPercentTakeProfit.textContent = formatPlainNumber(takeProfit, 5);
  riskPercentRiskDollar.textContent = formatMoney(riskDollar);
  riskPercentRewardDollar.textContent = formatMoney(rewardDollar);

  updateRiskPercentMacro();
}

function onRiskPercentMarketChange() {
  populateInstrumentSelectByMarket(riskPercentInstrument, riskPercentMarket.value);
  riskPercentInstrument.value = "";
  refreshAllSearchableSelects();
  calculateRiskPercent();
}

/* -----------------------------------
   COPY BUTTONS
----------------------------------- */
setupCopyButton(copyMarginMacroBtn, marginMacroText, "Copy Macro");
setupCopyButton(copyPnlMacroBtn, pnlMacroText, "Copy Macro");
setupCopyButton(copyPipMacroBtn, pipMacroText, "Copy Macro");
setupCopyButton(copyMaxlotMacroBtn, maxlotMacroText, "Copy Macro");
setupCopyButton(copyRiskMoneyMacroBtn, riskMoneyMacroText, "Copy Macro");
setupCopyButton(copyRiskPercentMacroBtn, riskPercentMacroText, "Copy Macro");

/* -----------------------------------
   INIT
----------------------------------- */
function initializeApp() {
  initializeSearchableSelects();
  showSection("pnl");

  updateVisibility();
  populateInstrumentSelectByMarket(instrument, market.value);
  populateModel();
  calculateMargin();

  calculatePnl();
  calculatePipPrice();

  updateMaxlotVisibility();
  populateInstrumentSelectByMarket(maxlotInstrument, maxlotMarket.value);
  populateMaxlotModel();
  calculateMaxlot();

  calculateRiskMoney();
  calculateRiskPercent();

  market.addEventListener("change", onMarginMarketChange);
  instrument.addEventListener("change", calculateMargin);
  model.addEventListener("change", calculateMargin);
  price.addEventListener("input", calculateMargin);
  lot.addEventListener("input", calculateMargin);
  manualCheck.addEventListener("change", onManualToggleChange);
  manualInput.addEventListener("input", calculateMargin);

  pnlMarket.addEventListener("change", onPnlMarketChange);
  pnlInstrument.addEventListener("change", calculatePnl);
  pnlPosition.addEventListener("change", calculatePnl);
  pnlOpenPrice.addEventListener("input", calculatePnl);
  pnlClosePrice.addEventListener("input", calculatePnl);
  pnlLotSize.addEventListener("input", calculatePnl);

  pipMarket.addEventListener("change", onPipMarketChange);
  pipInstrument.addEventListener("change", calculatePipPrice);
  pipOpenPrice.addEventListener("input", calculatePipPrice);
  pipAction.addEventListener("change", calculatePipPrice);
  pipAmount.addEventListener("input", calculatePipPrice);

  maxlotMarket.addEventListener("change", onMaxlotMarketChange);
  maxlotInstrument.addEventListener("change", calculateMaxlot);
  maxlotModel.addEventListener("change", calculateMaxlot);
  maxlotAccountSize.addEventListener("input", calculateMaxlot);
  maxlotPrice.addEventListener("input", calculateMaxlot);
  maxlotUseManualLeverage.addEventListener("change", onMaxlotManualToggleChange);
  maxlotManualLeverage.addEventListener("input", calculateMaxlot);

  riskMoneyAccountBalance.addEventListener("input", calculateRiskMoney);
  riskMoneyMarket.addEventListener("change", onRiskMoneyMarketChange);
  riskMoneyInstrument.addEventListener("change", calculateRiskMoney);
  riskMoneyPosition.addEventListener("change", calculateRiskMoney);
  riskMoneyEntryPrice.addEventListener("input", calculateRiskMoney);
  riskMoneyLotSize.addEventListener("input", calculateRiskMoney);
  riskMoneyRisk.addEventListener("input", calculateRiskMoney);
  riskMoneyReward.addEventListener("input", calculateRiskMoney);

  riskPercentAccountBalance.addEventListener("input", calculateRiskPercent);
  riskPercentMarket.addEventListener("change", onRiskPercentMarketChange);
  riskPercentInstrument.addEventListener("change", calculateRiskPercent);
  riskPercentPosition.addEventListener("change", calculateRiskPercent);
  riskPercentEntryPrice.addEventListener("input", calculateRiskPercent);
  riskPercentRiskPercent.addEventListener("input", calculateRiskPercent);
  riskPercentRewardPercent.addEventListener("input", calculateRiskPercent);
  riskPercentSlPips.addEventListener("input", calculateRiskPercent);
}

initializeApp();
