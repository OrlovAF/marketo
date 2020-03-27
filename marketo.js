const Marketo = require('node-marketo-rest');

// Utils
const csvToJSON = require('./csvToJSON');

// Configs
const configs = require('./marketoConfig');

const marketoApi = new Marketo(configs);

const startAt = new Date();

startAt.setDate(startAt.getHours() - 2);

exports.getLeadsListJSON = (fields = [
    'email',
    'createdAt',
    'updatedAt',
    'id'
], filter = {}, options = {}) => marketoApi.bulkLeadExtract.get(fields, {
        staticListName: configs.staticListName,
        ...filter
    }, options)
              .then((data) => {
                  const exportId = data.result[0].exportId;

                  return marketoApi.bulkLeadExtract.file(exportId);
              })
              .then((file) => {
                  return csvToJSON(file);
              });
