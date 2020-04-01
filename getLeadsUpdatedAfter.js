const fs = require('fs');
const logger = require('./logger');

const { getMarketoData } = require('./MarketoApi');
const {
    endpoint,
    identity,
    clientId,
    clientSecret
} = require('./marketoConfig');

const timeInPast = new Date();
timeInPast.setDate(timeInPast.getDate() - 9);

getMarketoData(endpoint, identity, clientId, clientSecret, false, timeInPast).then((result) => {

    console.log(`Leads updated after ${timeInPast.toISOString()}`, result);

    fs.writeFileSync('resultUpdated.json', JSON.stringify(result));

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


