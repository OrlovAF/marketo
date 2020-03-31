const MarketoApi = require('./MarketoApi');
const logger = require('./logger');

const configs = require('./marketoConfig');

const marketoApi = new MarketoApi(configs);

marketoApi.fetchAllLeads().then((result) => {

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


