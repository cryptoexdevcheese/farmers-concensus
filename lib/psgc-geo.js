const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../node_modules/@jobuntux/psgc/data/2025-2Q');

let provinces = null;
let municipalitiesByProvince = null;
let barangaysByMunCity = null;

function trimName(name) {
  return (name || '').trim();
}

function loadGeo() {
  if (provinces) return;

  const provincesRaw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'provinces.json'), 'utf8'));
  provinces = provincesRaw
    .map((p) => ({
      psgcCode: p.psgcCode,
      regCode: p.regCode,
      provCode: p.provCode,
      name: trimName(p.provName),
      cityClass: p.cityClass
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const muncitiesRaw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'muncities.json'), 'utf8'));
  municipalitiesByProvince = {};
  muncitiesRaw.forEach((m) => {
    const key = `${m.regCode}-${m.provCode}`;
    if (!municipalitiesByProvince[key]) municipalitiesByProvince[key] = [];
    municipalitiesByProvince[key].push({
      psgcCode: m.psgcCode,
      munCityCode: m.munCityCode,
      name: trimName(m.munCityName)
    });
  });
  Object.values(municipalitiesByProvince).forEach((list) =>
    list.sort((a, b) => a.name.localeCompare(b.name))
  );

  const barangaysRaw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'barangays.json'), 'utf8'));
  barangaysByMunCity = {};
  barangaysRaw.forEach((b) => {
    const key = b.munCityCode;
    if (!barangaysByMunCity[key]) barangaysByMunCity[key] = [];
    barangaysByMunCity[key].push(trimName(b.brgyName));
  });
  Object.values(barangaysByMunCity).forEach((list) => list.sort((a, b) => a.localeCompare(b)));
}

function getProvinces() {
  loadGeo();
  return provinces;
}

function getMunicipalities(regCode, provCode) {
  loadGeo();
  return municipalitiesByProvince[`${regCode}-${provCode}`] || [];
}

function getBarangays(munCityCode) {
  loadGeo();
  return barangaysByMunCity[munCityCode] || [];
}

module.exports = {
  loadGeo,
  getProvinces,
  getMunicipalities,
  getBarangays
};
