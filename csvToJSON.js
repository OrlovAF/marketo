const csvJSON = (csv = '') => {
    const lines = csv.trim().split('\n');

    const [header, ...content] = lines;

    const keys = header.split(',');

    const result = content.map((item) => {
        const row = item.split(',');

        return Object.fromEntries(keys.map((key, index) => [key, row[index]]));
    });

    return JSON.stringify(result);
};

module.exports = csvJSON;
