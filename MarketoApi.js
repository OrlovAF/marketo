const Marketo = require('node-marketo-rest');
const Queue = require('better-queue');
const rp = require('request-promise');

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
    'leadStatus'
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

const getActivityType = (type = 0) => {
    const activityTypes = {
        12: 'Lead Created',
        13: 'Lead Updated',
        37: 'Lead Deleted',
    };

    return activityTypes[type] || 'Unknown';
};

function MarketoApi({
        endpoint,
        identity,
        clientId,
        clientSecret,
    }) {
    const credentials = {
        endpoint,
        identity,
        clientId,
        clientSecret
    };

    const marketo = new Marketo(credentials);

    let _data = [];
    let _csvData = '';
    let _access_token = '';

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
        emptyMonthsDataBeforeStop = 1, // Todo: Set to 3
    ) => new Promise((resolve, reject) => {
        const queue = new Queue(_worker(fields, options), { concurrent: 1 });

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

        createJobsData(1).forEach((workerData) => {
            queue.push(workerData);

            lastIndex += 1;
        });
    });

    this.fetchUpdatedData = (lastUpdateTime) => new Promise(async (resolve, reject) => {
        const token = await this.auth();
        let nextPageToken = await _getActivitiesNextPageToken(token, lastUpdateTime);

        let resultData = [];

        const queue = new Queue(async ({ nextPageToken: workerNextPageToken }, cb) => {
            try {
                const activityData = await _getActivities(token, workerNextPageToken);

                cb(null, activityData);
            } catch (error) {
                cb(error);
            }
        }, { concurrent: 1 });

        queue.on('task_finish', async (taskId, data) => {
            const { result = [], nextPageToken, moreResult } = data;

            resultData = resultData.concat(result);

            if (moreResult) {
                queue.push(({ nextPageToken }));
            } else {
                const res = await _appendLeadsData(resultData);

                resolve(res);
            }
        });

        queue.on('task_failed', (taskId, error) => {
            logger.log({
                level: 'error',
                message: `Failed to get activities from marketo api', ${JSON.stringify(error)}`,
            });

            reject(error);
        });

        queue.push({ nextPageToken });
    });

    const _appendLeadsData = async (activitiesData = []) => {
        if (!activitiesData.length) return [];

        try {
            const uniqueLeadsId = Array.from(new Set(activitiesData.map(({ leadId }) => leadId)));

            const { result: leads } = await marketo.lead.find('id', uniqueLeadsId, {
                fields: defaultFields,
            });

            return leads.map((lead) => {
                const leadActivities = activitiesData.filter(({ leadId }) => +leadId === +lead.id);

                return {
                    ...lead,
                    history: leadActivities.map(({ activityDate, fields, activityTypeId }) => ({
                        time: activityDate,
                        activityTypeId,
                        activityType: getActivityType(activityTypeId),
                        fields
                    }))
                }
            });
        } catch (error) {

        }
    };

    const _getActivities = async (accessToken, nextPageToken, fields = defaultFields) => {
        return  JSON.parse( await rp({
            uri: `${credentials.endpoint}/v1/activities/leadchanges.json`,
            qs: {
                fields: fields.join(),
                nextPageToken
            },
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }));
    };

    const _getActivitiesNextPageToken = async (accessToken, lastUpdateTime) => {
        try {
            const { nextPageToken } = JSON.parse(await rp({
                uri: `${credentials.endpoint}/v1/activities/pagingtoken.json`,
                qs: {
                    sinceDatetime: new Date(lastUpdateTime).toISOString()
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }));

            return nextPageToken;
        } catch (error) {
            logger.log({
                level: 'error',
                message: `Failed to get activities page token for marketo api', ${JSON.stringify(error)}`,
            });
        }
    };

    this.auth = async () => {
        // Try To Get Access Token
        try {
            const { access_token } = JSON.parse(await rp({
                uri: `${credentials.identity}/oauth/token`,
                qs: {
                    grant_type: 'client_credentials',
                    client_id: credentials.clientId,
                    client_secret: credentials.clientSecret
                },
            }));

            _access_token = access_token;

            return access_token;
        } catch (error) {
            logger.log({
                level: 'error',
                message: `Failed to get token for marketo api', ${JSON.stringify(error)}`,
            });
        }
    };

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

    if (!isAll && lastUpdateTime) {
        return marketo.fetchUpdatedData(lastUpdateTime);
    }

    return marketo.fetchAllLeads();
};

module.exports = {
    MarketoApi,
    getMarketoData
};
