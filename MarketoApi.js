const Marketo = require('node-marketo-rest');
const Queue = require('better-queue');
const moment = require('moment');

// Utils
const logger = require('./logger');
const csvToJSON = require('./csvToJSON');
const { createJobsData } = require('./marketoUtils');

const defaultFields = [
    'company',
    'email',
    'leadSource',
    'website',
    'createdAt',
    'updatedAt',
    'id',
];

const defaultOptions = {
    columnHeaderNames: {
        company: 'account_name',
        email: 'email',
        leadSource: 'external_lead_source',
        website: 'website',
        createdAt: 'created_date',
        updatedAt: 'last_modified_date',
        id: 'external_id',
    }
};

function MarketoApi({
        endpoint,
        identity,
        clientId,
        clientSecret,
    }) {
    const marketo = new Marketo({
        endpoint,
        identity,
        clientId,
        clientSecret,
    });

    let _data = [];
    let _csvData = '';

    this.fetchMonthlyLeadsDataAsCsv = (
        fields = defaultFields,
        filter = {},
        options = {},
    ) => marketo.bulkLeadExtract.get(fields, filter, options).then((data) => {
        const [{ exportId }] = data.result;

        return marketo.bulkLeadExtract.file(exportId);
    });

    /*
    * Fetch data from the Marketo month by month until response returns empty data
    **/
    this.fetchAllLeads = (
        fields = defaultFields,
        options = defaultOptions,
        workersConcurrent = 1,
        emptyMonthsDataBeforeStop = 1, // Todo: Set to 3
    ) => new Promise((resolve, reject) => {
        const queue = new Queue(_worker(fields, options), { concurrent: workersConcurrent });

        let emptyResultsCount = 0;
        let lastIndex = 0;

        queue.on('task_finish', (taskId, { data }) => {
            const [_, ...content] = data.trim().split('\n');
            const isContentExists = !!content.length;

            logger.log({
                level: 'info',
                message: `Marketo data part downloaded success. Content rows count: ${content.length}`,
            });

            if (emptyResultsCount >= emptyMonthsDataBeforeStop) {
                queue.destroy();

                _data = csvToJSON(_csvData);

                resolve(_data);
            }

            createJobsData(1, lastIndex).forEach((workerData) => {
                queue.push(workerData);

                lastIndex += 1;
            });

            if (!_csvData.length && isContentExists) {
                _csvData = data.trim();

                emptyResultsCount = 0;

                return;

            }

            if (!isContentExists) {
                ++emptyResultsCount;

                return;
            }

            _csvData = _csvData.concat('\n', content.join('\n'));

            emptyResultsCount = 0;
        });

        queue.on('task_failed', (taskId, err, stats) => {
            logger.log({
                level: 'error',
                message: `Getting Leads error: ${JSON.stringify({ taskId, err, stats })}`,
            });

            reject({ taskId, err, stats });
        });

        createJobsData(workersConcurrent).forEach((workerData) => {
            queue.push(workerData);

            lastIndex += 1;
        });
    });

    // Fetch data Worker
    const _worker = (fields, options) => ({ filter, index }, cb) => {
        logger.log({
            level: 'info',
            message: `Marketo started worker for the filter: ${JSON.stringify(filter)}`,
        });

        return this.fetchMonthlyLeadsDataAsCsv(fields, filter, options).then((data) => {
            cb(null, { data, index });
        }).catch((error) => {
            cb(error);
        });
    };

    // Getters
    this.getDataAsCsv = () => _csvData;

    this.getDataAsJSON = () => _data;

    this.getLeadsUpdatedAfter = (date = new Date()) => {
        return _data.filter(({ last_modified_date }) => {
            return last_modified_date && moment(last_modified_date).isAfter(date);
        });
    };
}

const getMarketoData = (
    endpoint,
    identity,
    clientId,
    clientSecret,
    isAll = true,
    lastUpdateTime = new Date()
) => {
    const marketo = new MarketoApi({
        endpoint,
        identity,
        clientId,
        clientSecret
    });

    return marketo.fetchAllLeads().then((result) => {
        if (!isAll && lastUpdateTime) {
            return marketo.getLeadsUpdatedAfter(lastUpdateTime);
        }

        return result;
    })
};



module.exports = {
    MarketoApi,
    getMarketoData
};
