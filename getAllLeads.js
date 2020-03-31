const fs = require('fs');
const logger = require('./logger');

const { getMarketoData } = require('./MarketoApi');
const {
    endpoint,
    identity,
    clientId,
    clientSecret
} = require('./marketoConfig');

getMarketoData(endpoint, identity, clientId, clientSecret).then((result) => {

    console.log('All Leads', result);

    fs.writeFileSync('resultAll.json', JSON.stringify(result));

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


