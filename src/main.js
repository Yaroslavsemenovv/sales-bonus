/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) return +(seller.profit * 0.15).toFixed(2);
    else if (index === 1 || index === 2) return +(seller.profit * 0.1).toFixed(2);
    else if (index === total - 1) return 0;
    else return +(seller.profit * 0.05).toFixed(2);
}

/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const discount = 1 - (purchase.discount / 100 || 0);
    return _product.sale_price * purchase.quantity * discount;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Шаг 1. Проверьте входные данные
    if (!data
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.products)
        || !Array.isArray(data.purchase_records)
        || data.sellers.length === 0
        || data.products.length === 0
        || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    // Шаг 2. Проверьте, что требуемые функции есть в опциях
    if (!options || !options.calculateRevenue || !options.calculateBonus) {
        throw new Error('Чего-то не хватает');
    }

    const { calculateRevenue, calculateBonus } = options;

    // Шаг 3. Подготовьте промежуточные данные для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenueCents: 0,
        profitCents: 0,
        sales_count: 0,
        products_sold: {},
        top_products: [],
        bonus: 0
    }));

    // Шаг 4. Преобразуйте продавцов и товары в объекты
    const sellerIndex = Object.fromEntries(sellerStats.map(s => [s.seller_id, s]));
    const productIndex = Object.fromEntries(data.products.map(p => [p.sku, p]));

    // Этап 3. Реализация бизнес-логики
    // Шаг 1. Добавьте двойной цикл перебора чеков и покупок в них
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        seller.sales_count += 1;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            const revenue = calculateRevenue(item, product);
            const cost = product.purchase_price * item.quantity;

            seller.revenueCents += Math.round(revenue * 100);
            seller.profitCents += Math.round((revenue - cost) * 100);

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // Шаг 2. Упорядочите продавцов по прибыли
    sellerStats.sort((a, b) => b.profitCents - a.profitCents);

    // Шаг 3. Назначьте премии на основе ранжирования
    sellerStats.forEach((seller, index) => {
        seller.profit = +(seller.profitCents / 100).toFixed(2);
        seller.revenue = +(seller.revenueCents / 100).toFixed(2);
        seller.bonus = calculateBonus(index, sellerStats.length, seller);

        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        delete seller.products_sold;
        delete seller.revenueCents;
        delete seller.profitCents;
    });

    // Шаг 4. Сформируйте результат
    return sellerStats;
}


