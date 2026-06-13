const DESKTOP_LANDING_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

async function openLanding(page, { viewport = DESKTOP_LANDING_VIEWPORT, waitFor } = {}) {
    if (viewport) {
        await page.setViewportSize(viewport);
    }
    await page.goto('/');
    if (waitFor) {
        await page.waitForSelector(waitFor);
    }
}

async function openLandingPreview(page, viewport = DESKTOP_LANDING_VIEWPORT) {
    await openLanding(page, { viewport, waitFor: '.landing-app-frame' });
}

async function getVoiceTriggerMetrics(page) {
    return page.evaluate(() => {
        const trigger = document.getElementById('voice-select-trigger');
        const label = trigger?.querySelector('.voice-select-trigger-label');
        const chevron = trigger?.querySelector('.voice-select-chevron');
        if (!trigger || !label || !chevron) {
            return null;
        }
        const triggerRect = trigger.getBoundingClientRect();
        const labelRect = label.getBoundingClientRect();
        const chevronRect = chevron.getBoundingClientRect();
        const labelCenter = labelRect.left + labelRect.width / 2;
        const triggerCenter = triggerRect.left + triggerRect.width / 2;
        const labelStyle = window.getComputedStyle(label);
        return {
            textAlign: labelStyle.textAlign,
            centered: Math.abs(labelCenter - triggerCenter) < 6,
            chevronOnRight: chevronRect.left >= labelRect.right - 2,
        };
    });
}

module.exports = {
    DESKTOP_LANDING_VIEWPORT,
    MOBILE_VIEWPORT,
    openLanding,
    openLandingPreview,
    getVoiceTriggerMetrics,
};
