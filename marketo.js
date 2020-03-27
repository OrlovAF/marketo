const Marketo = require('node-marketo-rest');

// Utils
const csvToJSON = require('./csvToJSON');

const marketoApi = new Marketo({
    endpoint: process.env.ENDPOINT,
    identity: process.env.IDENTITY,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
});

exports.getLeadsListJSON = (fields = [
    'email',
    'createdAt',
    'updatedAt',
    'id'
], filter = {}, options = {}) => marketoApi.bulkLeadExtract.get(fields, {
        staticListName: process.env.STATIC_LIST_NAME,
        ...filter
    }, options)
              .then((data) => {
                  const exportId = data.result[0].exportId;

                  return marketoApi.bulkLeadExtract.file(exportId);
              })
              .then((file) => {
                  return csvToJSON(file);
              });
