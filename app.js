/**
 * Farmers Consensus - Application Controller
 * Handles form validation, dynamic hierarchy dropdowns, live estimates, Chart.js, and CSV exporting
 */

// Application State Namespace
const app = {
  // Application Data
  registrations: [],
  selectedVegetableId: "",
  theme: "dark",
  charts: {
    cropShare: null,
    provinceIntensity: null,
    timeline: null
  },

  // Initialize Application
  init() {
    this.loadState();
    this.initLucide();
    this.initTheme();
    this.initTabs();
    this.initGeographicDropdowns();
    this.renderVegetableChips();
    this.initCalculatorListeners();
    this.initFormValidation();
    this.initTableFilters();
    this.initExportCSV();
    
    // User Authentication
    this.initAuth();
    
    // Blockchain Integration
    this.checkBlockchainStatus();
    this.initBuyerRegistration();

    // NCH Live Price Ticker
    this.initNCHPriceTicker();

    // Hydrate from database (overrides/merges with localStorage)
    this.hydrateFromDatabase();
    
    // Mobile Enhancements
    this.initMobileEnhancements();
    this.initPWAFeatures();
    this.optimizeMobilePerformance();
    this.initMobileErrorHandling();
    
    // Draw Stats and Charts
    this.updateDashboardMetrics();
    this.initCharts();
    this.renderLedgerTable();
    this.populateFilterDropdowns();

    // Set Default Planting Date (Today + 1 week)
    const today = new Date();
    today.setDate(today.getDate() + 7);
    document.getElementById("planting-date").value = today.toISOString().split("T")[0];
  },

  // ─── NCH Live Price Ticker ───────────────────────────────────────────────
  async initNCHPriceTicker() {
    // Previous prices for change calculation
    this._prevPrices = {};
    await this.fetchAndDisplayNCHPrices();
    // Refresh every 60 seconds
    setInterval(() => this.fetchAndDisplayNCHPrices(), 60000);
  },

  async fetchAndDisplayNCHPrices() {
    try {
      const res = await fetch('/api/tokens/prices');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !data.prices) return;

      const prices = data.prices;
      const fmt = {
        USD: { symbol: '$', decimals: 4 },
        PHP: { symbol: '₱', decimals: 2 },
        EUR: { symbol: '€', decimals: 4 }
      };

      Object.entries(fmt).forEach(([currency, { symbol, decimals }]) => {
        const val = prices[currency];
        if (val == null) return;

        const valEl   = document.getElementById(`nch-price-${currency.toLowerCase()}`);
        const chgEl   = document.getElementById(`nch-change-${currency.toLowerCase()}`);
        if (!valEl || !chgEl) return;

        valEl.textContent = `${symbol}${val.toFixed(decimals)}`;

        // Calculate % change from previous fetch
        const prev = this._prevPrices[currency];
        if (prev != null && prev !== 0) {
          const pct = ((val - prev) / prev) * 100;
          const sign = pct >= 0 ? '+' : '';
          chgEl.textContent = `${sign}${pct.toFixed(2)}%`;
          chgEl.className = `ticker-change ${pct >= 0 ? 'positive' : 'negative'}`;
        }

        this._prevPrices[currency] = val;
      });

      this.initLucide();
    } catch (e) {
      console.warn('NCH price fetch error:', e.message);
    }
  },

  // ─── DB Hydration: Fetch persistent records from server ──────────────────
  async hydrateFromDatabase() {
    try {
      const res = await fetch('/api/farmers/registrations');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !data.registrations || data.registrations.length === 0) return;

      // Convert date fields to strings (may arrive as Date objects)
      const dbRecords = data.registrations.map(r => ({
        ...r,
        plantingDate: r.plantingDate ? String(r.plantingDate).substring(0, 10) : '',
        harvestDate:  r.harvestDate  ? String(r.harvestDate).substring(0, 10)  : '',
        areaSqm:         parseFloat(r.areaSqm) || 0,
        areaHa:          parseFloat(r.areaHa)  || 0,
        expectedYieldTons: parseFloat(r.expectedYieldTons) || 0,
      }));

      // Merge: DB is the source of truth; only add local records not yet in DB
      const dbIds = new Set(dbRecords.map(r => r.id));
      const localOnly = this.registrations.filter(r => !dbIds.has(r.id));
      this.registrations = [...dbRecords, ...localOnly];

      // Persist merged list to localStorage
      localStorage.setItem("farmers_consensus_data", JSON.stringify(this.registrations));

      // Re-render UI with full dataset
      this.updateDashboardMetrics();
      if (this.charts.cropShare) {
        this.updateCharts();
      }
      this.renderLedgerTable();
      this.populateFilterDropdowns();
      console.log(`✅ Hydrated ${dbRecords.length} registrations from database`);
    } catch (e) {
      console.warn('DB hydration error:', e.message);
    }
  },

  // Load state from local storage or data.js
  loadState() {
    const saved = localStorage.getItem("farmers_consensus_data");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Check if saved data is the old mock data by checking for specific mock IDs
        if (parsed.some(reg => reg.id && reg.id.startsWith('FC-2026-000'))) {
          console.log("Detected old mock data, clearing...");
          localStorage.removeItem("farmers_consensus_data");
          this.registrations = [];
        } else {
          this.registrations = parsed;
        }
      } catch (e) {
        console.error("Failed to parse saved registrations, resetting.", e);
        localStorage.removeItem("farmers_consensus_data");
        this.registrations = [];
      }
    } else {
      this.registrations = [];
    }
  },

  // Trigger Lucide Icons Rendering
  initLucide() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  // Setup Light/Dark Mode
  initTheme() {
    const savedTheme = localStorage.getItem("farmers_consensus_theme");
    const systemTheme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    this.theme = savedTheme || systemTheme;
    
    document.documentElement.setAttribute("data-theme", this.theme);
    this.updateThemeButton();

    document.getElementById("theme-toggle").addEventListener("click", () => {
      this.theme = this.theme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", this.theme);
      localStorage.setItem("farmers_consensus_theme", this.theme);
      this.updateThemeButton();
      
      // Force repaint of Chart.js to adapt to new theme colors
      this.updateCharts();
    });
  },

  updateThemeButton() {
    const themeBtn = document.getElementById("theme-toggle");
    if (this.theme === "light") {
      themeBtn.innerHTML = '<i data-lucide="moon"></i>';
    } else {
      themeBtn.innerHTML = '<i data-lucide="sun"></i>';
    }
    this.initLucide();
  },

  // Switch between tabs
  initTabs() {
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabPanels = document.querySelectorAll(".tab-panel");

    tabButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const tabId = btn.getAttribute("data-tab");
        
        tabButtons.forEach(b => b.classList.remove("active"));
        tabPanels.forEach(p => p.classList.remove("active"));

        btn.classList.add("active");
        const panel = document.getElementById(tabId);
        panel.classList.add("active");
        
        // Add CSS entrance animations class
        panel.classList.add("animate-fade-in");
        setTimeout(() => panel.classList.remove("animate-fade-in"), 500);

        // Update charts inside analytics tab
        if (tabId === "analytics-tab") {
          setTimeout(() => {
            this.updateCharts();
          }, 50);
        }
        
        // Load dashboard data when user dashboard tab is opened
        if (tabId === "user-dashboard-tab") {
          this.loadDashboardActivity();
          this.loadDashboardRewards();
          this.loadTokenHistoryChart();
        }
      });
    });
  },

  // Navigate to Dashboard Details (Shortcut Link)
  showDashboardDetails() {
    const dashboardBtn = document.querySelector('[data-tab="analytics-tab"]');
    if (dashboardBtn) {
      dashboardBtn.click();
      
      // Smooth scroll to charts row
      setTimeout(() => {
        const chartsRow = document.querySelector(".dashboard-charts-row");
        if (chartsRow) {
          chartsRow.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  },

  async fetchGeoJson(url) {
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || `Failed to load ${url}`);
    }
    return json.data;
  },

  fillSelectOptions(selectEl, placeholder, items, getValue, getLabel, extraDataset) {
    selectEl.innerHTML = `<option value="">${placeholder}</option>`;
    items.forEach((item) => {
      const option = document.createElement("option");
      option.value = getValue(item);
      option.textContent = getLabel(item);
      if (extraDataset) extraDataset(option, item);
      selectEl.appendChild(option);
    });
  },

  async loadAllProvincesIntoSelect(selectEl, placeholder = "-- Choose Province --") {
    if (!selectEl) return;
    selectEl.disabled = true;
    selectEl.innerHTML = `<option value="">Loading provinces...</option>`;
    const provinces = await this.fetchGeoJson("/api/geo/provinces");
    this.fillSelectOptions(
      selectEl,
      placeholder,
      provinces,
      (p) => p.name,
      (p) => p.name,
      (opt, p) => {
        opt.dataset.regCode = p.regCode;
        opt.dataset.provCode = p.provCode;
      }
    );
    selectEl.disabled = false;
    return provinces;
  },

  resetBarangayDropdown(barangaySelect, customRow, customInput) {
    barangaySelect.innerHTML = '<option value="">-- Select Barangay --</option>';
    barangaySelect.disabled = true;
    customRow.classList.add("hidden");
    customInput.value = "";
    customInput.required = false;
    customInput.closest(".form-group")?.classList.remove("invalid");
  },

  // Dynamic Geographic Dropdown logic: Province -> Municipality -> Barangay (full PSGC via API)
  async initGeographicDropdowns() {
    const provinceSelect = document.getElementById("select-province");
    const municipalitySelect = document.getElementById("select-municipality");
    const barangaySelect = document.getElementById("select-barangay");
    const customRow = document.getElementById("custom-barangay-row");
    const customInput = document.getElementById("custom-barangay");

    if (!provinceSelect || !municipalitySelect || !barangaySelect) return;

    try {
      const provinces = await this.loadAllProvincesIntoSelect(provinceSelect, "-- Choose Province --");
      console.log("PSGC provinces loaded:", provinces.length);
    } catch (err) {
      console.error("Failed to load provinces:", err);
      provinceSelect.innerHTML = '<option value="">Unable to load provinces</option>';
      return;
    }

    const buyerProvince = document.getElementById("buyer-province");
    if (buyerProvince && buyerProvince.options.length <= 1) {
      this.loadAllProvincesIntoSelect(buyerProvince, "Select Province").catch((e) =>
        console.error("Buyer province load failed:", e)
      );
    }

    provinceSelect.addEventListener("change", async () => {
      const selected = provinceSelect.selectedOptions[0];

      municipalitySelect.innerHTML = '<option value="">-- Select Municipality --</option>';
      municipalitySelect.disabled = true;
      this.resetBarangayDropdown(barangaySelect, customRow, customInput);
      provinceSelect.closest(".form-group")?.classList.remove("invalid");

      if (!selected?.dataset.regCode) {
        this.updateEstimator();
        return;
      }

      municipalitySelect.innerHTML = '<option value="">Loading cities/municipalities...</option>';
      try {
        const { regCode, provCode } = selected.dataset;
        const municipalities = await this.fetchGeoJson(
          `/api/geo/municipalities?regCode=${encodeURIComponent(regCode)}&provCode=${encodeURIComponent(provCode)}`
        );
        this.fillSelectOptions(
          municipalitySelect,
          "-- Select Municipality --",
          municipalities,
          (m) => m.name,
          (m) => m.name,
          (opt, m) => {
            opt.dataset.munCityCode = m.munCityCode;
          }
        );
        municipalitySelect.disabled = false;
      } catch (err) {
        console.error("Failed to load municipalities:", err);
        municipalitySelect.innerHTML = '<option value="">Unable to load municipalities</option>';
      }
      this.updateEstimator();
    });

    municipalitySelect.addEventListener("change", async () => {
      const selectedMun = municipalitySelect.selectedOptions[0];

      this.resetBarangayDropdown(barangaySelect, customRow, customInput);
      municipalitySelect.closest(".form-group")?.classList.remove("invalid");

      if (!selectedMun?.dataset.munCityCode) {
        this.updateEstimator();
        return;
      }

      barangaySelect.innerHTML = '<option value="">Loading barangays...</option>';
      try {
        const barangays = await this.fetchGeoJson(
          `/api/geo/barangays?munCityCode=${encodeURIComponent(selectedMun.dataset.munCityCode)}`
        );
        this.fillSelectOptions(
          barangaySelect,
          "-- Select Barangay --",
          barangays.map((name) => ({ name })),
          (b) => b.name,
          (b) => b.name
        );
        const otherOption = document.createElement("option");
        otherOption.value = "other";
        otherOption.textContent = "✍️ Other Barangay (Type Name...)";
        barangaySelect.appendChild(otherOption);
        barangaySelect.disabled = false;
      } catch (err) {
        console.error("Failed to load barangays:", err);
        barangaySelect.innerHTML = '<option value="">Unable to load barangays</option>';
      }
      this.updateEstimator();
    });

    // Handle Barangay Selection
    barangaySelect.addEventListener("change", (e) => {
      barangaySelect.closest(".form-group")?.classList.remove("invalid");
      
      if (e.target.value === "other") {
        customRow.classList.remove("hidden");
        customInput.focus();
        customInput.required = true;
      } else {
        customRow.classList.add("hidden");
        customInput.value = "";
        customInput.required = false;
        customInput.closest(".form-group")?.classList.remove("invalid");
      }
      this.updateEstimator();
    });
  },

  getVegetableSectionEl() {
    return document.getElementById("vegetable-crop-section");
  },

  clearVegetableSectionInvalid() {
    const section = this.getVegetableSectionEl();
    if (section) section.classList.remove("invalid");
  },

  // Desktop chips + mobile plain text list
  renderVegetableChips() {
    const grid = document.getElementById("vegetables-grid");
    const mobileList = document.getElementById("vegetable-list-mobile");
    if (grid) grid.innerHTML = "";
    if (mobileList) mobileList.innerHTML = "";

    window.VEGETABLES.forEach((veg) => {
      if (grid) {
        const chip = document.createElement("div");
        chip.className = "veg-chip";
        chip.setAttribute("data-veg-id", veg.id);
        chip.style.setProperty("--chip-color", veg.color);
        chip.innerHTML = `
          <div class="veg-name">${veg.name}</div>
          <div class="veg-tag">${veg.tag}</div>
        `;
        chip.addEventListener("click", () => this.selectVegetableChip(veg.id));
        grid.appendChild(chip);
      }

      if (mobileList) {
        const item = document.createElement("li");
        item.setAttribute("data-veg-id", veg.id);
        item.setAttribute("role", "option");
        item.innerHTML = `${veg.name}<span class="veg-list-tag">${veg.tag}</span>`;
        item.addEventListener("click", () => this.selectVegetableChip(veg.id));
        mobileList.appendChild(item);
      }
    });
  },

  selectVegetableChip(vegId) {
    if (!vegId) return;

    document.querySelectorAll(".veg-chip").forEach((c) => c.classList.remove("selected"));
    const targetChip = document.querySelector(`.veg-chip[data-veg-id="${vegId}"]`);
    if (targetChip) targetChip.classList.add("selected");

    document.querySelectorAll("#vegetable-list-mobile li").forEach((li) => {
      li.classList.toggle("selected", li.getAttribute("data-veg-id") === vegId);
    });

    this.selectedVegetableId = vegId;
    document.getElementById("selected-vegetable-id").value = vegId;
    this.clearVegetableSectionInvalid();

    const customVegetableRow = document.getElementById("custom-vegetable-row");
    const customVegetableInput = document.getElementById("custom-vegetable-name");

    if (vegId === "other") {
      customVegetableRow.classList.remove("hidden");
      customVegetableInput.required = true;
      customVegetableInput.focus();
    } else {
      customVegetableRow.classList.add("hidden");
      customVegetableInput.required = false;
      customVegetableInput.value = "";
      customVegetableInput.parentElement.classList.remove("invalid");
    }

    this.updateEstimator();
  },

  // Live Estimator Listener hooks
  initCalculatorListeners() {
    const landAreaInput = document.getElementById("land-area");
    const unitSelect = document.getElementById("area-unit");
    const plantingDateInput = document.getElementById("planting-date");

    landAreaInput.addEventListener("input", () => {
      landAreaInput.closest(".form-group")?.classList.remove("invalid");
      this.updateEstimator();
    });

    unitSelect.addEventListener("change", () => {
      this.updateEstimator();
    });

    plantingDateInput.addEventListener("change", () => {
      plantingDateInput.closest(".form-group")?.classList.remove("invalid");
      this.updateEstimator();
    });
  },

  // Process and update agricultural estimates in real time
  updateEstimator() {
    const landAreaVal = parseFloat(document.getElementById("land-area").value);
    const unit = document.getElementById("area-unit").value;
    const plantingDateStr = document.getElementById("planting-date").value;
    
    const placeholder = document.getElementById("calc-placeholder");
    const details = document.getElementById("calc-details");
    
    const haValEl = document.getElementById("calc-ha-val");
    const yieldValEl = document.getElementById("calc-yield-val");
    const harvestValEl = document.getElementById("calc-harvest-val");

    // Check if conditions for math are met
    if (!this.selectedVegetableId || isNaN(landAreaVal) || landAreaVal <= 0 || !plantingDateStr) {
      placeholder.classList.remove("hidden");
      details.classList.add("hidden");
      return;
    }

    // Math Engine
    const vegetable = window.VEGETABLES.find(v => v.id === this.selectedVegetableId);
    let areaHa = landAreaVal;
    if (unit === "sqm") {
      areaHa = landAreaVal / 10000;
    }

    const estimatedYieldTons = areaHa * vegetable.yieldPerHa;
    
    // Calculate Harvest Date
    const plantingDate = new Date(plantingDateStr);
    const harvestDate = new Date(plantingDate);
    harvestDate.setDate(plantingDate.getDate() + vegetable.maturationDays);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const harvestMonthStr = `${monthNames[harvestDate.getMonth()]} ${harvestDate.getFullYear()}`;

    // Update UI elements
    placeholder.classList.add("hidden");
    details.classList.remove("hidden");

    haValEl.textContent = `${areaHa.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha`;
    yieldValEl.textContent = `${estimatedYieldTons.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Tons`;
    harvestValEl.textContent = harvestMonthStr;
  },

  // Core Form Validation and Submissions
  initFormValidation() {
    const form = document.getElementById("consensus-form");
    
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      
      let isValid = true;
      
      const nameInput = document.getElementById("farmer-name");
      const contactInput = document.getElementById("farmer-contact");
      const provinceSelect = document.getElementById("select-province");
      const municipalitySelect = document.getElementById("select-municipality");
      const barangaySelect = document.getElementById("select-barangay");
      const landAreaInput = document.getElementById("land-area");
      const plantingDateInput = document.getElementById("planting-date");

      // Validate Farmer Name
      if (!nameInput.value.trim()) {
        nameInput.closest(".form-group")?.classList.add("invalid");
        isValid = false;
      } else {
        nameInput.closest(".form-group")?.classList.remove("invalid");
      }

      // Validate Contact (11-digit mobile starting with 09)
      const contactRegex = /^09\d{9}$/;
      if (!contactRegex.test(contactInput.value.trim())) {
        contactInput.closest(".form-group")?.classList.add("invalid");
        isValid = false;
      } else {
        contactInput.closest(".form-group")?.classList.remove("invalid");
      }

      // Validate Geographical drop-downs
      if (!provinceSelect.value) {
        provinceSelect.closest(".form-group")?.classList.add("invalid");
        isValid = false;
      } else {
        provinceSelect.closest(".form-group")?.classList.remove("invalid");
      }

      if (!municipalitySelect.value) {
        municipalitySelect.closest(".form-group")?.classList.add("invalid");
        isValid = false;
      } else {
        municipalitySelect.closest(".form-group")?.classList.remove("invalid");
      }

      // Validate Barangay select box & custom input fallback
      if (!barangaySelect.value) {
        barangaySelect.closest(".form-group")?.classList.add("invalid");
        isValid = false;
      } else if (barangaySelect.value === "other") {
        barangaySelect.closest(".form-group")?.classList.remove("invalid");
        const customInput = document.getElementById("custom-barangay");
        if (!customInput.value.trim()) {
          customInput.closest(".form-group")?.classList.add("invalid");
          isValid = false;
        } else {
          customInput.closest(".form-group")?.classList.remove("invalid");
        }
      } else {
        barangaySelect.closest(".form-group")?.classList.remove("invalid");
        document.getElementById("custom-barangay")?.closest(".form-group")?.classList.remove("invalid");
      }

      // Validate selected crop
      if (!this.selectedVegetableId) {
        const vegSection = this.getVegetableSectionEl();
        if (vegSection) vegSection.classList.add("invalid");
        isValid = false;
      } else {
        this.clearVegetableSectionInvalid();
        
        // Validate custom vegetable name if "other" is selected
        if (this.selectedVegetableId === "other") {
          const customVegetableInput = document.getElementById("custom-vegetable-name");
          if (!customVegetableInput.value.trim()) {
            customVegetableInput.parentElement.classList.add("invalid");
            isValid = false;
          } else {
            customVegetableInput.parentElement.classList.remove("invalid");
          }
        }
      }

      // Validate Land Area
      const areaVal = parseFloat(landAreaInput.value);
      if (isNaN(areaVal) || areaVal <= 0) {
        landAreaInput.closest(".form-group")?.classList.add("invalid");
        isValid = false;
      } else {
        landAreaInput.closest(".form-group")?.classList.remove("invalid");
      }

      // Validate Planting Date
      if (!plantingDateInput.value) {
        plantingDateInput.closest(".form-group")?.classList.add("invalid");
        isValid = false;
      } else {
        plantingDateInput.closest(".form-group")?.classList.remove("invalid");
      }

      // If invalid, bounce back and focus on first invalid item
      if (!isValid) {
        const firstInvalid = document.querySelector(".invalid");
        if (firstInvalid) {
          firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }

      // Form is fully validated: Proceed to record registry!
      const vegetable = window.VEGETABLES.find(v => v.id === this.selectedVegetableId);
      const unit = document.getElementById("area-unit").value;
      const areaValNum = parseFloat(landAreaInput.value);
      
      let areaHa = areaValNum;
      let areaSqm = areaValNum * 10000;
      if (unit === "sqm") {
        areaHa = areaValNum / 10000;
        areaSqm = areaValNum;
      }

      const expectedYieldTons = areaHa * vegetable.yieldPerHa;

      // Yield Harvest target timing
      const pDate = new Date(plantingDateInput.value);
      const hDate = new Date(pDate);
      hDate.setDate(pDate.getDate() + vegetable.maturationDays);

      const registryId = `FC-2026-${(this.registrations.length + 1).toString().padStart(4, "0")}`;
      const resolvedBrgy = barangaySelect.value === "other" ? document.getElementById("custom-barangay").value.trim() : barangaySelect.value;
      
      // Handle custom vegetable name
      let vegetableName = vegetable.name;
      if (this.selectedVegetableId === "other") {
        vegetableName = document.getElementById("custom-vegetable-name").value.trim();
      }

      const newRegistration = {
        id: registryId,
        farmerName: nameInput.value.trim(),
        contact: contactInput.value.trim(),
        province: provinceSelect.value,
        municipality: municipalitySelect.value,
        barangay: resolvedBrgy,
        vegetableId: this.selectedVegetableId,
        vegetableName: vegetableName, // Include custom name if applicable
        areaSqm: areaSqm,
        areaHa: areaHa,
        expectedYieldTons: Math.round(expectedYieldTons * 100) / 100,
        plantingDate: plantingDateInput.value,
        harvestDate: hDate.toISOString().split("T")[0],
        timestamp: new Date().toISOString(),
        verificationStatus: 'Pending'
      };

      // Save registry details to state
      this.registrations.unshift(newRegistration);
      localStorage.setItem("farmers_consensus_data", JSON.stringify(this.registrations));

      // Blockchain Integration: Record on Cheese Blockchain
      this.recordOnBlockchain(newRegistration);

      // Trigger Receipts display inside modal overlay
      document.getElementById("receipt-id").textContent = registryId;
      document.getElementById("receipt-name").textContent = nameInput.value.trim();
      document.getElementById("receipt-location").textContent = `${resolvedBrgy}, ${municipalitySelect.value}, ${provinceSelect.value}`;
      document.getElementById("receipt-vegetable").textContent = `${vegetable.emoji} ${vegetable.name} (${vegetable.tag})`;
      document.getElementById("receipt-area").textContent = `${areaHa.toLocaleString("en-US", { minimumFractionDigits: 2 })} Hectares (${areaSqm.toLocaleString("en-US")} sqm)`;
      document.getElementById("receipt-yield").textContent = `${newRegistration.expectedYieldTons.toLocaleString("en-US")} Tons`;

      // Show overlay popup
      const modal = document.getElementById("success-modal");
      modal.classList.remove("hidden");
      modal.classList.add("animate-fade-in");

      // Reset form variables
      form.reset();
      this.selectedVegetableId = "";
      document.getElementById("selected-vegetable-id").value = "";
      
      document.querySelectorAll(".veg-chip").forEach((c) => c.classList.remove("selected"));
      document.querySelectorAll("#vegetable-list-mobile li").forEach((li) => li.classList.remove("selected"));

      // Set default planting date again (Today + 1 week)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      plantingDateInput.value = futureDate.toISOString().split("T")[0];

      // Reset dropdown hierarchy
      municipalitySelect.innerHTML = '<option value="">-- Select Municipality --</option>';
      municipalitySelect.disabled = true;
      barangaySelect.innerHTML = '<option value="">-- Select Barangay --</option>';
      barangaySelect.disabled = true;
      
      // Reset custom input text toggles
      document.getElementById("custom-barangay-row").classList.add("hidden");
      document.getElementById("custom-barangay").value = "";

      this.updateEstimator();

      // Recalculate metrics and refresh tables/graphs
      this.updateDashboardMetrics();
      this.renderLedgerTable();
      this.populateFilterDropdowns();
      
      this.initLucide();
    });

    // Handle close overlay popup and redirect to analytics
    document.getElementById("close-modal-btn").addEventListener("click", () => {
      const modal = document.getElementById("success-modal");
      modal.classList.add("hidden");
      this.showDashboardDetails();
    });
  },

  // Recalculate dashboard statistics values
  updateDashboardMetrics() {
    const totalFarmers = this.registrations.length;
    
    let totalAreaHa = 0;
    let totalYieldTons = 0;
    const uniqueProvinces = new Set();

    this.registrations.forEach(r => {
      totalAreaHa += r.areaHa;
      totalYieldTons += r.expectedYieldTons;
      uniqueProvinces.add(r.province);
    });

    // Format numbers beautifully
    const formattedArea = totalAreaHa.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " ha";
    const formattedYield = totalYieldTons.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " Tons";

    // Update Hero Stats Bar
    document.getElementById("hero-stat-farmers").textContent = totalFarmers.toLocaleString();
    document.getElementById("hero-stat-area").textContent = formattedArea;

    // Update Dashboard Metrics row
    document.getElementById("metric-farmers").textContent = totalFarmers.toLocaleString();
    document.getElementById("metric-area").textContent = formattedArea;
    document.getElementById("metric-yield").textContent = formattedYield;
    document.getElementById("metric-provinces").textContent = uniqueProvinces.size.toString();
  },

  // Setup dynamic Chart.js configurations
  initCharts() {
    // 1. CROP SHARE PROFILE DOUGHNUT
    const cropCtx = document.getElementById("cropShareChart").getContext("2d");
    this.charts.cropShare = new Chart(cropCtx, {
      type: "doughnut",
      data: this.getCropShareData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: this.theme === "dark" ? "#a7f3d0" : "#3b5245",
              font: { family: "Inter", size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw;
                return ` ${context.label}: ${value.toFixed(2)} Ha`;
              }
            }
          }
        },
        cutout: "60%"
      }
    });

    // 2. PROVINCE INTENSITY HORIZONTAL BAR
    const provCtx = document.getElementById("provinceIntensityChart").getContext("2d");
    this.charts.provinceIntensity = new Chart(provCtx, {
      type: "bar",
      data: this.getProvinceIntensityData(),
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` Area: ${context.raw.toFixed(2)} Ha`
            }
          }
        },
        scales: {
          x: {
            grid: { color: this.theme === "dark" ? "rgba(52, 211, 153, 0.08)" : "rgba(16, 185, 129, 0.08)" },
            ticks: { color: this.theme === "dark" ? "#a7f3d0" : "#3b5245" },
            title: { display: true, text: "Total Hectares", color: this.theme === "dark" ? "#6ee7b7" : "#6b8475", font: { size: 10, weight: 600 } }
          },
          y: {
            grid: { display: false },
            ticks: { color: this.theme === "dark" ? "#a7f3d0" : "#3b5245" }
          }
        }
      }
    });

    // 3. SUPPLY TIMELINE LINE CHART
    const lineCtx = document.getElementById("timelineChart").getContext("2d");
    this.charts.timeline = new Chart(lineCtx, {
      type: "line",
      data: this.getTimelineData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` Est. Harvest: ${context.raw.toFixed(1)} Tons`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: this.theme === "dark" ? "#a7f3d0" : "#3b5245" },
            title: { display: true, text: "Target Harvest Month", color: this.theme === "dark" ? "#6ee7b7" : "#6b8475", font: { size: 10, weight: 600 } }
          },
          y: {
            grid: { color: this.theme === "dark" ? "rgba(52, 211, 153, 0.08)" : "rgba(16, 185, 129, 0.08)" },
            ticks: { color: this.theme === "dark" ? "#a7f3d0" : "#3b5245" },
            title: { display: true, text: "Estimated Yield (Metric Tons)", color: this.theme === "dark" ? "#6ee7b7" : "#6b8475", font: { size: 10, weight: 600 } }
          }
        },
        elements: {
          line: { tension: 0.3, borderWidth: 3 }
        }
      }
    });

    // Initialize Province Filter Dropdowns
    this.initProvinceFilters();
  },

  // Initialize Province & Municipality Filter Dropdowns for charts
  async initProvinceFilters() {
    const cropShareProv = document.getElementById("crop-share-province-filter");
    const cropShareMun = document.getElementById("crop-share-municipality-filter");
    
    const intensityProv = document.getElementById("intensity-province-filter");
    const intensityMun = document.getElementById("intensity-municipality-filter");
    
    const timelineProv = document.getElementById("timeline-province-filter");
    const timelineMun = document.getElementById("timeline-municipality-filter");

    // Load all provinces dynamically from PSGC
    try {
      await Promise.all([
        this.loadAllProvincesIntoSelect(cropShareProv, "All Provinces"),
        this.loadAllProvincesIntoSelect(intensityProv, "All Provinces"),
        this.loadAllProvincesIntoSelect(timelineProv, "All Provinces")
      ]);
    } catch (e) {
      console.warn("Failed to load provinces for chart filters", e.message);
    }

    // Set change listeners to fetch municipalities dynamically and refresh charts
    if (cropShareProv && cropShareMun) {
      cropShareProv.addEventListener("change", () => {
        this.handleProvinceFilterChange(cropShareProv, cropShareMun, () => this.updateCharts());
      });
      cropShareMun.addEventListener("change", () => {
        this.updateCharts();
      });
    }

    if (intensityProv && intensityMun) {
      intensityProv.addEventListener("change", () => {
        this.handleProvinceFilterChange(intensityProv, intensityMun, () => this.updateCharts());
      });
      intensityMun.addEventListener("change", () => {
        this.updateCharts();
      });
    }

    if (timelineProv && timelineMun) {
      timelineProv.addEventListener("change", () => {
        this.handleProvinceFilterChange(timelineProv, timelineMun, () => this.updateCharts());
      });
      timelineMun.addEventListener("change", () => {
        this.updateCharts();
      });
    }
  },

  // Dynamic geographic filter helper for charts
  async handleProvinceFilterChange(provSelect, munSelect, onFilterUpdate) {
    const selected = provSelect.selectedOptions[0];
    
    // Clear and disable municipality
    munSelect.innerHTML = '<option value="">All Municipalities</option>';
    munSelect.disabled = true;
    
    if (!selected || selected.value === "" || selected.value === "all") {
      onFilterUpdate();
      return;
    }
    
    munSelect.innerHTML = '<option value="">Loading...</option>';
    try {
      const { regCode, provCode } = selected.dataset;
      if (regCode && provCode) {
        const municipalities = await this.fetchGeoJson(
          `/api/geo/municipalities?regCode=${encodeURIComponent(regCode)}&provCode=${encodeURIComponent(provCode)}`
        );
        this.fillSelectOptions(
          munSelect,
          "All Municipalities",
          municipalities,
          (m) => m.name,
          (m) => m.name
        );
        munSelect.disabled = false;
        munSelect.value = "";
      }
    } catch (err) {
      console.error("Failed to load filter municipalities:", err);
      munSelect.innerHTML = '<option value="">Error loading</option>';
    }
    onFilterUpdate();
  },

  // Refresh Chart.js canvases with current state values
  updateCharts() {
    if (!this.charts.cropShare || !this.charts.provinceIntensity || !this.charts.timeline) return;

    // Get selected province/municipality filters
    const cropShareProvince = document.getElementById("crop-share-province-filter").value;
    const cropShareMunicipality = document.getElementById("crop-share-municipality-filter").value;

    const intensityProvince = document.getElementById("intensity-province-filter") ? document.getElementById("intensity-province-filter").value : "";
    const intensityMunicipality = document.getElementById("intensity-municipality-filter") ? document.getElementById("intensity-municipality-filter").value : "";

    const timelineProvince = document.getElementById("timeline-province-filter").value;
    const timelineMunicipality = document.getElementById("timeline-municipality-filter").value;

    // Redraw Crop Share Doughnut
    this.charts.cropShare.data = this.getCropShareData(cropShareProvince, cropShareMunicipality);
    this.charts.cropShare.options.plugins.legend.labels.color = this.theme === "dark" ? "#a7f3d0" : "#3b5245";
    this.charts.cropShare.update();

    // Redraw Province Bar Chart
    this.charts.provinceIntensity.data = this.getProvinceIntensityData(intensityProvince, intensityMunicipality);
    this.charts.provinceIntensity.options.scales.x.grid.color = this.theme === "dark" ? "rgba(52, 211, 153, 0.08)" : "rgba(16, 185, 129, 0.08)";
    this.charts.provinceIntensity.options.scales.x.ticks.color = this.theme === "dark" ? "#a7f3d0" : "#3b5245";
    this.charts.provinceIntensity.options.scales.y.ticks.color = this.theme === "dark" ? "#a7f3d0" : "#3b5245";
    this.charts.provinceIntensity.options.scales.x.title.color = this.theme === "dark" ? "#6ee7b7" : "#6b8475";
    this.charts.provinceIntensity.update();

    // Redraw Supply Timeline
    this.charts.timeline.data = this.getTimelineData(timelineProvince, timelineMunicipality);
    this.charts.timeline.options.scales.x.ticks.color = this.theme === "dark" ? "#a7f3d0" : "#3b5245";
    this.charts.timeline.options.scales.y.ticks.color = this.theme === "dark" ? "#a7f3d0" : "#3b5245";
    this.charts.timeline.options.scales.y.grid.color = this.theme === "dark" ? "rgba(52, 211, 153, 0.08)" : "rgba(16, 185, 129, 0.08)";
    this.charts.timeline.options.scales.x.title.color = this.theme === "dark" ? "#6ee7b7" : "#6b8475";
    this.charts.timeline.options.scales.y.title.color = this.theme === "dark" ? "#6ee7b7" : "#6b8475";
    this.charts.timeline.update();
  },

  // Dynamic calculations for Crop Share doughnut
  getCropShareData(provinceFilter = "", municipalityFilter = "") {
    const cropAreas = {};
    window.VEGETABLES.forEach(v => cropAreas[v.id] = 0);

    const filteredRegistrations = this.registrations.filter(r => {
      const matchesProvince = !provinceFilter || provinceFilter === "all" || r.province === provinceFilter;
      const matchesMunicipality = !municipalityFilter || municipalityFilter === "all" || r.municipality === municipalityFilter;
      return matchesProvince && matchesMunicipality;
    });

    filteredRegistrations.forEach(r => {
      if (cropAreas[r.vegetableId] !== undefined) {
        cropAreas[r.vegetableId] += r.areaHa;
      }
    });

    const labels = [];
    const data = [];
    const colors = [];

    window.VEGETABLES.forEach(v => {
      if (cropAreas[v.id] > 0) {
        labels.push(`${v.emoji} ${v.name}`);
        data.push(cropAreas[v.id]);
        colors.push(v.color);
      }
    });

    if (data.length === 0) {
      labels.push("No Active Registries");
      data.push(0);
      colors.push("#6b7280");
    }

    return {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderColor: this.theme === "dark" ? "#1c2c24" : "#ffffff",
        borderWidth: 2
      }]
    };
  },

  // Dynamic calculations for Province Horizontal Bar
  getProvinceIntensityData(provinceFilter = "", municipalityFilter = "") {
    const locationAreas = {};

    const filteredRegistrations = this.registrations.filter(r => {
      const matchesProvince = !provinceFilter || provinceFilter === "all" || r.province === provinceFilter;
      const matchesMunicipality = !municipalityFilter || municipalityFilter === "all" || r.municipality === municipalityFilter;
      return matchesProvince && matchesMunicipality;
    });

    filteredRegistrations.forEach(r => {
      let key = r.province;
      if (provinceFilter && provinceFilter !== "all") {
        key = r.municipality;
        if (municipalityFilter && municipalityFilter !== "all") {
          key = r.barangay;
        }
      }
      locationAreas[key] = (locationAreas[key] || 0) + r.areaHa;
    });

    const sortedLocations = Object.keys(locationAreas).sort((a, b) => locationAreas[b] - locationAreas[a]);
    const datasetsData = sortedLocations.map(loc => locationAreas[loc]);

    return {
      labels: sortedLocations,
      datasets: [{
        data: datasetsData,
        backgroundColor: this.theme === "dark" ? "rgba(16, 185, 129, 0.75)" : "rgba(16, 185, 129, 0.8)",
        borderColor: "#10b981",
        borderWidth: 1.5,
        borderRadius: 4
      }]
    };
  },

  // Dynamic calculations for Timeline Line chart (Expected Harvest Months)
  getTimelineData(provinceFilter = "", municipalityFilter = "") {
    const monthlyYields = {};
    const monthsKeys = [];

    const today = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 0; i < 6; i++) {
      const future = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const label = `${monthNames[future.getMonth()]} ${future.getFullYear()}`;
      monthlyYields[label] = 0;
      monthsKeys.push({
        label: label,
        year: future.getFullYear(),
        month: future.getMonth()
      });
    }

    const filteredRegistrations = this.registrations.filter(r => {
      const matchesProvince = !provinceFilter || provinceFilter === "all" || r.province === provinceFilter;
      const matchesMunicipality = !municipalityFilter || municipalityFilter === "all" || r.municipality === municipalityFilter;
      return matchesProvince && matchesMunicipality;
    });

    filteredRegistrations.forEach(r => {
      const hDate = new Date(r.harvestDate);
      const hYear = hDate.getFullYear();
      const hMonth = hDate.getMonth();

      const match = monthsKeys.find(m => m.year === hYear && m.month === hMonth);
      if (match) {
        monthlyYields[match.label] += r.expectedYieldTons;
      }
    });

    const labels = monthsKeys.map(m => m.label);
    const data = labels.map(l => monthlyYields[l]);

    return {
      labels: labels,
      datasets: [{
        data: data,
        borderColor: "#34d399",
        backgroundColor: this.theme === "dark" ? "rgba(52, 211, 153, 0.12)" : "rgba(16, 185, 129, 0.1)",
        fill: true,
        pointBackgroundColor: "#f59e0b",
        pointBorderColor: "#ffffff",
        pointHoverRadius: 6,
        pointRadius: 4
      }]
    };
  },

  // Ledger Filter drop-downs builder
  populateFilterDropdowns() {
    const provSelect = document.getElementById("table-filter-province");
    const vegSelect = document.getElementById("table-filter-vegetable");

    // Capture selections to recover them after replenishment
    const savedProv = provSelect.value;
    const savedVeg = vegSelect.value;

    // Reset except headers
    provSelect.innerHTML = '<option value="">All Provinces</option>';
    vegSelect.innerHTML = '<option value="">All Vegetables</option>';

    // Uniques Province options
    const uniqueProvs = new Set();
    this.registrations.forEach(r => uniqueProvs.add(r.province));
    Array.from(uniqueProvs).sort().forEach(p => {
      const option = document.createElement("option");
      option.value = p;
      option.textContent = p;
      provSelect.appendChild(option);
    });

    // Uniques Vegetables options
    const uniqueVegIds = new Set();
    this.registrations.forEach(r => uniqueVegIds.add(r.vegetableId));
    Array.from(uniqueVegIds).sort().forEach(id => {
      const veg = window.VEGETABLES.find(v => v.id === id);
      if (veg) {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = `${veg.emoji} ${veg.name}`;
        vegSelect.appendChild(option);
      }
    });

    // Restore selected values
    provSelect.value = savedProv || "";
    vegSelect.value = savedVeg || "";
  },

  // Table ledger filters hooks
  initTableFilters() {
    const search = document.getElementById("table-search");
    const provSelect = document.getElementById("table-filter-province");
    const vegSelect = document.getElementById("table-filter-vegetable");

    const triggerFilter = () => {
      this.renderLedgerTable();
    };

    search.addEventListener("input", triggerFilter);
    provSelect.addEventListener("change", triggerFilter);
    vegSelect.addEventListener("change", triggerFilter);
  },

  // Render Table Ledger Rows dynamically
  renderLedgerTable() {
    const tbody = document.getElementById("ledger-tbody");
    tbody.innerHTML = "";

    const searchVal = document.getElementById("table-search").value.toLowerCase().trim();
    const provFilter = document.getElementById("table-filter-province").value;
    const vegFilter = document.getElementById("table-filter-vegetable").value;

    // Filter registrations
    const filtered = this.registrations.filter(r => {
      const matchesSearch = r.farmerName.toLowerCase().includes(searchVal);
      const matchesProvince = !provFilter || r.province === provFilter;
      const matchesVegetable = !vegFilter || r.vegetableId === vegFilter;
      return matchesSearch && matchesProvince && matchesVegetable;
    });

    // Update Counter Badges
    document.getElementById("ledger-count-visible").textContent = filtered.length.toString();
    document.getElementById("ledger-count-total").textContent = this.registrations.length.toString();

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--color-text-muted); padding: 36px 0; font-style: italic;">
            No crop registrations match the specified filters. Try relaxing search criteria.
          </td>
        </tr>
      `;
      return;
    }

    // Append Rows
    filtered.forEach(r => {
      const veg = window.VEGETABLES.find(v => v.id === r.vegetableId) || { name: "Unknown", emoji: "🌱", tag: "Gulay", color: "#10b981", maturationDays: 60 };
      const displayVegetableName = r.vegetableName || veg.name;
      const row = document.createElement("tr");

      // Format Date string
      const opt = { year: "numeric", month: "short", day: "numeric" };
      const hDateFormatted = new Date(r.harvestDate).toLocaleDateString("en-US", opt);

      const status = r.verificationStatus || 'Pending';
      let statusBadge = '';
      if (status === 'Geo-Verified') {
        statusBadge = `
          <span class="status-badge geo-verified" style="background-color: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 6px; font-size: 0.85rem; font-weight: 500;">
            <i data-lucide="map-pin" style="width: 14px; height: 14px;"></i>
            <span>Geo-Verified</span>
          </span>
        `;
      } else if (status === 'Oracle Confirmed') {
        statusBadge = `
          <span class="status-badge oracle-confirmed" style="background-color: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 6px; font-size: 0.85rem; font-weight: 500;">
            <i data-lucide="shield-check" style="width: 14px; height: 14px;"></i>
            <span>Oracle Confirmed</span>
          </span>
        `;
      } else if (status === 'Cancelled') {
        statusBadge = `
          <span class="status-badge cancelled" style="background-color: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 6px; font-size: 0.85rem; font-weight: 500;">
            <i data-lucide="x-circle" style="width: 14px; height: 14px;"></i>
            <span>Cancelled</span>
          </span>
        `;
      } else {
        statusBadge = `
          <span class="status-badge pending" style="background-color: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 6px; font-size: 0.85rem; font-weight: 500;">
            <i data-lucide="clock" style="width: 14px; height: 14px;"></i>
            <span>Pending</span>
          </span>
        `;
      }

      row.innerHTML = `
        <td data-label="ID"><span class="registry-id">${r.id}</span></td>
        <td data-label="Farmer">
          <span class="farmer-main">${r.farmerName.split(' ')[0]}</span>
          <span class="farmer-sub"><i data-lucide="phone" style="width:10px; height:10px; display:inline-block; margin-right:4px;"></i>${r.contact.substring(0, 4) + '****' + r.contact.substring(r.contact.length - 3)}</span>
        </td>
        <td data-label="Location">
          <span class="farmer-main">${r.barangay}, ${r.municipality}</span>
          <span class="farmer-sub">${r.province}</span>
        </td>
        <td data-label="Crop">
          <span class="crop-badge" style="background-color: ${veg.color}15; color: ${veg.color}; border: 1px solid ${veg.color}30; display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px;">
            <span>${displayVegetableName}</span>
          </span>
        </td>
        <td data-label="Area">
          <span class="area-value">${r.areaHa.toLocaleString("en-US", { minimumFractionDigits: 2 })} ha</span>
          <span class="farmer-sub">${r.areaSqm.toLocaleString("en-US")} sqm</span>
        </td>
        <td data-label="Yield">
          <span class="yield-value">${r.expectedYieldTons.toLocaleString("en-US", { minimumFractionDigits: 2 })} Tons</span>
        </td>
        <td data-label="Harvest">
          <span class="farmer-main">${hDateFormatted}</span>
          <span class="farmer-sub">${veg.maturationDays} days growth</span>
        </td>
        <td data-label="Verification">
          ${statusBadge}
        </td>
      `;

      tbody.appendChild(row);
    });

    this.initLucide();
  },

  // Export Unified Crop Register to CSV format
  initExportCSV() {
    const btn = document.getElementById("export-csv-btn");
    
    btn.addEventListener("click", () => {
      if (this.registrations.length === 0) return;

      const headers = ["Registry ID", "Farmer Name", "Contact Number", "Province", "Municipality", "Barangay", "Crop Variety ID", "Crop Name", "Land Area (Ha)", "Land Area (Sqm)", "Est Yield (Tons)", "Planting Date", "Est Harvest Date"];
      
      const rows = this.registrations.map(r => {
        const veg = window.VEGETABLES.find(v => v.id === r.vegetableId) || { name: "Unknown" };
        return [
          r.id,
          `"${r.farmerName.replace(/"/g, '""')}"`,
          r.contact,
          `"${r.province}"`,
          `"${r.municipality}"`,
          `"${r.barangay}"`,
          r.vegetableId,
          veg.name,
          r.areaHa,
          r.areaSqm,
          r.expectedYieldTons,
          r.plantingDate,
          r.harvestDate
        ];
      });

      // Join string array in csv syntax
      const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `Farmers_Consensus_Registry_Export_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  },

  // Blockchain Integration: Record crop registration on Cheese Blockchain
  async recordOnBlockchain(registrationData) {
    try {
      console.log('🧀 Recording on Cheese Blockchain:', registrationData.id);
      
      const response = await fetch('/api/farmers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData)
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Blockchain recording successful:', result.blockchainReceipt);
        
        // Store blockchain receipt with registration
        registrationData.blockchainReceipt = result.blockchainReceipt;
        registrationData.reward = result.reward;
        
        // Update local storage with blockchain receipt
        localStorage.setItem("farmers_consensus_data", JSON.stringify(this.registrations));
        
        // Show blockchain notification in receipt with fee breakdown
        const blockchainInfo = document.getElementById("receipt-blockchain-info");
        if (blockchainInfo) {
          const financial = result.financial || {};
          blockchainInfo.innerHTML = `
            <div style="margin-top: 16px; padding: 12px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                <i data-lucide="check-circle" style="width: 16px; height: 16px; color: #10b981;"></i>
                <span style="font-weight: 600; color: #10b981;">Blockchain Verified</span>
              </div>
              <div style="font-size: 0.85rem; color: var(--color-text-secondary);">
                <div style="margin-bottom: 4px;"><strong>TX ID:</strong> ${result.blockchainReceipt.transactionId}</div>
                <div style="margin-bottom: 8px;"><strong>Hash:</strong> ${result.blockchainReceipt.hash.substring(0, 16)}...</div>
                
                <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(16, 185, 129, 0.2);">
                  <div style="font-weight: 600; margin-bottom: 6px; color: #10b981;">💰 Fee Breakdown</div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                    <span>Gross Reward:</span><span style="text-align: right;">${financial.grossReward || 10} NCH</span>
                    <span>Transaction Fee:</span><span style="text-align: right; color: #ef4444;">-${financial.transactionFee || 0.5} NCH</span>
                    ${financial.premiumFee > 0 ? `<span>Premium Fee:</span><span style="text-align: right; color: #ef4444;">-${financial.premiumFee} NCH</span>` : ''}
                    <span style="font-weight: 600; margin-top: 4px;">Net Reward:</span><span style="text-align: right; font-weight: 600; color: #10b981; margin-top: 4px;">${financial.netReward || 9.5} NCH</span>
                  </div>
                </div>
              </div>
            </div>
          `;
          this.initLucide();
        }
      } else {
        console.error('❌ Blockchain recording failed:', result.error);
        // Continue with local storage even if blockchain fails
      }
    } catch (error) {
      console.error('❌ Blockchain API error:', error);
      // Continue with local storage even if blockchain fails
    }
  },

  // Check blockchain connection status
  async checkBlockchainStatus() {
    try {
      const response = await fetch('/api/blockchain/status');
      const result = await response.json();
      
      if (result.success) {
        console.log('🧀 Cheese Blockchain Status:', result.blockchain);
        
        // Update UI to show connected status
        const indicator = document.getElementById("blockchain-indicator");
        const statusText = document.getElementById("blockchain-status-text");
        
        if (indicator && statusText) {
          indicator.classList.add("connected");
          indicator.classList.remove("disconnected");
          statusText.textContent = "Cheese Blockchain Connected";
        }
        
        return result.blockchain;
      } else {
        console.error('❌ Blockchain status check failed');
        this.setBlockchainDisconnected();
        return null;
      }
    } catch (error) {
      console.error('❌ Blockchain status check error:', error);
      this.setBlockchainDisconnected();
      return null;
    }
  },

  // Set blockchain UI to disconnected state
  setBlockchainDisconnected() {
    const indicator = document.getElementById("blockchain-indicator");
    const statusText = document.getElementById("blockchain-status-text");
    
    if (indicator && statusText) {
      indicator.classList.remove("connected");
      indicator.classList.add("disconnected");
      statusText.textContent = "Blockchain Offline";
    }
  },

  // Revenue Analytics Functions
  async fetchRevenueAnalytics(timeframe = 'all') {
    try {
      const response = await fetch(`/api/revenue/analytics?timeframe=${timeframe}`);
      const result = await response.json();
      
      if (result.success) {
        this.updateRevenueDashboard(result.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch revenue analytics:', error);
    }
  },

  updateRevenueDashboard(analytics) {
    // Update revenue metrics
    document.getElementById('revenue-total').textContent = `${analytics.totalRevenue.toFixed(2)} NCH`;
    document.getElementById('revenue-transactions').textContent = analytics.totalTransactions;
    document.getElementById('revenue-avg-fee').textContent = `${analytics.averageFeePerTransaction} NCH`;
    document.getElementById('revenue-growth').textContent = `+${analytics.revenueGrowth}%`;
    
    // Update fee breakdown
    document.getElementById('revenue-transaction-fees').textContent = `${analytics.feeBreakdown.transactionFees.toFixed(2)} NCH`;
    document.getElementById('revenue-premium-fees').textContent = `${analytics.feeBreakdown.premiumFees.toFixed(2)} NCH`;
    document.getElementById('revenue-verification-fees').textContent = `${analytics.feeBreakdown.verificationFees.toFixed(2)} NCH`;
    document.getElementById('revenue-buyer-registration-fees').textContent = `${analytics.feeBreakdown.buyerRegistrationFees.toFixed(2)} NCH`;
    document.getElementById('revenue-buyer-premium-fees').textContent = `${analytics.feeBreakdown.buyerPremiumFees.toFixed(2)} NCH`;
    document.getElementById('revenue-matching-fees').textContent = `${analytics.feeBreakdown.buyerMatchingFees.toFixed(2)} NCH`;
    
    // Update progress bars
    const total = analytics.totalRevenue || 1;
    document.getElementById('revenue-transaction-bar').style.width = `${(analytics.feeBreakdown.transactionFees / total) * 100}%`;
    document.getElementById('revenue-premium-bar').style.width = `${(analytics.feeBreakdown.premiumFees / total) * 100}%`;
    document.getElementById('revenue-verification-bar').style.width = `${(analytics.feeBreakdown.verificationFees / total) * 100}%`;
    document.getElementById('revenue-buyer-registration-bar').style.width = `${(analytics.feeBreakdown.buyerRegistrationFees / total) * 100}%`;
    document.getElementById('revenue-buyer-premium-bar').style.width = `${(analytics.feeBreakdown.buyerPremiumFees / total) * 100}%`;
    document.getElementById('revenue-matching-bar').style.width = `${(analytics.feeBreakdown.buyerMatchingFees / total) * 100}%`;
    
    // Update main revenue metric
    document.getElementById('metric-revenue').textContent = `${analytics.totalRevenue.toFixed(1)} NCH`;
    
    // Update recent transactions
    this.updateRecentTransactions(analytics.recentTransactions);
  },

  updateRecentTransactions(transactions) {
    const container = document.getElementById('recent-transactions-list');
    
    if (!transactions || transactions.length === 0) {
      container.innerHTML = '<div class="no-transactions">No transactions yet</div>';
      return;
    }
    
    container.innerHTML = transactions.map(tx => `
      <div class="transaction-item">
        <div>
          <div class="transaction-type">${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} Fee</div>
          <div class="transaction-time">${new Date(tx.timestamp).toLocaleString()}</div>
        </div>
        <div class="transaction-amount">${tx.amount.toFixed(2)} NCH</div>
      </div>
    `).join('');
  },

  initRevenueDashboard() {
    // Fetch revenue analytics on load
    this.fetchRevenueAnalytics();
    
    // Set up timeframe filter
    const timeframeSelect = document.getElementById('revenue-timeframe');
    if (timeframeSelect) {
      timeframeSelect.addEventListener('change', (e) => {
        this.fetchRevenueAnalytics(e.target.value);
      });
    }
  },

  // Buyer Registration Functions
  initBuyerRegistration() {
    const form = document.getElementById("buyer-registration-form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.handleBuyerRegistration(form);
      });
    }
  },

  async handleBuyerRegistration(form) {
    // Get form values
    const buyerName = document.getElementById("buyer-name").value;
    const companyName = document.getElementById("company-name").value;
    const email = document.getElementById("buyer-email").value;
    const phone = document.getElementById("buyer-phone").value;
    const province = document.getElementById("buyer-province").value;
    const businessType = document.getElementById("business-type").value;
    const monthlyVolume = document.getElementById("monthly-volume").value;
    const isPremium = document.getElementById("buyer-premium").checked;

    // Get selected products
    const productCheckboxes = document.querySelectorAll("#buyer-products input:checked");
    const selectedProducts = Array.from(productCheckboxes).map(cb => cb.value);

    if (selectedProducts.length === 0) {
      alert("Please select at least one product category");
      return;
    }

    // Generate buyer ID
    const buyerId = `BUYER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Prepare registration data
    const buyerData = {
      id: buyerId,
      buyerName,
      companyName,
      email,
      phone,
      province,
      businessType,
      products: selectedProducts,
      monthlyVolume: parseFloat(monthlyVolume),
      premiumTier: isPremium,
      registrationDate: new Date().toISOString()
    };

    try {
      const response = await fetch("/api/buyers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buyerData)
      });

      const result = await response.json();

      if (result.success) {
        console.log("✅ Buyer registration successful:", result.blockchainReceipt);
        
        // Store buyer registration locally
        let buyerRegistrations = JSON.parse(localStorage.getItem("buyer_registrations") || "[]");
        buyerRegistrations.push({
          ...buyerData,
          blockchainReceipt: result.blockchainReceipt,
          financial: result.financial
        });
        localStorage.setItem("buyer_registrations", JSON.stringify(buyerRegistrations));

        // Show success message
        alert(`🎉 Buyer Registration Successful!\n\nCompany: ${companyName}\nRegistration ID: ${buyerId}\nBlockchain TX ID: ${result.blockchainReceipt.transactionId}\n\nTotal Fees: ${result.financial.totalFees} NCH\n\nThank you for supporting Philippine farmers!`);
        
        // Reset form
        form.reset();
        
        // Refresh revenue analytics
        this.fetchRevenueAnalytics();
      } else {
        alert("❌ Buyer registration failed: " + result.error);
      }
    } catch (error) {
      console.error("❌ Buyer registration error:", error);
      alert("❌ Registration failed. Please try again.");
    }
  },

  // Mobile Enhancements
  initMobileEnhancements() {
    // Add touch feedback to interactive elements
    this.addTouchFeedback();
    
    // Optimize input fields for mobile
    this.optimizeMobileInputs();
    
    // Add swipe gestures for navigation (optional)
    this.initSwipeGestures();
    
    // Prevent zoom on input focus (iOS)
    this.preventInputZoom();
    
    // Add mobile-specific viewport adjustments
    this.adjustViewportForMobile();
    
    // Optimize charts for mobile
    this.optimizeChartsForMobile();
  },

  addTouchFeedback() {
    // Add touch feedback to buttons and interactive elements
    const touchElements = document.querySelectorAll('button, .card, .vegetable-chip, .checkbox-item, .benefit-item');
    
    touchElements.forEach(element => {
      element.addEventListener('touchstart', () => {
        element.style.transform = 'scale(0.98)';
        element.style.opacity = '0.8';
      }, { passive: true });
      
      element.addEventListener('touchend', () => {
        element.style.transform = '';
        element.style.opacity = '';
      }, { passive: true });
    });
  },

  optimizeMobileInputs() {
    // Add appropriate input modes for mobile keyboards
    const emailInput = document.getElementById('farmer-email');
    if (emailInput) {
      emailInput.setAttribute('inputmode', 'email');
      emailInput.setAttribute('autocomplete', 'email');
    }
    
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
      input.setAttribute('inputmode', 'tel');
      input.setAttribute('autocomplete', 'tel');
    });
    
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
      input.setAttribute('inputmode', 'decimal');
    });
  },

  initSwipeGestures() {
    // Simple swipe detection for tab navigation
    let touchStartX = 0;
    let touchEndX = 0;
    
    const tabContent = document.querySelector('.app-content');
    if (tabContent) {
      tabContent.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });
      
      tabContent.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        this.handleSwipe();
      }, { passive: true });
    }
    
    this.touchStartX = touchStartX;
    this.touchEndX = touchEndX;
  },

  handleSwipe() {
    const swipeThreshold = 50;
    const diff = this.touchStartX - this.touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
      const tabs = document.querySelectorAll('.tab-btn');
      const activeTab = document.querySelector('.tab-btn.active');
      const activeIndex = Array.from(tabs).indexOf(activeTab);
      
      if (diff > 0 && activeIndex < tabs.length - 1) {
        // Swipe left - next tab
        tabs[activeIndex + 1].click();
      } else if (diff < 0 && activeIndex > 0) {
        // Swipe right - previous tab
        tabs[activeIndex - 1].click();
      }
    }
  },

  preventInputZoom() {
    // Prevent iOS zoom on input focus
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
      const inputs = document.querySelectorAll('input, select, textarea');
      
      inputs.forEach(input => {
        input.addEventListener('focus', () => {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0');
        });
        
        input.addEventListener('blur', () => {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
        });
      });
    }
  },

  adjustViewportForMobile() {
    // Adjust viewport for very small screens
    if (window.innerWidth < 360) {
      const viewport = document.querySelector('meta[name=viewport]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=0.9, maximum-scale=5.0, user-scalable=yes');
      }
    }
  },

  optimizeChartsForMobile() {
    // Optimize Chart.js for mobile displays
    if (typeof Chart !== 'undefined') {
      Chart.defaults.font.size = window.innerWidth < 768 ? 11 : 12;
      Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
      
      // Adjust chart padding for mobile
      if (window.innerWidth < 768) {
        Chart.defaults.plugins.legend.display = false;
        Chart.defaults.plugins.tooltip.padding = 8;
        Chart.defaults.plugins.tooltip.cornerRadius = 8;
      }
    }
  },

  // Progressive Web App Features
  initPWAFeatures() {
    // Register service worker if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
        .then(registration => {
          console.log('SW registered');
          
          // Check for service worker updates immediately on page load
          registration.update();
          
          // If a new service worker is installed, reload the page to load new assets
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New Service Worker version installed. Reloading...');
                  window.location.reload();
                }
              });
            }
          });
        })
        .catch(error => console.log('SW registration failed', error));
    }
    
    // Handle online/offline status
    window.addEventListener('online', () => this.showConnectionStatus('online'));
    window.addEventListener('offline', () => this.showConnectionStatus('offline'));
  },

  showConnectionStatus(status) {
    const statusDiv = document.createElement('div');
    statusDiv.className = `connection-status ${status}`;
    statusDiv.textContent = status === 'online' ? '🟢 Back Online' : '🔴 You are offline';
    statusDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 10000;
      background: ${status === 'online' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)'};
      color: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideDown 0.3s ease;
    `;
    
    document.body.appendChild(statusDiv);
    
    setTimeout(() => {
      statusDiv.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => statusDiv.remove(), 300);
    }, 3000);
  },

  // Mobile Performance Optimization
  optimizeMobilePerformance() {
    // Reduce animations on low-end devices
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
      document.documentElement.style.setProperty('--animation-duration', '0.2s');
    }
    
    // Lazy load images and heavy content
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            imageObserver.unobserve(img);
          }
        });
      });
      
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  },

  // Mobile-Specific Error Handling
  initMobileErrorHandling() {
    window.addEventListener('error', (e) => {
      console.error('Mobile error:', e);
      // Show user-friendly error message
      if (window.innerWidth < 768) {
        alert('An error occurred. Please refresh the page.');
      }
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (e) => {
      console.error('Unhandled promise rejection:', e);
    });
  },

  // ===== USER AUTHENTICATION =====
  
  // Initialize authentication state
  initAuth() {
    this.currentUser = JSON.parse(localStorage.getItem('user_token')) || null;
    this.authToken = localStorage.getItem('auth_token') || null;
    
    // Setup authentication UI if user is logged in
    if (this.currentUser) {
      this.updateAuthUI(true);
      this.loadUserProfile();
    }
    
    // Initialize login/register forms
    this.initAuthForms();
    
    // Initialize wallet connection
    this.initWalletConnection();
    
    // Initialize user dashboard
    this.initUserDashboard();
  },

  // Initialize authentication form handlers
  initAuthForms() {
    // Register form handler
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }
    
    // Login form handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }
    
    // Forgot password form handler
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (forgotPasswordForm) {
      forgotPasswordForm.addEventListener('submit', (e) => this.handleForgotPassword(e));
    }
    
    // Modal handlers
    this.initModalHandlers();
  },

  // Initialize modal handlers
  initModalHandlers() {
    // Login button
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.openModal('login-modal'));
    }
    
    // Register button
    const registerBtn = document.getElementById('register-btn');
    if (registerBtn) {
      registerBtn.addEventListener('click', () => this.openModal('register-modal'));
    }
    
    // Close modal buttons
    const closeLoginModal = document.getElementById('close-login-modal');
    if (closeLoginModal) {
      closeLoginModal.addEventListener('click', () => this.closeModal('login-modal'));
    }
    
    const closeRegisterModal = document.getElementById('close-register-modal');
    if (closeRegisterModal) {
      closeRegisterModal.addEventListener('click', () => this.closeModal('register-modal'));
    }
    
    const closeProfileModal = document.getElementById('close-profile-modal');
    if (closeProfileModal) {
      closeProfileModal.addEventListener('click', () => this.closeModal('profile-modal'));
    }

    // Forgot Password modal triggers
    const forgotPasswordBtn = document.getElementById('forgot-password-btn');
    if (forgotPasswordBtn) {
      forgotPasswordBtn.addEventListener('click', () => {
        this.closeModal('login-modal');
        this.openModal('forgot-password-modal');
      });
    }

    const closeForgotPasswordModal = document.getElementById('close-forgot-password-modal');
    if (closeForgotPasswordModal) {
      closeForgotPasswordModal.addEventListener('click', () => this.closeModal('forgot-password-modal'));
    }

    const forgotBackToLogin = document.getElementById('forgot-back-to-login');
    if (forgotBackToLogin) {
      forgotBackToLogin.addEventListener('click', () => {
        this.closeModal('forgot-password-modal');
        this.openModal('login-modal');
      });
    }
    
    // Switch between login and register
    const switchToRegister = document.getElementById('switch-to-register');
    if (switchToRegister) {
      switchToRegister.addEventListener('click', () => {
        this.closeModal('login-modal');
        this.openModal('register-modal');
      });
    }
    
    const switchToLogin = document.getElementById('switch-to-login');
    if (switchToLogin) {
      switchToLogin.addEventListener('click', () => {
        this.closeModal('register-modal');
        this.openModal('login-modal');
      });
    }
    
    // User dropdown toggle (clickable anywhere on the user widget header)
    const userMenu = document.getElementById('user-menu');
    if (userMenu) {
      userMenu.addEventListener('click', (e) => {
        const userDropdownMenu = document.getElementById('user-dropdown-menu');
        // Prevent toggle when clicking dropdown links/buttons themselves
        if (userDropdownMenu && userDropdownMenu.contains(e.target)) {
          return;
        }
        e.stopPropagation();
        this.toggleUserDropdown();
      });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }
    
    // Profile link
    const profileLink = document.querySelector('[href="#profile"]');
    if (profileLink) {
      profileLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.openProfileModal();
        const userDropdownMenu = document.getElementById('user-dropdown-menu');
        if (userDropdownMenu) {
          userDropdownMenu.classList.remove('active');
        }
      });
    }

    // Balance link
    const balanceLink = document.querySelector('[href="#balance"]');
    if (balanceLink) {
      balanceLink.addEventListener('click', (e) => {
        e.preventDefault();
        // Switch to User Dashboard tab
        const tabBtn = document.querySelector('[data-tab="user-dashboard-tab"]');
        if (tabBtn) {
          tabBtn.click();
          // Scroll to current balance card
          const balanceCard = document.querySelector('.earning-card');
          if (balanceCard) {
            balanceCard.scrollIntoView({ behavior: 'smooth' });
          }
        }
        // Close dropdown
        const userDropdownMenu = document.getElementById('user-dropdown-menu');
        if (userDropdownMenu) {
          userDropdownMenu.classList.remove('active');
        }
      });
    }

    // Rewards link
    const rewardsLink = document.querySelector('[href="#rewards"]');
    if (rewardsLink) {
      rewardsLink.addEventListener('click', (e) => {
        e.preventDefault();
        // Switch to User Dashboard tab
        const tabBtn = document.querySelector('[data-tab="user-dashboard-tab"]');
        if (tabBtn) {
          tabBtn.click();
          // Scroll to rewards list section
          const rewardsSection = document.getElementById('dashboard-rewards-list');
          if (rewardsSection) {
            rewardsSection.scrollIntoView({ behavior: 'smooth' });
          }
        }
        // Close dropdown
        const userDropdownMenu = document.getElementById('user-dropdown-menu');
        if (userDropdownMenu) {
          userDropdownMenu.classList.remove('active');
        }
      });
    }
    
    // Connect wallet button (delegated event handling for dynamic buttons)
    document.addEventListener('click', (e) => {
      if (e.target.closest('#connect-wallet-btn')) {
        e.preventDefault();
        this.connectWallet();
      }
      if (e.target.closest('#disconnect-wallet-btn')) {
        e.preventDefault();
        this.disconnectWallet();
      }
    });
    
    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeModal(overlay.id);
        }
      });
    });
    
    // Close user dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const userMenu = document.getElementById('user-menu');
      const userDropdownMenu = document.getElementById('user-dropdown-menu');
      
      if (userMenu && !userMenu.contains(e.target)) {
        if (userDropdownMenu) {
          userDropdownMenu.classList.remove('active');
        }
      }
    });
  },

  // Open modal
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
  },

  // Close modal
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = ''; // Restore scrolling
      
      // Clear forms if it's auth modal
      if (modalId === 'login-modal') {
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.reset();
      } else if (modalId === 'register-modal') {
        const registerForm = document.getElementById('register-form');
        if (registerForm) registerForm.reset();
      }
    }
  },

  // Toggle user dropdown
  toggleUserDropdown() {
    const userDropdownMenu = document.getElementById('user-dropdown-menu');
    if (userDropdownMenu) {
      userDropdownMenu.classList.toggle('active');
    }
  },

  // Open profile modal
  openProfileModal() {
    this.loadUserProfile();
    this.openModal('profile-modal');
    
    // Load user activity
    this.loadUserActivity();
  },

  // Load user activity
  async loadUserActivity() {
    if (!this.authToken) return;
    
    try {
      const response = await fetch('/api/user/activity?limit=10', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.updateActivityDisplay(result.activities);
      }
    } catch (error) {
      console.error('Activity load error:', error);
    }
  },

  // Update activity display
  updateActivityDisplay(activities) {
    const activityList = document.getElementById('activity-list');
    if (activityList) {
      if (activities && activities.length > 0) {
        activityList.innerHTML = activities.map(activity => `
          <div class="activity-item">
            <div class="activity-type">${activity.activity_type}</div>
            <div class="activity-description">${activity.activity_description}</div>
            <div class="activity-time">${new Date(activity.created_at).toLocaleString()}</div>
          </div>
        `).join('');
      } else {
        activityList.innerHTML = '<p class="no-activity">No recent activity</p>';
      }
    }
  },

  // Handle user registration
  async handleRegister(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const userData = {
      email: formData.get('email'),
      password: formData.get('password'),
      fullName: formData.get('fullName'),
      userType: formData.get('userType'),
      registrationId: formData.get('registrationId') || null
    };
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Store authentication data
        localStorage.setItem('auth_token', result.token);
        localStorage.setItem('user_token', JSON.stringify(result.user));
        
        this.currentUser = result.user;
        this.authToken = result.token;
        
        // Update UI
        this.updateAuthUI(true);
        this.loadUserProfile();
        
        // Close registration modal
        this.closeModal('register-modal');
        
        // Show success message
        this.showNotification('Registration successful! Welcome to Farmers Consensus.', 'success');
        
        // Redirect to dashboard
        if (result.user.registrationId) {
          this.showRegistrationSuccess(result.user.registrationId);
        }
      } else {
        this.showNotification(result.error || 'Registration failed', 'error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      this.showNotification('Registration failed. Please try again.', 'error');
    }
  },

  // Handle user login
  async handleLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const loginData = {
      email: formData.get('email'),
      password: formData.get('password')
    };
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Store authentication data
        localStorage.setItem('auth_token', result.token);
        localStorage.setItem('user_token', JSON.stringify(result.user));
        
        this.currentUser = result.user;
        this.authToken = result.token;
        
        // Update UI
        this.updateAuthUI(true);
        this.loadUserProfile();
        
        // Close login modal
        this.closeModal('login-modal');
        
        // Show success message
        this.showNotification('Login successful! Welcome back.', 'success');
      } else {
        this.showNotification(result.error || 'Login failed', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showNotification('Login failed. Please try again.', 'error');
    }
  },

  // Handle forgot password request
  async handleForgotPassword(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const email = formData.get('email');
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.closeModal('forgot-password-modal');
        this.showNotification(result.message || 'Password reset instructions sent to your email.', 'success');
        form.reset();
      } else {
        this.showNotification(result.error || 'Failed to request password reset', 'error');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      this.showNotification('An error occurred. Please try again.', 'error');
    }
  },

  // Handle user logout
  async handleLogout() {
    try {
      if (this.authToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API call result
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_token');
      
      this.currentUser = null;
      this.authToken = null;
      
      // Update UI
      this.updateAuthUI(false);
      
      // Show notification
      this.showNotification('Logged out successfully', 'info');
    }
  },

  // Load user profile data
  async loadUserProfile() {
    if (!this.authToken || !this.currentUser) return;
    
    try {
      const response = await fetch('/api/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update user data
        localStorage.setItem('user_token', JSON.stringify(result.user));
        this.currentUser = result.user;
        
        // Update balance display
        this.updateBalanceDisplay(result.user);
        
        // Update rewards display
        this.updateRewardsDisplay(result.recentRewards);
        
        // Update profile modal fields
        this.updateProfileModal(result.user);
        
        // Load reward statistics
        this.loadRewardStatistics();
        
        // Load token prices
        this.loadTokenPrices();
      }
    } catch (error) {
      console.error('Profile load error:', error);
    }
  },

  // Load reward statistics
  async loadRewardStatistics() {
    if (!this.authToken) return;
    
    try {
      const response = await fetch('/api/user/rewards/stats', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.updateRewardStatsDisplay(result.stats);
      }
    } catch (error) {
      console.error('Reward stats error:', error);
    }
  },

  // Update reward statistics display
  updateRewardStatsDisplay(stats) {
    const totalRewardsElements = document.querySelectorAll('.stat-total-rewards');
    totalRewardsElements.forEach(element => {
      element.textContent = `${stats.totalRewards} NCH`;
    });
    
    const claimedElements = document.querySelectorAll('.stat-claimed');
    claimedElements.forEach(element => {
      element.textContent = `${stats.claimed} NCH`;
    });
    
    const unclaimedElements = document.querySelectorAll('.stat-unclaimed');
    unclaimedElements.forEach(element => {
      element.textContent = `${stats.unclaimed} NCH`;
    });
  },

  // Load token prices
  async loadTokenPrices() {
    try {
      const response = await fetch('/api/tokens/prices');
      const result = await response.json();
      
      if (result.success) {
        this.currentTokenPrices = result.prices;
        this.updateTokenPriceDisplay();
      }
    } catch (error) {
      console.error('Token price error:', error);
    }
  },

  // Update token price display
  updateTokenPriceDisplay() {
    if (!this.currentTokenPrices) return;
    
    // Update price displays
    const priceElements = document.querySelectorAll('.nch-price-usd');
    priceElements.forEach(element => {
      element.textContent = `$${this.currentTokenPrices.USD.toFixed(4)}`;
    });
    
    const phpPriceElements = document.querySelectorAll('.nch-price-php');
    phpPriceElements.forEach(element => {
      element.textContent = `₱${this.currentTokenPrices.PHP.toFixed(2)}`;
    });
    
    // Update balance conversions
    this.updateBalanceConversions();
  },

  // Update balance with currency conversions
  updateBalanceConversions() {
    if (!this.currentTokenPrices || !this.currentUser) return;
    
    const nchBalance = this.currentUser.nchBalance || 0;
    
    const usdValueElements = document.querySelectorAll('.balance-usd-value');
    usdValueElements.forEach(element => {
      element.textContent = `$${(nchBalance * this.currentTokenPrices.USD).toFixed(2)}`;
    });
    
    const phpValueElements = document.querySelectorAll('.balance-php-value');
    phpValueElements.forEach(element => {
      element.textContent = `₱${(nchBalance * this.currentTokenPrices.PHP).toFixed(2)}`;
    });
  },

  // Convert tokens
  async convertTokens(amount, fromCurrency, toCurrency) {
    try {
      const response = await fetch(`/api/tokens/convert?amount=${amount}&from=${fromCurrency}&to=${toCurrency}`);
      const result = await response.json();
      
      if (result.success) {
        return result;
      } else {
        throw new Error(result.error || 'Conversion failed');
      }
    } catch (error) {
      console.error('Token conversion error:', error);
      throw error;
    }
  },

  // Update profile modal fields
  updateProfileModal(user) {
    // Update profile name
    const profileName = document.getElementById('profile-name');
    if (profileName) {
      profileName.textContent = user.fullName || user.email;
    }
    
    // Update profile email
    const profileEmail = document.getElementById('profile-email');
    if (profileEmail) {
      profileEmail.textContent = user.email;
    }
    
    // Update profile role
    const profileRole = document.getElementById('profile-role');
    if (profileRole) {
      profileRole.textContent = user.userType ? user.userType.charAt(0).toUpperCase() + user.userType.slice(1) : 'User';
    }
    
    // Update member since date
    const memberSince = document.getElementById('profile-member-since');
    if (memberSince && user.created_at) {
      memberSince.textContent = new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    
    // Update wallet address display
    const walletDisplay = document.getElementById('wallet-address-display');
    if (walletDisplay) {
      if (user.walletAddress) {
        walletDisplay.innerHTML = `
          <span class="wallet-address">${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}</span>
          <button class="btn btn-sm btn-outline" id="disconnect-wallet-btn">
            <i data-lucide="unlink"></i>
            <span>Disconnect</span>
          </button>
        `;
        
        // Re-initialize Lucide icons for the new button
        if (window.lucide) {
          window.lucide.createIcons();
        }
      } else {
        walletDisplay.innerHTML = `
          <span class="wallet-placeholder">No wallet connected</span>
          <button class="btn btn-sm btn-outline" id="connect-wallet-btn">
            <i data-lucide="link"></i>
            <span>Connect Wallet</span>
          </button>
        `;
      }
    }
  },

  // Update balance display in UI
  updateBalanceDisplay(user) {
    const balanceElements = document.querySelectorAll('.user-balance');
    balanceElements.forEach(element => {
      element.textContent = `${user.nchBalance || 0} NCH`;
    });
    
    const totalEarnedElements = document.querySelectorAll('.user-total-earned');
    totalEarnedElements.forEach(element => {
      element.textContent = `${user.totalEarned || 0} NCH`;
    });
  },

  // Update rewards display in UI
  updateRewardsDisplay(rewards) {
    const rewardsContainer = document.getElementById('rewards-list');
    if (rewardsContainer) {
      if (rewards && rewards.length > 0) {
        rewardsContainer.innerHTML = rewards.map(reward => `
          <div class="reward-item ${reward.is_claimed ? 'claimed' : 'unclaimed'}">
            <div class="reward-type">${reward.reward_type}</div>
            <div class="reward-amount">${reward.reward_amount} ${reward.reward_token}</div>
            <div class="reward-description">${reward.description}</div>
            ${!reward.is_claimed ? `
              <button class="claim-reward-btn" data-reward-id="${reward.id}">
                Claim Reward
              </button>
            ` : '<div class="claimed-badge">Claimed</div>'}
          </div>
        `).join('');
        
        // Add claim button handlers
        document.querySelectorAll('.claim-reward-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const rewardId = e.target.dataset.rewardId;
            this.claimReward(rewardId);
          });
        });
      } else {
        rewardsContainer.innerHTML = '<p class="no-rewards">No rewards available yet</p>';
      }
    }
  },

  // Claim a reward
  async claimReward(rewardId) {
    if (!this.authToken) return;
    
    try {
      const response = await fetch('/api/user/rewards/claim', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rewardId })
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.showNotification(`Successfully claimed ${result.claimedAmount} ${result.token}!`, 'success');
        this.loadUserProfile(); // Reload profile to update balance
      } else {
        this.showNotification(result.error || 'Failed to claim reward', 'error');
      }
    } catch (error) {
      console.error('Reward claim error:', error);
      this.showNotification('Failed to claim reward. Please try again.', 'error');
    }
  },

  // Update authentication UI based on login state
  updateAuthUI(isLoggedIn) {
    const authButtons = document.querySelectorAll('.auth-button');
    const userMenu = document.querySelectorAll('.user-menu');
    const loginRequiredElements = document.querySelectorAll('.login-required');
    
    if (isLoggedIn) {
      // Show user menu, hide auth buttons
      authButtons.forEach(btn => btn.style.display = 'none');
      userMenu.forEach(menu => {
        menu.style.display = 'flex';
        menu.classList.add('visible');
      });
      loginRequiredElements.forEach(el => el.classList.remove('hidden'));
      
      // Update user display info
      userMenu.forEach(menu => {
        const userNameElement = menu.querySelector('.user-name');
        if (userNameElement && this.currentUser) {
          userNameElement.textContent = this.currentUser.fullName || this.currentUser.email;
        }
      });
    } else {
      // Show auth buttons, hide user menu
      authButtons.forEach(btn => btn.style.display = 'flex');
      userMenu.forEach(menu => {
        menu.style.display = 'none';
        menu.classList.remove('visible');
      });
      loginRequiredElements.forEach(el => el.classList.add('hidden'));
    }
  },

  // Show notification message
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  },

  // Show registration success
  showRegistrationSuccess(registrationId) {
    // This would typically show a modal or redirect to a success page
    this.showNotification(`Registration successful! Your ID: ${registrationId}`, 'success');
    
    // Switch to analytics tab to see the registration
    setTimeout(() => {
      this.showDashboardDetails();
    }, 1500);
  },

  // ===== WALLET CONNECTION =====
  
  // Initialize wallet connection
  initWalletConnection() {
    // Check if wallet is already connected
    if (window.ethereum) {
      this.checkExistingConnection();
    }
    
    // Setup wallet event listeners
    this.setupWalletEvents();
  },

  // Check for existing wallet connection
  async checkExistingConnection() {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        this.walletAddress = accounts[0];
        // Fetch balance which also updates the UI with correct network checks
        await this.getNCHTokenBalance();
        
        // If user is logged in, update their profile with wallet address
        if (this.currentUser && this.authToken) {
          this.linkWalletToAccount(this.walletAddress);
        }
      }
    } catch (error) {
      console.error('Error checking existing connection:', error);
    }
  },

  // Setup wallet event listeners
  setupWalletEvents() {
    if (window.ethereum) {
      // Handle account changes
      window.ethereum.on('accountsChanged', async (accounts) => {
        if (accounts.length > 0) {
          this.walletAddress = accounts[0];
          await this.getNCHTokenBalance();
          if (this.currentUser && this.authToken) {
            this.linkWalletToAccount(this.walletAddress);
          }
        } else {
          this.walletAddress = null;
          this.updateWalletUI(false);
        }
      });
      
      // Handle chain changes
      window.ethereum.on('chainChanged', () => {
        // Reload page on chain change
        window.location.reload();
      });
    }
  },

  // Connect wallet
  async connectWallet() {
    if (!window.ethereum) {
      this.showNotification('Please install MetaMask to connect your wallet', 'error');
      return;
    }
    
    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length > 0) {
        this.walletAddress = accounts[0];
        this.updateWalletUI(true);
        this.showNotification('Wallet connected successfully!', 'success');
        
        // If user is logged in, link wallet to their account
        if (this.currentUser && this.authToken) {
          await this.linkWalletToAccount(this.walletAddress);
        }
        
        // Get NCH token balance
        await this.getNCHTokenBalance();
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      if (error.code === 4001) {
        this.showNotification('Wallet connection rejected', 'error');
      } else {
        this.showNotification('Failed to connect wallet', 'error');
      }
    }
  },

  // Disconnect wallet
  async disconnectWallet() {
    this.walletAddress = null;
    this.updateWalletUI(false);
    this.showNotification('Wallet disconnected', 'info');
    
    // Update user profile to remove wallet address
    if (this.currentUser && this.authToken) {
      try {
        await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ walletAddress: null })
        });
      } catch (error) {
        console.error('Error unlinking wallet:', error);
      }
    }
  },

  // Link wallet to user account
  async linkWalletToAccount(walletAddress) {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ walletAddress })
      });
      
      if (response.ok) {
        console.log('Wallet linked to account successfully');
      }
    } catch (error) {
      console.error('Error linking wallet to account:', error);
    }
  },

  // Update wallet UI
  updateWalletUI(isConnected, isCorrectNetwork = true) {
    const walletDisplay = document.getElementById('wallet-address-display');
    const dbAddress = document.getElementById('dashboard-wallet-address');
    const dbBalance = document.getElementById('dashboard-blockchain-balance');
    
    if (isConnected && this.walletAddress) {
      if (dbAddress) {
        dbAddress.textContent = `${this.walletAddress.slice(0, 6)}...${this.walletAddress.slice(-4)}`;
      }
      
      if (!isCorrectNetwork) {
        if (dbBalance) {
          dbBalance.textContent = 'Wrong Network';
          dbBalance.style.color = '#ef4444';
        }
        
        if (walletDisplay) {
          walletDisplay.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <span class="wallet-address" style="font-family: monospace; font-size: 0.9em; background: rgba(239, 68, 68, 0.1); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; width: 100%; text-align: center; margin-bottom: 4px;">
                  Wrong Network (${this.walletAddress.slice(0, 6)}...${this.walletAddress.slice(-4)})
                </span>
                <div style="display: flex; gap: 8px; width: 100%;">
                  <button class="btn btn-sm" id="switch-network-btn" style="flex: 1; background: #eab308; border-color: #eab308; color: white; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i>
                    <span>Switch to CHEESE</span>
                  </button>
                  <button class="btn btn-sm btn-outline" id="disconnect-wallet-btn" style="display: flex; align-items: center; justify-content: center; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                    <i data-lucide="unlink" style="width: 14px; height: 14px;"></i>
                  </button>
                </div>
              </div>
            </div>
          `;
          
          if (window.lucide) {
            window.lucide.createIcons();
          }
          
          // Re-attach handlers
          const switchBtn = document.getElementById('switch-network-btn');
          if (switchBtn) {
            switchBtn.addEventListener('click', () => this.switchEthereumNetwork());
          }
          const disconnectBtn = document.getElementById('disconnect-wallet-btn');
          if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => this.disconnectWallet());
          }
        }
      } else {
        const bal = this.blockchainBalance || '0.0000';
        if (dbBalance) {
          dbBalance.textContent = `${bal} NCH`;
          dbBalance.style.color = 'var(--color-primary)';
        }
        
        if (walletDisplay) {
          walletDisplay.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <span class="wallet-address" style="font-family: monospace; font-size: 0.9em; background: rgba(16, 185, 129, 0.1); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.2); color: #10b981;">
                  Connected: ${this.walletAddress.slice(0, 6)}...${this.walletAddress.slice(-4)}
                </span>
                <button class="btn btn-sm btn-outline" id="disconnect-wallet-btn" style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                  <i data-lucide="unlink" style="width: 14px; height: 14px;"></i>
                  <span>Disconnect</span>
                </button>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid var(--color-border);">
                <span style="font-size: 13px; color: var(--color-text-muted);">On-Chain Balance:</span>
                <strong style="color: var(--color-primary); font-size: 1.1em;" id="blockchain-nch-balance">${bal} NCH</strong>
              </div>
            </div>
          `;
          
          if (window.lucide) {
            window.lucide.createIcons();
          }
          
          const disconnectBtn = document.getElementById('disconnect-wallet-btn');
          if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => this.disconnectWallet());
          }
        }
      }
    } else {
      // Disconnected state
      if (dbAddress) {
        dbAddress.textContent = 'Connect wallet to view';
      }
      if (dbBalance) {
        dbBalance.textContent = 'Not Connected';
        dbBalance.style.color = 'var(--color-text-muted)';
      }
      
      if (walletDisplay) {
        walletDisplay.innerHTML = `
          <span class="wallet-placeholder">No wallet connected</span>
          <button class="btn btn-sm btn-outline" id="connect-wallet-btn" style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
            <i data-lucide="link" style="width: 14px; height: 14px;"></i>
            <span>Connect Wallet</span>
          </button>
        `;
        
        if (window.lucide) {
          window.lucide.createIcons();
        }
        
        const connectBtn = document.getElementById('connect-wallet-btn');
        if (connectBtn) {
          connectBtn.addEventListener('click', () => this.connectWallet());
        }
      }
    }
  },

  // Get NCH token balance
  async getNCHTokenBalance() {
    if (!this.walletAddress || !window.ethereum) return;
    
    try {
      const network = await this.getCurrentNetwork();
      if (network && network.chainId !== '20250') {
        console.warn('Wrong network connected. Expected Chain ID 20250 (0x4F2A). Got:', network.chainId);
        this.updateWalletUI(true, false);
        return;
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(this.walletAddress);
      
      // formatEther converts BigInt wei balance to standard ether/native coin string
      const formattedBalance = parseFloat(ethers.formatEther(balance)).toFixed(4);
      this.blockchainBalance = formattedBalance;
      
      this.updateWalletUI(true, true);
    } catch (error) {
      console.error('Error getting token balance:', error);
      this.updateWalletUI(true, true); // Fallback to normal display if call fails
    }
  },

  // Switch to CHEESE network in wallet
  async switchEthereumNetwork() {
    if (!window.ethereum) return;
    
    const cheeseNetwork = {
      chainId: '0x4F2A',
      chainName: 'CHEESE Blockchain',
      nativeCurrency: {
        name: 'NCheese',
        symbol: 'NCH',
        decimals: 18
      },
      rpcUrls: ['https://cheeseblockchain.com/api/rpc'],
      blockExplorerUrls: ['https://cheeseblockchain.com/explorer']
    };
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x4F2A' }]
      });
      this.showNotification('Switched to CHEESE Blockchain network', 'success');
      await this.getNCHTokenBalance();
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [cheeseNetwork]
          });
          this.showNotification('CHEESE Blockchain network added and switched!', 'success');
          await this.getNCHTokenBalance();
        } catch (addError) {
          console.error('Error adding network:', addError);
          this.showNotification('Failed to add CHEESE Blockchain network', 'error');
        }
      } else {
        console.error('Error switching network:', switchError);
        this.showNotification('Failed to switch network', 'error');
      }
    }
  },

  // Get current network
  async getCurrentNetwork() {
    if (!window.ethereum) return null;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      return {
        chainId: network.chainId.toString(),
        name: network.name
      };
    } catch (error) {
      console.error('Error getting network:', error);
      return null;
    }
  },

  // ===== USER DASHBOARD =====
  
  // Initialize user dashboard
  initUserDashboard() {
    // Setup dashboard refresh button
    const refreshBtn = document.getElementById('refresh-dashboard-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshDashboard());
    }
    
    // Setup view all buttons
    const viewActivityBtn = document.getElementById('view-all-activity-btn');
    if (viewActivityBtn) {
      viewActivityBtn.addEventListener('click', () => {
        this.openProfileModal();
      });
    }
    
    const viewRewardsBtn = document.getElementById('view-all-rewards-btn');
    if (viewRewardsBtn) {
      viewRewardsBtn.addEventListener('click', () => {
        this.openProfileModal();
      });
    }
    
    // Initialize token performance chart
    this.initTokenPerformanceChart();
  },

  // Refresh dashboard data
  async refreshDashboard() {
    if (!this.authToken) return;
    
    try {
      await this.loadUserProfile();
      await this.loadUserActivity();
      await this.loadRewardStatistics();
      await this.loadTokenPrices();
      
      this.showNotification('Dashboard refreshed', 'success');
    } catch (error) {
      console.error('Dashboard refresh error:', error);
      this.showNotification('Failed to refresh dashboard', 'error');
    }
  },

  // Load dashboard-specific activity
  async loadDashboardActivity() {
    if (!this.authToken) return;
    
    try {
      const response = await fetch('/api/user/activity?limit=5', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.updateDashboardActivity(result.activities);
      }
    } catch (error) {
      console.error('Dashboard activity error:', error);
    }
  },

  // Update dashboard activity display
  updateDashboardActivity(activities) {
    const activityList = document.getElementById('dashboard-activity-list');
    if (activityList) {
      if (activities && activities.length > 0) {
        activityList.innerHTML = activities.map(activity => `
          <div class="activity-item">
            <div class="activity-type">${activity.activity_type}</div>
            <div class="activity-description">${activity.activity_description}</div>
            <div class="activity-time">${this.formatTimeAgo(new Date(activity.created_at))}</div>
          </div>
        `).join('');
      } else {
        activityList.innerHTML = '<p class="no-activity">No recent activity</p>';
      }
    }
  },

  // Load dashboard-specific rewards
  async loadDashboardRewards() {
    if (!this.authToken) return;
    
    try {
      const response = await fetch('/api/user/rewards', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.updateDashboardRewards(result.rewards.slice(0, 5));
      }
    } catch (error) {
      console.error('Dashboard rewards error:', error);
    }
  },

  // Update dashboard rewards display
  updateDashboardRewards(rewards) {
    const rewardsList = document.getElementById('dashboard-rewards-list');
    if (rewardsList) {
      if (rewards && rewards.length > 0) {
        rewardsList.innerHTML = rewards.map(reward => `
          <div class="reward-item ${reward.is_claimed ? 'claimed' : 'unclaimed'}">
            <div class="reward-type">${reward.reward_type}</div>
            <div class="reward-amount">${reward.reward_amount} ${reward.reward_token}</div>
            <div class="reward-description">${reward.description}</div>
            ${!reward.is_claimed ? `
              <button class="claim-reward-btn" data-reward-id="${reward.id}">
                Claim Reward
              </button>
            ` : '<div class="claimed-badge">Claimed</div>'}
          </div>
        `).join('');
        
        // Add claim button handlers
        rewardsList.querySelectorAll('.claim-reward-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const rewardId = e.target.dataset.rewardId;
            this.claimReward(rewardId);
          });
        });
      } else {
        rewardsList.innerHTML = '<p class="no-rewards">No rewards available yet</p>';
      }
    }
  },

  // Initialize token performance chart
  initTokenPerformanceChart() {
    const canvas = document.getElementById('token-performance-chart');
    if (!canvas) return;
    
    // Load price history and create chart
    this.loadTokenHistoryChart();
  },

  // Load token history chart
  async loadTokenHistoryChart() {
    try {
      const response = await fetch('/api/tokens/history?timeframe=7d&currency=USD');
      const result = await response.json();
      
      if (result.success && window.Chart) {
        this.createTokenChart(result.history);
      }
    } catch (error) {
      console.error('Token history chart error:', error);
    }
  },

  // Create token performance chart
  createTokenChart(history) {
    const canvas = document.getElementById('token-performance-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (this.tokenChart) {
      this.tokenChart.destroy();
    }
    
    const labels = history.map(point => {
      const date = new Date(point.timestamp);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    const data = history.map(point => point.price);
    
    this.tokenChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'NCH Price (USD)',
          data: data,
          borderColor: '#10b981',
          backgroundColor: this.theme === 'dark' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.2)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: this.theme === 'dark' ? '#1c2c24' : '#ffffff',
            titleColor: this.theme === 'dark' ? '#ffffff' : '#000000',
            bodyColor: this.theme === 'dark' ? '#ffffff' : '#000000',
            borderColor: '#10b981',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: this.theme === 'dark' ? '#6b7280' : '#4b5563'
            }
          },
          y: {
            grid: {
              color: this.theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              color: this.theme === 'dark' ? '#6b7280' : '#4b5563',
              callback: function(value) {
                return '$' + value.toFixed(4);
              }
            }
          }
        }
      }
    });
  },

  // Format time ago
  formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) {
      return Math.floor(interval) + ' years ago';
    }
    
    interval = seconds / 2592000;
    if (interval > 1) {
      return Math.floor(interval) + ' months ago';
    }
    
    interval = seconds / 86400;
    if (interval > 1) {
      return Math.floor(interval) + ' days ago';
    }
    
    interval = seconds / 3600;
    if (interval > 1) {
      return Math.floor(interval) + ' hours ago';
    }
    
    interval = seconds / 60;
    if (interval > 1) {
      return Math.floor(interval) + ' minutes ago';
    }
    
    return Math.floor(seconds) + ' seconds ago';
  }
};

// Document DOM Loaded Trigger
document.addEventListener("DOMContentLoaded", () => {
  app.init();
});
