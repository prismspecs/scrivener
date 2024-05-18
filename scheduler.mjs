import cron from 'node-cron';

export function setupSchedule(changeState, manualMode) {
    // cron job for every Monday at 6pm CET
    cron.schedule('0 18 * * 1', () => {
        // change state to voting
        if (!manualMode) {
            changeState('voting');
        }
    });
    // cron job for every Tuesday at 6:00 CET
    cron.schedule('0 18 * * 2', () => {
        // change state to results
        if (!manualMode) {
            changeState('results');
        }
    });
    // cron job for every Wednesday at 20:40 CET
    cron.schedule('0 18 * * 3', () => {
        // change state to proposal
        if (!manualMode) {
            changeState('proposal');
        }
    });

    // cron job for Saturday at 18:00 CET
    cron.schedule('0 18 * * 6', () => {
        // change state to voting
        if (!manualMode) {
            changeState('results');
        }
    });
}