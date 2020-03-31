const csvJSON = (csv = "") => {
    const lines = csv.trim().split("\n");

    const [header, ...content] = lines;

    const keys = header.split(",");

    return content.map(item => {
        const row = item.split(",");

        return keys.reduce((acc, key, index) => {
            return { ...acc, [key]: row[index] };
        }, {});
    });
};

module.exports = csvJSON;
