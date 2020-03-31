const getShiftedMonth = (months = 1, date = new Date()) => {
    date.setMonth(date.getMonth() - months);

    return date;
};

const createJobsData = (length = 3, shift = 0) => new Array(length)
    .fill(null)
    .map((data, index) => ({
        filter: {
            createdAt: {
                startAt: getShiftedMonth(index + 1 + shift),
                endAt: getShiftedMonth(index + shift),
            }
        },
        index: index + 1
    }));

module.exports = {
    createJobsData,
    getShiftedMonth
};
