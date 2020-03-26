const Marketo = require('node-marketo-rest');
const fs = require('fs');

// Utils
const csvToJSON = require('./csvToJSON');

const marketoApi = new Marketo({
    endpoint: 'https://443-SJB-737.mktorest.com/rest',
    identity: 'https://443-SJB-737.mktorest.com/identity',
    clientId: '37fc2af9-a975-452c-ab0d-fffc7a47d30d',
    clientSecret: 'LgEaoccVZJoMgT4H5yJA8CiP7kC3Xkzo',
});

const fields = [
    'company',
    'email',
    'leadSource',
    'website',
    'createdAt',
    'updatedAt',
    'id',
];

marketoApi.bulkLeadExtract.get(fields, {
    staticListName: 'Test List',
})
          .then((data) => {
              const exportId = data.result[0].exportId;

              return marketoApi.bulkLeadExtract.file(exportId);
          })
          .then((file) => {
              console.log('result', csvToJSON(file));

              fs.writeFileSync('./leads.csv', file);
          });


