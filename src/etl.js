// src/etl.js
//
// 1. Читает исходные CSV из папки data/
//    - SalesAnalyticks.csv (продажи)
//    - Managers.csv        (менеджеры)
//    - Price.csv           (цены)
// 2. Очищает и объединяет данные
// 3. Создаёт data/FinalTable.csv — нормализованную таблицу "Продажи"
//
// Запуск: node src/etl.js

const fs = require("fs");
const path = require("path");

// ==== Утилиты очистки ====

function normalizeDate(raw) {
  if (!raw) return "";
  const cleaned = raw.trim();
  const parts = cleaned.split(/[-\/.]/); // допускаем "-", "/", "."
  const dd = parts[0] ? parts[0].padStart(2, "0") : "";
  const mm = parts[1] ? parts[1].padStart(2, "0") : "";
  const yyyy = parts[2] || "";
  return dd + "." + mm + "." + yyyy; // формируем DD.MM.YYYY
}

function normalizeNumber(raw) {
  if (raw === undefined || raw === null) return 0;
  const cleaned = raw
    .toString()
    .trim()
    .replace(",", ".")
    .replace(/\s+/g, "")
    .replace(/[^0-9.]/g, "");
  if (cleaned === "") return 0;
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function normalizeManagerName(raw) {
  if (!raw) return "";
  const trimmed = raw.replace(/\s+/g, " ").trim().toLowerCase(); // "иванов иван"
  const parts = trimmed.split(" ");
  const surname = parts[0] || "";
  const name = parts[1] || "";

  if (!surname && !name) return "";

  const surnameCap =
    surname.length > 0 ? surname[0].toUpperCase() + surname.slice(1) : "";
  const initial = name ? name[0].toUpperCase() + "." : "";

  return (surnameCap + " " + initial).trim(); // "Иванов И."
}

function round2(x) {
  return Math.round(x * 100) / 100;
}

function makeMonthTag(dateStr) {
  const [dd, mm, yyyy] = dateStr.split(".");
  if (!mm || !yyyy) return "";
  return mm + "." + yyyy; // "03.2025"
}

// ==== Чтение CSV (с разделителем ;) ====

function readCsvSemicolon(filePath) {
  const csvText = fs.readFileSync(filePath, "utf8");

  const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].split(";").map((h) => h.trim());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      const val = cols[c] !== undefined ? cols[c].trim() : "";
      obj[key] = val;
    }
    rows.push(obj);
  }

  return { headers, rows };
}

// ==== Объединение данных в таблицу "Продажи" ====

function buildFinalTable(salesRows, managerRows, priceRows) {
  // словарь: ID заказа -> {manager, city}
  const managerByOrder = {};
  for (const row of managerRows) {
    const orderId = row["ID заказа"];
    const managerName = row["Менеджер"];
    const city = row["Город"];
    managerByOrder[orderId] = {
      manager: normalizeManagerName(managerName),
      city: city ? city.trim() : "",
    };
  }

  // словарь: Продукт -> Цена
  const priceByProduct = {};
  for (const row of priceRows) {
    const productName = row["Продукт"];
    const rawPrice =
      row["Цена за г/мл, руб."] || row["Цена"] || row["Цена, руб."] || "";
    priceByProduct[productName] = normalizeNumber(rawPrice);
  }

  // собираем финальную таблицу
  const finalTable = [];

  for (const sale of salesRows) {
    const orderId = sale["ID заказа"];
    const rawDate = sale["Дата"];
    const product = sale["Продукт"];
    const rawQty = sale["Количество"];

    const cleanDate = normalizeDate(rawDate); // "31.03.2025"
    const qtyNum = normalizeNumber(rawQty); // "12 шт" -> 12
    const unitPrice = priceByProduct[product] || 0;
    const sum = qtyNum * unitPrice;

    const mgr = managerByOrder[orderId] || { manager: "", city: "" };

    finalTable.push({
      date: cleanDate,
      month: makeMonthTag(cleanDate),
      manager: mgr.manager,
      city: mgr.city,
      product: product,
      qty: qtyNum,
      price: unitPrice,
      sum: round2(sum),
    });
  }

  return finalTable;
}

// ==== Сохранение результата в CSV ====

function saveFinalTableAsCsv(finalTable, outPath) {
  const headers = [
    "Дата",
    "Месяц",
    "Менеджер",
    "Город",
    "Товар",
    "Кол-во",
    "Цена",
    "Сумма",
  ];

  const lines = [];
  lines.push(headers.join(";"));

  for (const row of finalTable) {
    const line = [
      row.date,
      row.month,
      row.manager,
      row.city,
      row.product,
      row.qty,
      row.price,
      row.sum,
    ].join(";");
    lines.push(line);
  }

  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log("Файл сохранён:", outPath);
}

// ==== Точка запуска ====

function runLocalETL() {
  const salesPath = path.join(__dirname, "..", "data", "SalesAnalyticks.csv");
  const managersPath = path.join(__dirname, "..", "data", "Managers.csv");
  const pricesPath = path.join(__dirname, "..", "data", "Price.csv");

  const salesCsv = readCsvSemicolon(salesPath);
  const managersCsv = readCsvSemicolon(managersPath);
  const pricesCsv = readCsvSemicolon(pricesPath);

  const finalTable = buildFinalTable(
    salesCsv.rows,
    managersCsv.rows,
    pricesCsv.rows
  );

  console.log("Пример данных:", finalTable.slice(0, 5));
  const outPath = path.join(__dirname, "..", "data", "FinalTable.csv");
  saveFinalTableAsCsv(finalTable, outPath);
}

// запускаем, когда файл вызывается напрямую через node
if (require.main === module) {
  runLocalETL();
}

// экспорт для использования из других файлов (если нужно)
module.exports = {
  runLocalETL,
  buildFinalTable,
  normalizeDate,
  normalizeNumber,
  normalizeManagerName,
};
