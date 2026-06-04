const Tesseract = require('tesseract.js');

async function testStructure() {
    const imagePath = __dirname + '/uploads/cantine/cantine-1773075213807-486888526-648830560_1340989851386981_5355970488994756769_n.jpg';
    const { data } = await Tesseract.recognize(imagePath, 'fra');

    Object.keys(data).forEach(k => {
        let val = data[k];
        let type = typeof val;
        let size = 0;
        if (type === 'string') size = val.length;
        else if (Array.isArray(val)) size = val.length;
        else if (val) size = Object.keys(val).length;
        console.log(`Key: ${k}, Type: ${type}, Size: ${size}`);
    });

    if (data.blocks && data.blocks.length > 0) {
        console.log("Blocks preview:", JSON.stringify(data.blocks[0]).substring(0, 300));
    }
}

testStructure().catch(console.error);
