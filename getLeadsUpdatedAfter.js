const fs = require('fs');
const logger = require('./logger');

const { getMarketoData } = require('./MarketoApi');
const {
    endpoint,
    identity,
    clientId,
    clientSecret
} = require('./marketoConfig');

const oneDayAgo = new Date();
oneDayAgo.setDate(oneDayAgo.getDate() - 1);

getMarketoData(endpoint, identity, clientId, clientSecret, false, oneDayAgo).then((result) => {

    console.log(`Leads updated after ${oneDayAgo.toISOString()}`, result);

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


