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
    
    // Blockchain Integration
    this.checkBlockchainStatus();
    this.initBuyerRegistration();
    
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

  // Load state from local storage or data.js
  loadState() {
    const saved = localStorage.getItem("farmers_consensus_data");
    if (saved) {
      try {
        this.registrations = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved registrations, resetting.", e);
        this.registrations = [];
      }
    } else {
      this.registrations = [];
      localStorage.setItem("farmers_consensus_data", JSON.stringify(this.registrations));
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

  // Dynamic Geographic Dropdown logic: Province -> Municipality -> Barangay
  initGeographicDropdowns() {
    const provinceSelect = document.getElementById("select-province");
    const municipalitySelect = document.getElementById("select-municipality");
    const barangaySelect = document.getElementById("select-barangay");
    const customRow = document.getElementById("custom-barangay-row");
    const customInput = document.getElementById("custom-barangay");

    // Populate Provinces
    Object.keys(PHILIPPINES_GEOGRAPHY).sort().forEach(province => {
      const option = document.createElement("option");
      option.value = province;
      option.textContent = province;
      provinceSelect.appendChild(option);
    });

    // Handle Province Selection
    provinceSelect.addEventListener("change", (e) => {
      const selectedProvince = e.target.value;
      
      // Reset Municipality and Barangay Dropdowns
      municipalitySelect.innerHTML = '<option value="">-- Select Municipality --</option>';
      municipalitySelect.disabled = true;
      barangaySelect.innerHTML = '<option value="">-- Select Barangay --</option>';
      barangaySelect.disabled = true;

      // Hide and reset custom input
      customRow.classList.add("hidden");
      customInput.value = "";
      customInput.required = false;
      customInput.parentElement.parentElement.classList.remove("invalid");

      // Reset Error outlines on change
      provinceSelect.parentElement.classList.remove("invalid");

      if (selectedProvince) {
        const municipalities = Object.keys(PHILIPPINES_GEOGRAPHY[selectedProvince]).sort();
        municipalities.forEach(mun => {
          const option = document.createElement("option");
          option.value = mun;
          option.textContent = mun;
          municipalitySelect.appendChild(option);
        });
        municipalitySelect.disabled = false;
      }
      this.updateEstimator();
    });

    // Handle Municipality Selection
    municipalitySelect.addEventListener("change", (e) => {
      const selectedProvince = provinceSelect.value;
      const selectedMun = e.target.value;

      // Reset Barangay Dropdown
      barangaySelect.innerHTML = '<option value="">-- Select Barangay --</option>';
      barangaySelect.disabled = true;

      // Hide and reset custom input
      customRow.classList.add("hidden");
      customInput.value = "";
      customInput.required = false;
      customInput.parentElement.parentElement.classList.remove("invalid");

      // Reset Error outlines on change
      municipalitySelect.parentElement.classList.remove("invalid");

      if (selectedMun) {
        const barangays = PHILIPPINES_GEOGRAPHY[selectedProvince][selectedMun].sort();
        barangays.forEach(brgy => {
          const option = document.createElement("option");
          option.value = brgy;
          option.textContent = brgy;
          barangaySelect.appendChild(option);
        });
        
        // Append dynamic "Other Barangay" option
        const otherOption = document.createElement("option");
        otherOption.value = "other";
        otherOption.textContent = "✍️ Other Barangay (Type Name...)";
        barangaySelect.appendChild(otherOption);

        barangaySelect.disabled = false;
      }
      this.updateEstimator();
    });

    // Handle Barangay Selection
    barangaySelect.addEventListener("change", (e) => {
      barangaySelect.parentElement.classList.remove("invalid");
      
      if (e.target.value === "other") {
        customRow.classList.remove("hidden");
        customInput.focus();
        customInput.required = true;
      } else {
        customRow.classList.add("hidden");
        customInput.value = "";
        customInput.required = false;
        customInput.parentElement.parentElement.classList.remove("invalid");
      }
      this.updateEstimator();
    });
  },

  // Render Vegetable Chips dynamically
  renderVegetableChips() {
    const grid = document.getElementById("vegetables-grid");
    grid.innerHTML = "";

    VEGETABLES.forEach(veg => {
      const chip = document.createElement("div");
      chip.className = "veg-chip";
      chip.setAttribute("data-veg-id", veg.id);
      chip.style.setProperty("--chip-color", veg.color);

      chip.innerHTML = `
        <div class="veg-name">${veg.name}</div>
        <div class="veg-tag">${veg.tag}</div>
      `;

      chip.addEventListener("click", () => {
        this.selectVegetableChip(veg.id);
      });

      grid.appendChild(chip);
    });
  },

  // Select a Vegetable Chip
  selectVegetableChip(vegId) {
    const chips = document.querySelectorAll(".veg-chip");
    chips.forEach(c => c.classList.remove("selected"));

    const targetChip = document.querySelector(`.veg-chip[data-veg-id="${vegId}"]`);
    if (targetChip) {
      targetChip.classList.add("selected");
      this.selectedVegetableId = vegId;
      document.getElementById("selected-vegetable-id").value = vegId;

      // Clear error formatting if any
      document.getElementById("vegetables-grid").parentElement.classList.remove("invalid");

      // Handle "Other Vegetables" selection
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
    }

    this.updateEstimator();
  },

  // Live Estimator Listener hooks
  initCalculatorListeners() {
    const landAreaInput = document.getElementById("land-area");
    const unitSelect = document.getElementById("area-unit");
    const plantingDateInput = document.getElementById("planting-date");

    landAreaInput.addEventListener("input", () => {
      landAreaInput.parentElement.parentElement.classList.remove("invalid");
      this.updateEstimator();
    });

    unitSelect.addEventListener("change", () => {
      this.updateEstimator();
    });

    plantingDateInput.addEventListener("change", () => {
      plantingDateInput.parentElement.classList.remove("invalid");
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
    const vegetable = VEGETABLES.find(v => v.id === this.selectedVegetableId);
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
        nameInput.parentElement.parentElement.classList.add("invalid");
        isValid = false;
      } else {
        nameInput.parentElement.parentElement.classList.remove("invalid");
      }

      // Validate Contact (11-digit mobile starting with 09)
      const contactRegex = /^09\d{9}$/;
      if (!contactRegex.test(contactInput.value.trim())) {
        contactInput.parentElement.parentElement.classList.add("invalid");
        isValid = false;
      } else {
        contactInput.parentElement.parentElement.classList.remove("invalid");
      }

      // Validate Geographical drop-downs
      if (!provinceSelect.value) {
        provinceSelect.parentElement.classList.add("invalid");
        isValid = false;
      } else {
        provinceSelect.parentElement.classList.remove("invalid");
      }

      if (!municipalitySelect.value) {
        municipalitySelect.parentElement.classList.add("invalid");
        isValid = false;
      } else {
        municipalitySelect.parentElement.classList.remove("invalid");
      }

      // Validate Barangay select box & custom input fallback
      if (!barangaySelect.value) {
        barangaySelect.parentElement.classList.add("invalid");
        isValid = false;
      } else if (barangaySelect.value === "other") {
        barangaySelect.parentElement.classList.remove("invalid");
        const customInput = document.getElementById("custom-barangay");
        if (!customInput.value.trim()) {
          customInput.parentElement.parentElement.classList.add("invalid");
          isValid = false;
        } else {
          customInput.parentElement.parentElement.classList.remove("invalid");
        }
      } else {
        barangaySelect.parentElement.classList.remove("invalid");
        document.getElementById("custom-barangay").parentElement.parentElement.classList.remove("invalid");
      }

      // Validate Selected Crop Chip
      if (!this.selectedVegetableId) {
        document.getElementById("vegetables-grid").parentElement.classList.add("invalid");
        isValid = false;
      } else {
        document.getElementById("vegetables-grid").parentElement.classList.remove("invalid");
        
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
        landAreaInput.parentElement.parentElement.parentElement.classList.add("invalid");
        isValid = false;
      } else {
        landAreaInput.parentElement.parentElement.parentElement.classList.remove("invalid");
      }

      // Validate Planting Date
      if (!plantingDateInput.value) {
        plantingDateInput.parentElement.classList.add("invalid");
        isValid = false;
      } else {
        plantingDateInput.parentElement.classList.remove("invalid");
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
      const vegetable = VEGETABLES.find(v => v.id === this.selectedVegetableId);
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
        timestamp: new Date().toISOString()
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
      
      const chips = document.querySelectorAll(".veg-chip");
      chips.forEach(c => c.classList.remove("selected"));

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

  // Initialize Province Filter Dropdowns
  initProvinceFilters() {
    // Get unique provinces from registrations
    const provinces = [...new Set(this.registrations.map(r => r.province))].sort();
    
    // Populate Crop Share Profile province filter
    const cropShareFilter = document.getElementById("crop-share-province-filter");
    provinces.forEach(province => {
      const option = document.createElement("option");
      option.value = province;
      option.textContent = province;
      cropShareFilter.appendChild(option);
    });

    // Populate Supply Timeline Planner province filter
    const timelineFilter = document.getElementById("timeline-province-filter");
    provinces.forEach(province => {
      const option = document.createElement("option");
      option.value = province;
      option.textContent = province;
      timelineFilter.appendChild(option);
    });

    // Add event listeners for filtering
    cropShareFilter.addEventListener("change", () => {
      this.updateCharts();
    });

    timelineFilter.addEventListener("change", () => {
      this.updateCharts();
    });
  },

  // Refresh Chart.js canvases with current state values
  updateCharts() {
    if (!this.charts.cropShare || !this.charts.provinceIntensity || !this.charts.timeline) return;

    // Get selected province filters
    const cropShareProvince = document.getElementById("crop-share-province-filter").value;
    const timelineProvince = document.getElementById("timeline-province-filter").value;

    // Redraw Crop Share Doughnut
    this.charts.cropShare.data = this.getCropShareData(cropShareProvince);
    this.charts.cropShare.options.plugins.legend.labels.color = this.theme === "dark" ? "#a7f3d0" : "#3b5245";
    this.charts.cropShare.update();

    // Redraw Province Bar Chart
    this.charts.provinceIntensity.data = this.getProvinceIntensityData();
    this.charts.provinceIntensity.options.scales.x.grid.color = this.theme === "dark" ? "rgba(52, 211, 153, 0.08)" : "rgba(16, 185, 129, 0.08)";
    this.charts.provinceIntensity.options.scales.x.ticks.color = this.theme === "dark" ? "#a7f3d0" : "#3b5245";
    this.charts.provinceIntensity.options.scales.y.ticks.color = this.theme === "dark" ? "#a7f3d0" : "#3b5245";
    this.charts.provinceIntensity.options.scales.x.title.color = this.theme === "dark" ? "#6ee7b7" : "#6b8475";
    this.charts.provinceIntensity.update();

    // Redraw Supply Timeline
    this.charts.timeline.data = this.getTimelineData(timelineProvince);
    this.charts.timeline.options.scales.x.ticks.color = this.theme === "dark" ? "#a7f3d0" : "#3b5245";
    this.charts.timeline.options.scales.y.ticks.color = this.theme === "dark" ? "#a7f3d0" : "#3b5245";
    this.charts.timeline.options.scales.y.grid.color = this.theme === "dark" ? "rgba(52, 211, 153, 0.08)" : "rgba(16, 185, 129, 0.08)";
    this.charts.timeline.options.scales.x.title.color = this.theme === "dark" ? "#6ee7b7" : "#6b8475";
    this.charts.timeline.options.scales.y.title.color = this.theme === "dark" ? "#6ee7b7" : "#6b8475";
    this.charts.timeline.update();
  },

  // Dynamic calculations for Crop Share doughnut
  getCropShareData(provinceFilter = "all") {
    const cropAreas = {};
    VEGETABLES.forEach(v => cropAreas[v.id] = 0);

    const filteredRegistrations = provinceFilter === "all" 
      ? this.registrations 
      : this.registrations.filter(r => r.province === provinceFilter);

    filteredRegistrations.forEach(r => {
      if (cropAreas[r.vegetableId] !== undefined) {
        cropAreas[r.vegetableId] += r.areaHa;
      }
    });

    const labels = [];
    const data = [];
    const colors = [];

    VEGETABLES.forEach(v => {
      if (cropAreas[v.id] > 0) {
        labels.push(`${v.emoji} ${v.name}`);
        data.push(cropAreas[v.id]);
        colors.push(v.color);
      }
    });

    // In case there's no data
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
  getProvinceIntensityData() {
    const provinceAreas = {};

    this.registrations.forEach(r => {
      provinceAreas[r.province] = (provinceAreas[r.province] || 0) + r.areaHa;
    });

    const sortedProvinces = Object.keys(provinceAreas).sort((a, b) => provinceAreas[b] - provinceAreas[a]);
    const datasetsData = sortedProvinces.map(p => provinceAreas[p]);

    return {
      labels: sortedProvinces,
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
  getTimelineData(provinceFilter = "all") {
    const monthlyYields = {};
    const monthsKeys = [];

    // Form list of next 6 months
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

    const filteredRegistrations = provinceFilter === "all" 
      ? this.registrations 
      : this.registrations.filter(r => r.province === provinceFilter);

    filteredRegistrations.forEach(r => {
      const hDate = new Date(r.harvestDate);
      const hYear = hDate.getFullYear();
      const hMonth = hDate.getMonth();

      // Find matching index inside next 6 months list
      const match = monthsKeys.find(m => m.year === hYear && m.month === hMonth);
      if (match) {
        monthlyYields[match.label] += r.expectedYieldTons;
      }
    });

    const labels = monthsKeys.map(m => m.label);
    const data = labels.map(l => monthlyYields[l]);

    const greenGradient = Chart.defaults.color; // Backup standard color
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
      const veg = VEGETABLES.find(v => v.id === id);
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
      const veg = VEGETABLES.find(v => v.id === r.vegetableId) || { name: "Unknown", emoji: "🌱", tag: "Gulay", color: "#10b981", maturationDays: 60 };
      const displayVegetableName = r.vegetableName || veg.name;
      const row = document.createElement("tr");

      // Format Date string
      const opt = { year: "numeric", month: "short", day: "numeric" };
      const hDateFormatted = new Date(r.harvestDate).toLocaleDateString("en-US", opt);

      row.innerHTML = `
        <td data-label="ID"><span class="registry-id">${r.id}</span></td>
        <td data-label="Farmer">
          <span class="farmer-main">${r.farmerName}</span>
          <span class="farmer-sub"><i data-lucide="phone" style="width:10px; height:10px; display:inline-block; margin-right:4px;"></i>${r.contact}</span>
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
        const veg = VEGETABLES.find(v => v.id === r.vegetableId) || { name: "Unknown" };
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
      navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('SW registered'))
        .catch(error => console.log('SW registration failed'));
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
  }
};

// Document DOM Loaded Trigger
document.addEventListener("DOMContentLoaded", () => {
  app.init();
});
