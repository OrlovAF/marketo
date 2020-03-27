const csvToJSON = require('../csvToJSON');

const csv = 'column1,column2,column3\n' +
    'row1_value1,row1_value2,row1_value3\n' +
    'row2_value1,row2_value2,row2_value3\n';

const resultShouldBe = `[{"column1":"row1_value1","column2":"row1_value2","column3":"row1_value3"},{"column1":"row2_value1","column2":"row2_value2","column3":"row2_value3"}]`;

test('test csvToJSON valid convert', () => {
    expect(csvToJSON(csv)).toBe(resultShouldBe);
});
