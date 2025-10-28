// src/r7-macro.js

// Импортируем нашу логику (в среде Р7 может быть по-другому, но в проекте на гите пусть будет так)
const { buildFinalTable } = require("./etl.js");

function mainMacro() {
  // 1. Загрузить CSV (позже заменишь на реальное чтение)
  const salesRaw = loadSalesCsvFromR7();
  const managersRaw = loadManagersCsvFromR7();
  const pricesRaw = loadPricesCsvFromR7();

  // 2. Получить чистую таблицу
  const finalTable = buildFinalTable(salesRaw, managersRaw, pricesRaw);

  // 3. Создать лист "Продажи" и вывести туда данные
  writeToSheet(finalTable);
}

// заглушки — ты потом заменишь реальным API Р7
function loadSalesCsvFromR7() {
  // TODO: тут будет реальное чтение файла "Аналитика продаж.csv"
  return [];
}
function loadManagersCsvFromR7() {
  return [];
}
function loadPricesCsvFromR7() {
  return [];
}

function writeToSheet(finalTable) {
  // TODO: тут будет код типа:
  // let sheet = Api.Workbook.AddSheet("Продажи");
  // sheet.SetValue("A1", "Дата"); ...
  // потом пройтись по finalTable и вставить построчно.
}

module.exports = { mainMacro };
