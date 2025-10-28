// src/dashboard.js
//
// Логика дашборда: расчёт KPI, группировок, топов и детальной таблицы.

function round2(x) {
  return Math.round(x * 100) / 100;
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

// группировка по месяцам: [["03.2025", 1234.5], ...]
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

// группировка по товарам: [["Картошка фри", 3000], ...]
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

// топ N менеджеров
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

// таблица детализации для дашборда
function buildDetailsTable(rows, limit = 20) {
  const header = ["Дата", "Менеджер", "Товар", "Кол-во", "Сумма"];
  const body = rows
    .slice(0, limit)
    .map((r) => [r.date, r.manager, r.product, r.qty, round2(r.sum)]);
  return { header, body };
}

module.exports = {
  calcKPIs,
  groupRevenueByMonth,
  groupRevenueByProduct,
  topManagers,
  buildDetailsTable,
};
