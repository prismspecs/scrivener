import cron from 'node-cron';
import { announce } from './helpers.mjs';

export function setupSchedule(changeState, manualMode) {

    // main game

    // PROPOSAL every Sunday at 8pm CET
    cron.schedule('0 20 * * 0', () => {
        if (!manualMode) {
            changeState('proposal');
        }
    });
    // VOTING every Monday at 9pm CET
    cron.schedule('0 20 * * 1', () => {
        if (!manualMode) {
            changeState('voting');
        }
    });
    // RESULTS every Tuesday at 8pm CET
    cron.schedule('0 20 * * 2', () => {
        if (!manualMode) {
            changeState('results');
        }
    });
    // PROPOSAL every Wednesday at 8pm CET
    cron.schedule('0 20 * * 3', () => {
        if (!manualMode) {
            changeState('proposal');
        }
    });
    // VOTING every Thursday at 8pm CET
    cron.schedule('0 20 * * 4', () => {
        if (!manualMode) {
            changeState('voting');
        }
    });
    // RESULTS every Friday at 8pm CET
    cron.schedule('0 20 * * 5', () => {
        if (!manualMode) {
            changeState('results');
        }
    });

    // reminders
    // Monday
    cron.schedule('0 8 * * 1', () => {
        announce("You have 12 more hours to submit proposals with **!propose**")
    });
    cron.schedule('0 14 * * 1', () => {
        announce("You have 6 more hours to submit proposals with **!propose**")
    });
    cron.schedule('0 18 * * 1', () => {
        announce("You have 2 more hours to submit proposals with **!propose**")
    });
    cron.schedule('0 8 * * 2', () => {
        announce("You have 12 more hours to vote with **!vote**")
    });
    cron.schedule('0 14 * * 2', () => {
        announce("You have 6 more hours to vote with **!vote**")
    });
    cron.schedule('0 18 * * 2', () => {
        announce("You have 2 more hours to vote with **!vote**")
    });
    // Thursday
    cron.schedule('0 8 * * 4', () => {
        announce("You have 12 more hours to submit proposals with **!propose**")
    });
    cron.schedule('0 14 * * 4', () => {
        announce("You have 6 more hours to submit proposals with **!propose**")
    });
    cron.schedule('0 18 * * 4', () => {
        announce("You have 2 more hours to submit proposals with **!propose**")
    });
    cron.schedule('0 8 * * 5', () => {
        announce("You have 12 more hours to vote with **!vote**")
    });
    cron.schedule('0 14 * * 5', () => {
        announce("You have 6 more hours to vote with **!vote**")
    });
    cron.schedule('0 18 * * 5', () => {
        announce("You have 2 more hours to vote with **!vote**")
    });

}