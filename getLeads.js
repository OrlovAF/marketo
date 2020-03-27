const marketo = require('./marketo');
const logger = require('./logger');

const fields = [
    'company',
    'email',
    'leadSource',
    'website',
    'createdAt',
    'updatedAt',
    'id',
];

marketo.getLeadsListJSON(fields).then((result) => {
    console.log(result);

    logger.log({
        level: 'info',
        message: 'Leads list successfully downloaded.'
    });
}).catch((error) => {
    logger.log({
        level: 'error',
        message: `Error occurred while a Leads fetching process. ${JSON.stringify(error)}`
    });
});


