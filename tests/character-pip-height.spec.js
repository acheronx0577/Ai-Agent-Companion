// @ts-check
const { test, expect } = require('@playwright/test');

const viewports = [
    { name: 'phone', width: 390, height: 844 },
    { name: 'ipad', width: 834, height: 1112 },
    { name: 'tablet-landscape', width: 1024, height: 768 },
];

for (const vp of viewports) {
    test(`${vp.name} shows visible companion character`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('/');
        await page.waitForSelector('.character-viewer');

        const metrics = await page.evaluate(() => {
            const viewer = document.querySelector('.character-viewer');
            const closed = document.getElementById('character-mouth-closed');
            const panel = document.querySelector('.companion-panel');
            if (!viewer || !closed || !panel) {
                return null;
            }
            const viewerRect = viewer.getBoundingClientRect();
            const closedRect = closed.getBoundingClientRect();
            const closedStyle = window.getComputedStyle(closed);
            return {
                viewerHeight: viewerRect.height,
                viewerWidth: viewerRect.width,
                closedHeight: closedRect.height,
                closedWidth: closedRect.width,
                closedPosition: closedStyle.position,
                panelHeight: panel.getBoundingClientRect().height,
            };
        });

        expect(metrics).not.toBeNull();
        expect(metrics.viewerHeight).toBeGreaterThan(40);
        expect(metrics.closedHeight).toBeGreaterThan(40);
        expect(metrics.closedWidth).toBeGreaterThan(40);
    });
}
