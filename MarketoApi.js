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

class MarketoApi {
    _data = [];
    _csvData = '';

    constructor({ endpoint, identity, clientId, clientSecret }) {
        this.marketo = new Marketo({ endpoint, identity, clientId, clientSecret });
    }

    fetchMonthlyLeadsDataAsCsv = (fields = defaultFields, filter = {}) => this.marketo.bulkLeadExtract.get(fields, filter).then((data) => {
        const [{ exportId }] = data.result;

        return this.marketo.bulkLeadExtract.file(exportId);
    });

    /*
    * Fetch data from the Marketo month by month until response returns empty data
    **/
    fetchAllLeads = (fields = defaultFields, workersConcurrent = 3, emptyMonthsDataBeforeStop = 3) => new Promise((resolve, reject) => {
        const queue = new Queue(this._worker(fields), { concurrent: workersConcurrent });

        let emptyResultsCount = 0;
        let lastIndex = 0;

        queue.on('task_finish', (taskId, { data }) => {
            const [_, ...content] = data.trim().split('\n');
            const isContentExists = !!content.length;

            logger.log({
                level: 'info',
                message: `Marketo data part downloaded success. Content rows count: ${content.length}`
            });

            if (emptyResultsCount >= emptyMonthsDataBeforeStop) {
                queue.destroy();

                this._data = csvToJSON(this._csvData);

                resolve(this._data);
            }

            createJobsData(1, lastIndex).forEach((workerData) => {
                queue.push(workerData);

                lastIndex += 1;
            });

            if (!this._csvData.length && isContentExists) {

                this._csvData = data.trim();
                return;

            }

            if (!isContentExists) {
                ++emptyResultsCount;

                return;
            }

            this._csvData = this._csvData.concat('\n', content.join('\n'));
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
    _worker = (fields) => ({ filter, index }, cb) => {
        logger.log({
            level: 'info',
            message: `Marketo started worker for the filter: ${JSON.stringify(filter)}`
        });

        return this.fetchMonthlyLeadsDataAsCsv(fields, filter).then((data) => {
            cb(null, { data, index });
        }).catch((error) => {
            cb(error);
        });
    };

    // Getters
    getDataAsCsv = () => this._csvData;

    getDataAsJSON = () => this._data;

    getLeadsUpdatedAfter = (date = new Date()) => {
        return this._data.filter(({ updatedAt }) => {
            return updatedAt &&  moment(updatedAt).isAfter(date);
        });
    }
}

module.exports = MarketoApi;
