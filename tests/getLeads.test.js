const { matchers } = require('jest-json-schema');
expect.extend(matchers);

const marketo = require('../marketo');

const schema = {
    properties: {
        id: { type: 'string' },
        email: { type: 'string' },
    },
    required: ['id', 'email'],
};

test('Test success fetching leads as JSON', () => {
    return marketo.getLeadsListJSON(['id', 'email']).then((data) => {
        const dataDecoded = JSON.parse(data);

        dataDecoded.forEach((value) => {
            expect(value).toMatchSchema(schema);
        });
    });
}, 5 * 100 * 60 * 60);

test('Test wrong static list name', () => {
    const listName = 'Wrong List Name';

    return marketo.getLeadsListJSON(['id', 'email'], { staticListName: listName }).catch((error) => {
        expect(error.name).toMatch('HttpError');
        expect(error.message).toMatch(`Static list '${listName}' not found`);
    });
}, 5 * 100 * 60 * 60);
