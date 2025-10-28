// src/etl.js

// ---------- Шаг 1. Функции очистки ----------

// "31-03-2025" -> "31.03.2025"
function normalizeDate(raw) {
  const cleaned = raw.trim();
  const parts = cleaned.split(/[-\/.]/); // разбиваем по -, / или .
  const dd = parts[0].padStart(2, "0");
  const mm = parts[1].padStart(2, "0");
  const yyyy = parts[2];
  return dd + "." + mm + "." + yyyy; // формат DD.MM.YYYY
}

// "12 шт" -> 12 , "150,00 руб" -> 150
function normalizeNumber(raw) {
  const cleaned = raw
    .toString()
    .trim()
    .replace(",", ".") // запятая -> точка
    .replace(/[^0-9.]/g, ""); // убираем всё лишнее, кроме цифр и точки
  if (cleaned === "") return 0;
  return parseFloat(cleaned);
}

// "   иВАНОВ    ИВАН  " -> "Иванов И."
function normalizeManagerName(raw) {
  const trimmed = raw.replace(/\s+/g, " ").trim().toLowerCase();
  const parts = trimmed.split(" "); // ["иванов","иван"]
  const surname = parts[0] || "";
  const name = parts[1] || "";
  if (!surname && !name) return "";

  const surnameCap = surname[0].toUpperCase() + surname.slice(1);
  const initial = name ? name[0].toUpperCase() + "." : "";
  return surnameCap + " " + initial; // "Иванов И."
}

// вспомогательное округление до 2 знаков для денег
function round2(x) {
  return Math.round(x * 100) / 100;
}

// делаем тег для месяца: из "31.03.2025" -> "03.2025"
function makeMonthTag(dateStr) {
  const [dd, mm, yyyy] = dateStr.split(".");
  return mm + "." + yyyy;
}

// ---------- Шаг 2. Главная функция сборки ----------
// Она принимает "сырые" данные (из файлов) и возвращает чистые строки.

function buildFinalTable(salesRaw, managersRaw, pricesRaw) {
  // создаём быстрые словари (карты соответствий)

  // по ID заказа -> менеджер, город
  const managerByOrder = {};
  for (let m of managersRaw) {
    managerByOrder[m.orderId] = {
      manager: normalizeManagerName(m.manager),
      city: m.city ? m.city.trim() : "",
    };
  }

  // по продукту -> цена
  const priceByProduct = {};
  for (let p of pricesRaw) {
    priceByProduct[p.product] = normalizeNumber(p.price);
  }

  // идём по продажам
  const finalTable = [];

  for (let sale of salesRaw) {
    const cleanDate = normalizeDate(sale.date); // "31.03.2025"
    const qtyNum = normalizeNumber(sale.qty); // "12 шт" -> 12
    const unitPrice = priceByProduct[sale.product] || 0;
    const sum = qtyNum * unitPrice;

    const mInfo = managerByOrder[sale.orderId] || { manager: "", city: "" };

    finalTable.push({
      date: cleanDate, // "31.03.2025"
      month: makeMonthTag(cleanDate), // "03.2025"
      manager: mInfo.manager, // "Иванов И."
      city: mInfo.city, // "Москва"
      product: sale.product, // "Латте"
      qty: qtyNum, // 12
      price: unitPrice, // 150
      sum: round2(sum), // 1800
    });
  }

  return finalTable;
}

// ---------- Шаг 3. Пример использования ----------
// Это просто пример. Его можно удалить потом.
// Здесь мы делаем фейковые данные, как будто они пришли из CSV.

function example() {
  const salesRaw = [
    {
      orderId: "101",
      date: "31-03-2025",
      product: "Латте",
      qty: "12 шт",
      buyType: "Онлайн",
      payType: "Карта",
    },
    {
      orderId: "102",
      date: "01-04-2025",
      product: "Эспрессо",
      qty: "5",
      buyType: "Оффлайн",
      payType: "Наличные",
    },
  ];

  const managersRaw = [
    { orderId: "101", manager: "   иВАНОВ    ИВАН  ", city: "Москва" },
    { orderId: "102", manager: "Петров П.", city: "Санкт-Петербург" },
  ];

  const pricesRaw = [
    { product: "Латте", price: "150,00 руб" },
    { product: "Эспрессо", price: "120 руб" },
  ];

  const table = buildFinalTable(salesRaw, managersRaw, pricesRaw);
  console.log(table);
}

// раскомментировать, если хочешь протестировать в обычном node.js
// example();

// Экспортируем функции — это пригодится для других файлов (например, r7-macro.js)
module.exports = {
  buildFinalTable,
  normalizeDate,
  normalizeNumber,
  normalizeManagerName,
};
