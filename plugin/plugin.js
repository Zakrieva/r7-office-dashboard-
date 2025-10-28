// plugin/plugin.js
//
// Это плагин для табличного редактора Р7-Офис.
// Он работает внутри редактора и разговаривает с ним через
// window.Asc.plugin.executeMethod(...).
//
// Он делает две вещи:
// 1. Импортирует FinalTable.csv в лист "Продажи".
// 2. Создаёт лист "Дашборд": KPI, сводки, топы.
//

// ======= Вспомогательные парсеры и расчётные функции =======

// Парсим FinalTable.csv, который создал etl.js
// Формат строк: Дата;Месяц;Менеджер;Город;Товар;Кол-во;Цена;Сумма
function parseFinalCsvToObjects(csvText) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== "");
  const header = lines[0].split(";").map((h) => h.trim());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");
    rows.push({
      date: cols[0],
      month: cols[1],
      manager: cols[2],
      city: cols[3],
      product: cols[4],
      qty: parseFloat(cols[5]),
      price: parseFloat(cols[6]),
      sum: parseFloat(cols[7]),
    });
  }

  return rows;
}

// KPI-блоки
function calcKPIs(rows) {
  let totalRevenue = 0;
  let totalQty = 0;
  const managersSet = new Set();

  for (const r of rows) {
    totalRevenue += r.sum;
    totalQty += r.qty;
    if (r.manager && r.manager !== "") {
      managersSet.add(r.manager);
    }
  }

  const avgCheck = rows.length > 0 ? totalRevenue / rows.length : 0;

  return {
    totalRevenue: round2(totalRevenue),
    totalQty: totalQty,
    avgCheck: round2(avgCheck),
    activeManagers: managersSet.size,
  };
}

function groupRevenueByMonth(rows) {
  const map = {};
  for (const r of rows) {
    if (!map[r.month]) map[r.month] = 0;
    map[r.month] += r.sum;
  }
  return Object.keys(map)
    .sort()
    .map((month) => [month, round2(map[month])]);
}

function groupRevenueByProduct(rows) {
  const map = {};
  for (const r of rows) {
    if (!map[r.product]) map[r.product] = 0;
    map[r.product] += r.sum;
  }
  return Object.keys(map)
    .map((prod) => [prod, round2(map[prod])])
    .sort((a, b) => b[1] - a[1]);
}

function topManagers(rows, topN = 3) {
  const map = {};
  for (const r of rows) {
    if (!map[r.manager]) map[r.manager] = 0;
    map[r.manager] += r.sum;
  }
  return Object.keys(map)
    .map((name) => [name, round2(map[name])])
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
}

function buildDetailsTable(rows, limit = 20) {
  const header = ["Дата", "Менеджер", "Товар", "Кол-во", "Сумма"];
  const body = rows
    .slice(0, limit)
    .map((r) => [r.date, r.manager, r.product, r.qty, round2(r.sum)]);
  return { header, body };
}

function round2(x) {
  return Math.round(x * 100) / 100;
}

// ======= Работа с редактором через executeMethod =======
//
// Эти функции — мост между данными и листами.
// ВНИМАНИЕ: здесь стоят FIXME. Когда ты будешь в реальном редакторе,
// нужно будет заменить эти вызовы на настоящие имена методов таблицы
// (например, "AddSheet", "SetCells", "GetSheets", и т.д.)

function getOrCreateSheet(name, callback) {
  // Примерный план:
  // 1. Получить список листов
  // 2. Найти, есть ли уже лист с именем name
  // 3. Если нет — создать
  //
  // Здесь сделаем упрощённо: просто вызываем callback с "виртуальным sheet".
  callback({ sheetName: name });
}

function clearSheet(sheet, callback) {
  // Тут будет что-то вроде:
  // window.Asc.plugin.executeMethod("ClearSheet", [sheet.sheetName], callback)
  callback();
}

// записать одну строку (массив значений) начиная с (rowIndex, startCol)
function writeRow(sheet, rowIndex, startCol, arr, callback) {
  // например, соберём диапазон "A1:H1", "A2:H2" и т.д.
  // В реальном API ты вызовешь SetCells с data=[arr]
  if (callback) callback();
}

// записать таблицу (массив массивов) начиная с ячейки (startRow, startCol)
function writeTable(sheet, startRow, startCol, matrix, callback) {
  // аналогично writeRow, только много строк сразу
  if (callback) callback();
}

