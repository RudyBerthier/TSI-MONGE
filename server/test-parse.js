const fs = require('fs');

function parseMenuText(rawText) {
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
    const catOrder = ['Entrées', 'Plats', 'Accompagnements', 'Desserts'];

    const categoryFromContent = {
        'Entrées': /(?:taboul[eé]|salade|crudité|concombre|carottes?\s*r[aâ]p[eé]|mac[eé]doine|betterave|c[eé]leri|[oœ]eufs?\s*(?:dur|mimosa|mayo)|p[aâ]t[eé]|terrine|melon|avocat|potage|soupe|velout[eé]|surimi|mortadelle|feuilleté|duo\s*de\s*crudité|p[êe]che\s*au\s*thon)/i,
        'Plats': /poulet|dinde|b[oœ]uf|veau|porc|saumon|cabillaud|colin|merlu|steak|burger|couscous|lasagne|omelette|paupiette|cordon\s*bleu|chipolata|brochette|filet|escalope|r[oô]ti|hachis|bolognaise|blanquette|colombo|tajine|nugget|saucisse|merguez|poisson|meuni[eè]re|thon|brandade|jambon|encornet|normandin|pav[eé]|saut[eé]|cr[eé]pinette|kebab|calamars?|fricadelle/i,
        'Accompagnements': /(?:riz|bl[eé]|p[aâ]tes|penne|macaroni|frites?|pur[eé]e|semoule|haricots?\s*(?:verts?|beurre|plats)|pommes?\s*de\s*terre|jardini[eè]re|ratatouille|courgette|gratin|coquillettes|boulgour|lentilles|flageolets|petits?\s*pois|po[eê]l[eé]e|jeunes?\s*carottes?|chou-fleur|brocolis?|nouilles?)/i,
        'Desserts': /yaourt|mousse|tarte|flan|g[aâ]teau|cr[eè]me|compote|fruit|p[aâ]tisserie|biscuit|brownie|clafoutis|crumble|[eé]clair|paris[\s-]*brest|tiramisu|panna|glace|sorbet|petits?\s*suisses?|cocktail\s*de\s*fruits|fromage|beignet|ananas|p[êe]che/i,
    };

    const text = rawText.replace(/\r\n/g, '\n').replace(/\t/g, ' ').replace(/  +/g, ' ').trim();
    const rawLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const isNoise = (line) => {
        if (line.length < 3) return true;
        if (/^\d[\d\s.,€]*$/.test(line)) return true;
        const specialCount = (line.match(/[^a-zA-ZÀ-ÿ\s,./\-'àâäéèêëïîôùûüÿçœæ]/g) || []).length;
        if (specialCount > line.length * 0.3) return true;
        if (/^[@©®™\(\)\[\]\{\}<>|=_\-\*\+#§]+$/i.test(line.replace(/\s/g, ''))) return true;
        if (line.length < 8 && /^[A-Z\s\d@©®\(\)><\-=\*]+$/.test(line) && !days.some(d => line.toUpperCase().includes(d.toUpperCase()))) return true;
        if (/^[,.\-;:!?@©®<>|=\*\+#]/.test(line)) return true;
        if (/menu\s+(de\s+la|du)|semaine\s+du|restauration|scolaire|gestionnaire|proviseur|bon\s*week/i.test(line)) return true;
        if (/©|®|™|dispo|S\dD/i.test(line)) return true;
        if (line.length < 5 && !/^riz$|^bl[eé]$|^pain$/i.test(line)) return true;
        if (/^(?:poisson|viande|bio|local|fait maison|est|le|la|les|du|de|au|et|ou|en)$/i.test(line.trim())) return true;
        if (line === line.toUpperCase() && line.length < 15 && !days.some(d => d.toUpperCase() === line.trim().toUpperCase())) return true;
        return false;
    };

    const rawMenu = { Lundi: [], Mardi: [], Mercredi: [], Jeudi: [], Vendredi: [] };
    let dayIndex = 0;
    let lastMaxCategory = 0;
    let itemId = 1;

    const cleanLines = rawLines.filter(l => !isNoise(l));
    const filteredLines = cleanLines.filter(l => !/^(?:midi|soir|matin|goûter)$/i.test(l.trim()));

    for (const line of filteredLines) {
        const subItems = line.split(/\s*\/\s*/).filter(s => s.trim().length > 2);

        for (const raw of subItems) {
            let trimmed = raw.trim();
            const unPrefixed = trimmed.replace(/^(lundi|mardi|mercredi|jeudi|vendredi|br|eu|;)\s+/i, '');
            if (unPrefixed.length > 3) trimmed = unPrefixed;

            if (isNoise(trimmed)) continue;

            let category = 'Plats';
            if (categoryFromContent['Entrées'].test(trimmed)) category = 'Entrées';
            else if (categoryFromContent['Accompagnements'].test(trimmed)) category = 'Accompagnements';
            else if (categoryFromContent['Desserts'].test(trimmed)) category = 'Desserts';
            else if (categoryFromContent['Plats'].test(trimmed)) category = 'Plats';
            else if (/^fromage/i.test(trimmed)) category = 'Desserts';

            const catIdx = catOrder.indexOf(category);

            if (lastMaxCategory >= 2 && catIdx <= 1) {
                dayIndex = Math.min(dayIndex + 1, 4);
                lastMaxCategory = catIdx;
            } else {
                lastMaxCategory = Math.max(lastMaxCategory, catIdx);
            }

            const currentDay = days[dayIndex];
            const title = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);

            if (rawMenu[currentDay].some(e => e.title.toLowerCase() === title.toLowerCase())) continue;

            rawMenu[currentDay].push({
                id: String(itemId++),
                category,
                title,
                labels: [],
                meal: 'midi',
            });
        }
    }

    const menu = {};
    for (const [day, items] of Object.entries(rawMenu)) {
        let midiItems = [];
        let soirItems = [];

        // DEBUG:
        console.log(`Day: ${day}, Items count: ${items.length}`);

        const byCategory = { Entrées: [], Plats: [], Accompagnements: [], Desserts: [] };
        items.forEach(i => byCategory[i.category].push(i));

        ['Entrées', 'Plats', 'Accompagnements', 'Desserts'].forEach(cat => {
            const arr = byCategory[cat];
            if (arr.length === 1) {
                midiItems.push(arr[0]);
            } else if (arr.length > 1) {
                const split = Math.ceil(arr.length / 2);
                arr.slice(0, split).forEach(i => midiItems.push(i));
                arr.slice(split).forEach(i => soirItems.push(i));
            }
        });

        const sortByCat = (a, b) => catOrder.indexOf(a.category) - catOrder.indexOf(b.category);
        midiItems.sort(sortByCat).forEach(i => i.meal = 'midi');
        soirItems.sort(sortByCat).forEach(i => i.meal = 'soir');

        menu[day] = { midi: midiItems, soir: soirItems };
    }

    return menu;
}

const Tesseract = require('tesseract.js');
async function run() {
    const imagePath = __dirname + '/uploads/cantine/cantine-1773075213807-486888526-648830560_1340989851386981_5355970488994756769_n.jpg';
    const { data: { text } } = await Tesseract.recognize(imagePath, 'fra');
    console.log("Extracted text length:", text.length);
    const result = parseMenuText(text);
    console.log("Parsed result sizes:");
    Object.keys(result).forEach(k => {
        console.log(`- ${k}: midi ${result[k].midi.length}, soir ${result[k].soir.length}`);
    });
}
run();
