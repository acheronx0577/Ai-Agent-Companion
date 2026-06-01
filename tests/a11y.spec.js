const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const IMPACT_LEVELS = new Set(['critical', 'serious']);

function formatViolations(violations) {
    return violations
        .filter((violation) => IMPACT_LEVELS.has(violation.impact))
        .map((violation) => {
            const nodes = violation.nodes
                .slice(0, 3)
                .map((node) => node.target.join(' '))
                .join('; ');
            return `[${violation.impact}] ${violation.id}: ${violation.help} (${nodes})`;
        })
        .join('\n');
}

async function getCompanionTitleMetrics(page) {
    return page.evaluate(() => {
        const label = document.querySelector('.companion-panel > .companion-panel-label');
        const panel = document.querySelector('.companion-panel');
        if (!label || !panel) {
            return { fontSizePx: 0, fitsPanel: false, centered: false };
        }
        const labelRect = label.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        return {
            fontSizePx: Number.parseFloat(window.getComputedStyle(label).fontSize),
            fitsPanel: label.scrollWidth <= panel.clientWidth + 2,
            centered:
                Math.abs(labelRect.left + labelRect.width / 2 - (panelRect.left + panelRect.width / 2)) < 3,
        };
    });
}

test.describe('accessibility', () => {
    test('home page passes axe (WCAG A/AA)', async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('.app-shell');
        await page.waitForSelector('#message-list');

        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        const serious = results.violations.filter((v) => IMPACT_LEVELS.has(v.impact));
        expect(serious, formatViolations(serious)).toEqual([]);
    });

    test('stage header exposes voice combobox and aligned titles', async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('.stage-header');
        await expect(page.locator('.stage-header-titles .label')).toBeVisible();
        await expect(page.locator('#conversation-title')).toBeVisible();
        await expect(page.locator('#voice-select-trigger')).toBeVisible();
        await expect(page.locator('#usage-meter')).toBeVisible();
        await expect(page.locator('#chat-language-label')).toContainText('Chat:');

        const alignment = await page.evaluate(() => {
            const label = document.querySelector('.stage-header-titles .label');
            const title = document.getElementById('conversation-title');
            if (!label || !title) {
                return { aligned: false };
            }
            const labelRect = label.getBoundingClientRect();
            const titleRect = title.getBoundingClientRect();
            return { aligned: Math.abs(labelRect.left - titleRect.left) < 2 };
        });
        expect(alignment.aligned).toBe(true);
    });

    test('voice trigger label is centered on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/');
        await page.waitForSelector('#voice-select-trigger');

        const metrics = await page.evaluate(() => {
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
        expect(metrics).not.toBeNull();
        expect(metrics.textAlign).toBe('center');
        expect(metrics.centered).toBe(true);
        expect(metrics.chevronOnRight).toBe(true);
    });

    test('guest shell exposes sign-in affordances', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('.app-shell')).toHaveClass(/requires-auth/);
        await expect(page.locator('#message-word-hint')).toBeVisible();
        await expect(page.locator('#message-word-hint')).toHaveText(/100 words/);
        await expect(page.locator('#chat-language-label')).toContainText('Chat:');
        await expect(page.locator('#usage-meter')).toContainText('Sign in for daily trial messages');
        await expect(page.locator('#text-input')).toBeDisabled();
        await expect(page.locator('#new-chat-button')).toBeDisabled();
        await expect(page.locator('#google-sign-in-button')).toBeVisible();
        await expect(page.locator('.auth-callout')).toBeVisible();
        await expect(page.locator('.message-empty-cta')).toBeVisible();
        await expect(page.locator('.message-empty-cta')).toHaveAttribute('type', 'button');
    });

    test('wide short viewport keeps desktop chat layout (Nest Hub)', async ({ page }) => {
        await page.setViewportSize({ width: 1024, height: 600 });
        await page.goto('/');
        await page.waitForSelector('.app-shell');

        await expect(page.locator('.chat-input-area')).toBeVisible();
        await expect(page.locator('#text-input')).toBeVisible();
        await expect(page.locator('.companion-panel')).toBeVisible();
        await expect(page.locator('.companion-panel-label')).toBeVisible();

        const companionColumn = await page.locator('.companion-panel').evaluate(
            (el) => window.getComputedStyle(el).gridColumn
        );
        expect(companionColumn).toBe('2');

        const chatColumns = await page.locator('.chat-stage').evaluate(
            (el) => window.getComputedStyle(el).gridTemplateColumns
        );
        expect(chatColumns).not.toBe('none');
        expect(chatColumns.split(' ').length).toBeGreaterThanOrEqual(2);

        const fillRatio = await page.evaluate(() => {
            const panel = document.querySelector('.companion-panel');
            const viewer = document.querySelector('.character-viewer');
            if (!panel || !viewer) {
                return 0;
            }
            return viewer.clientHeight / panel.clientHeight;
        });
        expect(fillRatio).toBeGreaterThan(0.55);

        const titleMetrics = await getCompanionTitleMetrics(page);
        expect(titleMetrics.fitsPanel).toBe(true);
        expect(titleMetrics.centered).toBe(true);
    });

    test('1920px viewport uses large centered companion title', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto('/');
        await page.waitForSelector('.companion-panel-label');

        const metrics = await getCompanionTitleMetrics(page);
        expect(metrics.fontSizePx).toBeGreaterThanOrEqual(48);
        expect(metrics.fitsPanel).toBe(true);
        expect(metrics.centered).toBe(true);
    });

    test('tablet viewport expands video-call layout', async ({ page }) => {
        await page.setViewportSize({ width: 834, height: 1112 });
        await page.goto('/');
        await page.waitForSelector('.companion-panel');

        const metrics = await page.evaluate(() => {
            const panel = document.querySelector('.companion-panel');
            const empty = document.querySelector('.message-empty');
            if (!panel) {
                return null;
            }
            return {
                panelWidth: panel.getBoundingClientRect().width,
                panelPosition: window.getComputedStyle(panel).position,
                emptyMaxWidth: empty
                    ? window.getComputedStyle(empty).maxWidth
                    : null,
            };
        });
        expect(metrics).not.toBeNull();
        expect(metrics.panelPosition).toBe('absolute');
        expect(metrics.panelWidth).toBeGreaterThan(180);
        expect(metrics.panelWidth).toBeLessThan(260);
    });

    test('fold-wide viewport uses larger pip than ipad-class tablet', async ({ page }) => {
        await page.setViewportSize({ width: 888, height: 1200 });
        await page.goto('/');
        await page.waitForSelector('.companion-panel');

        const foldWidth = await page.evaluate(() => {
            const panel = document.querySelector('.companion-panel');
            return panel ? panel.getBoundingClientRect().width : 0;
        });
        expect(foldWidth).toBeGreaterThan(280);

        await page.setViewportSize({ width: 834, height: 1112 });
        await page.waitForSelector('.companion-panel');

        const ipadWidth = await page.evaluate(() => {
            const panel = document.querySelector('.companion-panel');
            return panel ? panel.getBoundingClientRect().width : 0;
        });
        expect(ipadWidth).toBeLessThan(foldWidth);
    });

    test('mobile viewport uses video-call pip layout', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/');
        await page.waitForSelector('.companion-panel');

        const layout = await page.evaluate(() => {
            const stage = document.querySelector('.chat-stage');
            const panel = document.querySelector('.companion-panel');
            const messages = document.querySelector('.message-list');
            if (!stage || !panel || !messages) {
                return null;
            }
            const stageStyle = window.getComputedStyle(stage);
            const panelStyle = window.getComputedStyle(panel);
            return {
                stageRows: stageStyle.gridTemplateRows,
                panelPosition: panelStyle.position,
                messageRow: messages.style.gridRow || window.getComputedStyle(messages).gridRow,
            };
        });
        expect(layout).not.toBeNull();
        expect(layout.panelPosition).toBe('absolute');
        expect(layout.messageRow).toBe('2');
        expect(layout.stageRows.split(' ').length).toBe(3);
    });

    test('skip link focuses main chat region', async ({ page }) => {
        await page.goto('/');
        await page.keyboard.press('Tab');
        const skip = page.locator('.skip-link');
        await expect(skip).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(page.locator('#chat-main')).toBeVisible();
    });

    test('convex auth test page passes axe (WCAG A/AA)', async ({ page }) => {
        await page.goto('/convex-auth-test');
        await page.waitForSelector('.auth-test');

        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        const serious = results.violations.filter((v) => IMPACT_LEVELS.has(v.impact));
        expect(serious, formatViolations(serious)).toEqual([]);
    });

    test('convex auth test exposes sign-in and profile region', async ({ page }) => {
        await page.goto('/convex-auth-test');
        await expect(page.locator('h1')).toContainText(/Convex auth/i);
        const signIn = page.getByRole('link', { name: /Sign in with Google/i });
        const hasSignIn = (await signIn.count()) > 0;
        const hasSetupAlert = (await page.locator('.auth-test .missing[role="alert"]').count()) > 0;
        expect(hasSignIn || hasSetupAlert).toBe(true);
    });
});