// записать одно значение в конкретную ячейку, типа "A1"
function setCell(sheet, cellAddress, value, callback) {
  // Обычно это тоже будет executeMethod("SetCells", ...)
  if (callback) callback();
}

// ======= Генерация листа "Продажи" =======

function buildSalesSheet(finalRows, done) {
  getOrCreateSheet("Продажи", function (sheet) {
    clearSheet(sheet, function () {
      // Заголовок
      const header = [
        "Дата",
        "Месяц",
        "Менеджер",
        "Город",
        "Товар",
        "Кол-во",
        "Цена",
        "Сумма",
      ];
      writeRow(sheet, 1, 1, header, function () {
        // Данные
        const body = finalRows.map((r) => [
          r.date,
          r.month,
          r.manager,
          r.city,
          r.product,
          r.qty,
          r.price,
          r.sum,
        ]);
        writeTable(sheet, 2, 1, body, function () {
          if (done) done();
        });
      });
    });
  });
}

// ======= Генерация листа "Дашборд" =======

function buildDashboardSheet(finalRows, done) {
  const kpis = calcKPIs(finalRows);
  const byMonth = groupRevenueByMonth(finalRows);
  const byProduct = groupRevenueByProduct(finalRows);
  const top3 = topManagers(finalRows, 3);
  const details = buildDetailsTable(finalRows, 20);

  getOrCreateSheet("Дашборд", function (sheet) {
    clearSheet(sheet, function () {
      // KPI блок (A1:B4)
      setCell(sheet, "A1", "Общая сумма продаж:");
      setCell(sheet, "B1", kpis.totalRevenue);

      setCell(sheet, "A2", "Общее количество проданных единиц:");
      setCell(sheet, "B2", kpis.totalQty);

      setCell(sheet, "A3", "Средний чек:");
      setCell(sheet, "B3", kpis.avgCheck);

      setCell(sheet, "A4", "Активных менеджеров:");
      setCell(sheet, "B4", kpis.activeManagers);

      // Продажи по месяцам (A6:B?)
      writeRow(sheet, 6, 1, ["Месяц", "Выручка"]);
      writeTable(sheet, 7, 1, byMonth);

      // Структура продаж по товарам (D6:E?)
      writeRow(sheet, 6, 4, ["Товар", "Выручка"]);
      writeTable(sheet, 7, 4, byProduct);

      // ТОП-3 менеджеров (G6:H8)
      writeRow(sheet, 6, 7, ["Менеджер", "Продажи"]);
      writeTable(sheet, 7, 7, top3);

      // Детализация (A15:?)
      writeRow(sheet, 15, 1, details.header);
      writeTable(sheet, 16, 1, details.body, function () {
        if (done) done();
      });
    });
  });
}

// ======= Жизненный цикл плагина =======

// Когда плагин загружается
window.Asc.plugin.init = function () {
  console.log("Плагин дашборда инициализирован");
};

// Когда пользователь нажимает кнопку в окне плагина
// (например, "Импортировать данные")
document.addEventListener("DOMContentLoaded", function () {
  const btnImport = document.getElementById("btnImport");
  const btnDashboard = document.getElementById("btnDashboard");

  btnImport.addEventListener("click", async () => {
    // Шаг 1. Получить текст FinalTable.csv (нужно будет заменить на настоящий способ)
    // FIXME: нужно вызвать executeMethod("OpenFile", ...) или аналог
    const csvText = ""; // <- сюда ты подставишь считанный CSV текст

    // Шаг 2. Распарсить CSV в массив объектов
    const finalRows = parseFinalCsvToObjects(csvText);

    // Шаг 3. Создать лист "Продажи"
    buildSalesSheet(finalRows, function () {
      alert("Лист 'Продажи' готов");
    });
  });

  btnDashboard.addEventListener("click", async () => {
    const csvText = ""; // FIXME: опять получаем FinalTable.csv
    const finalRows = parseFinalCsvToObjects(csvText);

    buildDashboardSheet(finalRows, function () {
      alert("Лист 'Дашборд' готов");
    });
  });
});

// Обязательная штука для закрытия плагина
window.Asc.plugin.button = function (id) {
  if (id === 0) {
    window.Asc.plugin.executeCommand("close", "");
  }
};
