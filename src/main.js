function calculateSimpleRevenue(purchase, _product) {
    const discountMultiplier = 1 - (purchase.discount / 100 || 0);
    return _product.sale_price * purchase.quantity * discountMultiplier;
}

function calculateBonusByProfit(index, total, seller) {
    if (index === 0) return +(seller.profit * 0.15).toFixed(2);
    else if (index === 1 || index === 2) return +(seller.profit * 0.1).toFixed(2);
    else if (index === total - 1) return 0;
    else return +(seller.profit * 0.05).toFixed(2);
}

function analyzeSalesData(data, options) {
    if (
        !data ||
        !Array.isArray(data.sellers) ||
        !Array.isArray(data.products) ||
        !Array.isArray(data.purchase_records) ||
        data.sellers.length === 0 ||
        data.products.length === 0 ||
        data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    if (!options || !options.calculateRevenue || !options.calculateBonus) {
        throw new Error('Некорректные опции');
    }

    const { calculateRevenue, calculateBonus } = options;

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

    const sellerIndex = Object.fromEntries(sellerStats.map(s => [s.seller_id, s]));
    const productIndex = Object.fromEntries(data.products.map(p => [p.sku, p]));

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

    sellerStats.sort((a, b) => b.profitCents - a.profitCents);

    sellerStats.forEach((seller, index) => {
        seller.profit = +(seller.profitCents / 100).toFixed(2);
        seller.revenue = +(seller.revenueCents / 100).toFixed(2);
        seller.bonus = calculateBonus(index, sellerStats.length, seller);

        const topProducts = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        seller.top_products = topProducts;
        delete seller.products_sold;
        delete seller.revenueCents;
        delete seller.profitCents;
    });

    return sellerStats;
}

