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

async function expectNoSeriousAxeViolations(page) {
    const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
    const serious = results.violations.filter((violation) =>
        IMPACT_LEVELS.has(violation.impact)
    );
    expect(serious, formatViolations(serious)).toEqual([]);
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
    test('signed-out home page passes axe (WCAG A/AA)', async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('.landing-main');
        await expectNoSeriousAxeViolations(page);
    });

    test('companion app preview passes axe (WCAG A/AA)', async ({ page }) => {
        await page.goto('/app-preview');
        await page.waitForSelector('.app-shell');
        await page.waitForSelector('#message-list');
        await expectNoSeriousAxeViolations(page);
    });

    test('stage header exposes voice combobox and aligned titles', async ({ page }) => {
        await page.goto('/app-preview');
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
        await page.goto('/app-preview');
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

    test('guest home page exposes sign-in affordances', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('.landing-body')).toBeVisible();
        await expect(page.locator('.app-shell')).toHaveCount(0);
        await expect(page.getByRole('heading', { name: /quieter place to think out loud/i })).toBeVisible();
        await expect(page.locator('.landing-sign-in').first()).toBeVisible();
        await expect(page.locator('#landing-auth-status')).toBeVisible();
        await expect(page.locator('.landing-app-frame')).toBeVisible();
        await expect(page.getByRole('link', { name: 'Open companion preview' })).toHaveAttribute(
            'href',
            '/app-preview'
        );
        await expect(page.locator('.landing-original-companion-frame img')).toBeVisible();
    });

    test('landing hero uses a centered launch composition', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/');
        await page.waitForSelector('.landing-hero-copy');

        const metrics = await page.evaluate(() => {
            const hero = document.querySelector('.landing-hero');
            const copy = document.querySelector('.landing-hero-copy');
            const heading = document.querySelector('.landing-hero h1');
            const lead = document.querySelector('.landing-hero-lead');
            const actions = document.querySelector('.landing-actions');
            const preview = document.querySelector('.landing-product-scene');
            if (!hero || !copy || !heading || !lead || !actions || !preview) {
                return null;
            }
            const heroRect = hero.getBoundingClientRect();
            const copyRect = copy.getBoundingClientRect();
            const headingRect = heading.getBoundingClientRect();
            const previewRect = preview.getBoundingClientRect();
            const copyStyle = window.getComputedStyle(copy);
            const headingCenter = headingRect.left + headingRect.width / 2;
            const heroCenter = heroRect.left + heroRect.width / 2;
            return {
                textAlign: copyStyle.textAlign,
                headingCentered: Math.abs(headingCenter - heroCenter) < 3,
                previewBelowCopy: previewRect.top > copyRect.bottom,
                actionCount: actions.children.length,
                leadCentered: window.getComputedStyle(lead).textAlign === 'center',
            };
        });

        expect(metrics).not.toBeNull();
        expect(metrics.textAlign).toBe('center');
        expect(metrics.headingCentered).toBe(true);
        expect(metrics.previewBelowCopy).toBe(true);
        expect(metrics.actionCount).toBe(2);
        expect(metrics.leadCentered).toBe(true);
    });

    test('landing navbar uses left navigation and right-aligned actions', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/');
        await page.waitForSelector('.landing-header-actions');

        const metrics = await page.evaluate(() => {
            const header = document.querySelector('.landing-header');
            const brand = document.querySelector('.landing-brand');
            const nav = document.querySelector('.landing-nav');
            const actions = document.querySelector('.landing-header-actions');
            const cta = document.querySelector('.landing-header-cta');
            if (!header || !brand || !nav || !actions || !cta) {
                return null;
            }
            const headerRect = header.getBoundingClientRect();
            const brandRect = brand.getBoundingClientRect();
            const navRect = nav.getBoundingClientRect();
            const actionsRect = actions.getBoundingClientRect();
            return {
                navFollowsBrand: navRect.left > brandRect.right && navRect.left - brandRect.right < 60,
                actionsRightAligned: Math.abs(actionsRect.right - headerRect.right) < 3,
                ctaVisible: cta.getBoundingClientRect().width > 0,
                actionCount: actions.children.length,
            };
        });

        expect(metrics).not.toBeNull();
        expect(metrics.navFollowsBrand).toBe(true);
        expect(metrics.actionsRightAligned).toBe(true);
        expect(metrics.ctaVisible).toBe(true);
        expect(metrics.actionCount).toBe(2);
    });

    test('landing page includes testimonial-style notes and honest pricing', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('#testimonials')).toBeVisible();
        await expect(page.locator('.landing-testimonial-marquee-row')).toHaveCount(2);
        await expect(page.locator('.landing-testimonial-set').first().locator('.landing-testimonial')).toHaveCount(3);
        await expect(page.locator('#testimonials')).toContainText(/not customer endorsements/i);

        await expect(page.locator('#pricing')).toBeVisible();
        await expect(page.locator('.landing-price-card')).toHaveCount(3);
        await expect(page.locator('#pricing')).toContainText(/no paid subscription is available today/i);
        await expect(page.locator('.landing-price')).toHaveCount(3);

        await expect(page.locator('.landing-nav a')).toHaveCount(3);
        await expect(page.locator('.landing-nav a').nth(1)).toHaveAttribute('href', '#testimonials');
        await expect(page.locator('.landing-nav a').nth(2)).toHaveAttribute('href', '#pricing');
    });

    test('landing preview keeps the companion column full height', async ({ page }) => {
        const viewports = [
            { width: 390, height: 844 },
            { width: 1440, height: 900 },
        ];

        for (const viewport of viewports) {
            await page.setViewportSize(viewport);
            await page.goto('/');
            await page.waitForSelector('.landing-app-frame');

            const metrics = await page.evaluate(() => {
                const frame = document.querySelector('.landing-app-frame');
                const panel = document.querySelector('.landing-app-frame > .companion-panel');
                if (!frame || !panel) {
                    return null;
                }
                const frameRect = frame.getBoundingClientRect();
                const panelRect = panel.getBoundingClientRect();
                return {
                    topGap: Math.abs(panelRect.top - frameRect.top),
                    bottomGap: Math.abs(panelRect.bottom - frameRect.bottom),
                    heightRatio: panelRect.height / frameRect.height,
                };
            });

            expect(metrics).not.toBeNull();
            expect(metrics.topGap).toBeLessThanOrEqual(8);
            expect(metrics.bottomGap).toBeLessThanOrEqual(8);
            expect(metrics.heightRatio).toBeGreaterThan(0.97);
        }
    });

    test('landing theme uses neutral charcoal with muted mint accents', async ({ page }) => {
        await page.goto('/');
        const theme = await page.evaluate(() => {
            const root = window.getComputedStyle(document.documentElement);
            return {
                canvas: root.getPropertyValue('--landing-canvas').trim(),
                accent: root.getPropertyValue('--landing-accent').trim(),
                legacyEmerald: root.getPropertyValue('--landing-emerald').trim(),
            };
        });

        expect(theme.canvas).toBe('oklch(8.5% 0.004 180)');
        expect(theme.accent).toBe('oklch(82% 0.055 180)');
        expect(theme.legacyEmerald).toBe('');
    });

    test('landing preview uses a large portrait crop on desktop', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/');
        await page.waitForSelector('.landing-app-frame .character-viewer');

        const metrics = await page.evaluate(() => {
            const panel = document.querySelector('.landing-app-frame > .companion-panel');
            const portrait = document.querySelector('.landing-app-frame .character-viewer');
            const title = panel?.querySelector(':scope > .companion-panel-label');
            if (!panel || !portrait || !title) {
                return null;
            }
            const panelRect = panel.getBoundingClientRect();
            const portraitRect = portrait.getBoundingClientRect();
            const titleRect = title.getBoundingClientRect();
            return {
                widthRatio: portraitRect.width / panelRect.width,
                heightRatio: portraitRect.height / panelRect.height,
                aspectRatio: portraitRect.width / portraitRect.height,
                titleGap: portraitRect.top - titleRect.bottom,
                bottomGap: panelRect.bottom - portraitRect.bottom,
            };
        });

        expect(metrics).not.toBeNull();
        expect(metrics.widthRatio).toBeGreaterThan(0.8);
        expect(metrics.heightRatio).toBeGreaterThan(0.8);
        expect(metrics.aspectRatio).toBeLessThan(0.7);
        expect(metrics.titleGap).toBeLessThanOrEqual(8);
        expect(metrics.bottomGap).toBeLessThanOrEqual(10);
    });

    test('landing preview messages start at the top without a grid background', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/');

        const metrics = await page.locator('.landing-app-frame .message-list').evaluate((messages) => {
            const chat = messages.closest('.landing-mock-chat');
            const firstMessage = messages.firstElementChild;
            if (!chat || !firstMessage) {
                return null;
            }
            const messagesRect = messages.getBoundingClientRect();
            const firstMessageRect = firstMessage.getBoundingClientRect();
            return {
                backgroundImage: getComputedStyle(chat).backgroundImage,
                topGap: firstMessageRect.top - messagesRect.top,
            };
        });

        expect(metrics).not.toBeNull();
        expect(metrics.backgroundImage).toBe('none');
        expect(metrics.topGap).toBeLessThanOrEqual(24);
    });

    test('landing preview mirrors the real app header and message structure', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/');

        await expect(page.locator('.landing-app-frame .stage-header')).toBeVisible();
        await expect(page.locator('.landing-app-frame .stage-header-titles h2')).toHaveText('hi how are you');
        await expect(page.locator('.landing-app-frame .usage-meter')).toContainText('9 of 10');
        await expect(page.locator('.landing-app-frame .voice-select-trigger-label')).toContainText(
            'Microsoft English Device Voice'
        );
        await expect(page.locator('.landing-app-frame .message')).toHaveCount(2);
        await expect(page.locator('.landing-app-frame .message.user .message-avatar-image')).toHaveAttribute(
            'src',
            /googleusercontent/
        );
        await expect(page.locator('.landing-app-frame .message.ai .message-avatar-image')).toHaveAttribute(
            'src',
            /char-mouth-closed\.webp/
        );
    });

    test('landing preview mirrors the real app sidebar structure', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/');

        const sidebar = page.locator('.landing-app-frame > .history-panel');
        await expect(sidebar).toBeVisible();
        await expect(sidebar.locator('.history-header h1')).toHaveText('WakuWaku');
        await expect(sidebar.locator('.new-chat-button')).toHaveText('New Chat');
        await expect(sidebar.locator('.conversation-title-text')).toHaveText('hi how are you');
        await expect(sidebar.locator('.website-view-pill-value')).toHaveText('1,750');
        await expect(sidebar.locator('.server-metrics-row')).toHaveCount(4);
        await expect(sidebar.locator('.github-pill')).toContainText('GitHub');
        await expect(sidebar.locator('.account-pill-name')).toHaveText('Hades0577');
        await expect(sidebar.locator('.account-pill-avatar')).toHaveAttribute('src', /googleusercontent/);
    });

    test('landing preview has a thick translucent outer frame', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/');

        const frame = await page.locator('.landing-app-frame').evaluate((element) => {
            const style = getComputedStyle(element);
            return {
                borderWidth: style.borderTopWidth,
                borderColor: style.borderTopColor,
                borderRadius: style.borderRadius,
            };
        });

        expect(frame.borderWidth).toBe('8px');
        expect(frame.borderColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(Number.parseFloat(frame.borderRadius)).toBeGreaterThanOrEqual(20);
    });

    test('landing page shows the README technology stack with fetched brand icons', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/');

        const stack = page.locator('.landing-tech-stack');
        await expect(stack).toBeVisible();
        await expect(stack.locator('.landing-tech-stack-row').first().locator('li')).toHaveCount(8);
        await expect(stack).toContainText('Python');
        await expect(stack).toContainText('Flask');
        await expect(stack).toContainText('Convex');
        await expect(stack).toContainText('Piper');
        await expect(stack).toContainText('Docker');
        await expect(stack).toContainText('Gemini');
        await expect(stack).toContainText('Render');
        await expect(stack.locator('.landing-tech-stack-row').first().locator('img')).toHaveCount(8);
        await expect(stack.locator('.landing-tech-stack-row').first().locator('img[src*="python.svg"]')).toBeVisible();
        await expect(stack.locator('.landing-tech-stack-row').first().locator('img[src*="convex.svg"]')).toBeVisible();
        await expect(stack.locator('.landing-tech-stack-row').first().locator('img[src*="piper.png"]')).toBeVisible();
        await expect(stack.locator('.landing-tech-stack-row').first().locator('img[src*="docker.svg"]')).toBeVisible();
        await expect(stack.locator('.landing-tech-stack-row').first().locator('img[src*="gemini.svg"]')).toBeVisible();
        await expect(stack.locator('.landing-tech-stack-groq img').first()).toHaveAttribute(
            'src',
            'https://console.groq.com/powered-by-groq-dark.svg'
        );
    });

    test('landing preview metrics sit above the lower sidebar account region', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/');

        const positions = await page.locator('.landing-app-frame > .history-panel').evaluate((sidebar) => {
            const hub = sidebar.querySelector('.history-panel-hub');
            const account = sidebar.querySelector('.history-footer');
            if (!hub || !account) {
                return null;
            }
            const sidebarRect = sidebar.getBoundingClientRect();
            const hubRect = hub.getBoundingClientRect();
            const accountRect = account.getBoundingClientRect();
            return {
                hubCenterRatio:
                    (hubRect.top + hubRect.height / 2 - sidebarRect.top) / sidebarRect.height,
                accountTopRatio: (accountRect.top - sidebarRect.top) / sidebarRect.height,
            };
        });

        expect(positions).not.toBeNull();
        expect(positions.hubCenterRatio).toBeLessThan(0.75);
        expect(positions.accountTopRatio).toBeGreaterThan(0.85);
    });

    test('landing preview sits above the hero dot field and fades at the bottom', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/');
        await page.waitForSelector('.landing-app-frame');

        const stacking = await page.locator('.landing-app-frame-wrap').evaluate((wrap) => {
            const dots = document.getElementById('landing-hero-dotfield');
            const chrome = document.getElementById('landing-hero-liquid-chrome');
            const frame = wrap.querySelector('.landing-app-frame');
            const shield = wrap.querySelector('.landing-app-frame-shield');
            if (!dots || !chrome || !frame || !shield) {
                return null;
            }
            const dotsRect = dots.getBoundingClientRect();
            const chromeRect = chrome.getBoundingClientRect();
            const wrapStyle = window.getComputedStyle(wrap);
            const dotsStyle = window.getComputedStyle(dots);
            const chromeStyle = window.getComputedStyle(chrome);
            const frameStyle = window.getComputedStyle(frame);
            const shieldStyle = window.getComputedStyle(shield);
            return {
                wrapZ: wrapStyle.zIndex,
                dotsZ: dotsStyle.zIndex,
                chromeZ: chromeStyle.zIndex,
                dotsHeight: dotsRect.height,
                chromeHeight: chromeRect.height,
                heightDelta: Math.abs(dotsRect.height - chromeRect.height),
                maskImage: frameStyle.maskImage,
                webkitMaskImage: frameStyle.webkitMaskImage,
                fadeStart: frameStyle.getPropertyValue('--landing-preview-fade-start').trim(),
                shieldBg: shieldStyle.backgroundColor,
            };
        });

        expect(stacking).not.toBeNull();
        expect(Number(stacking.wrapZ)).toBeGreaterThan(Number(stacking.dotsZ));
        expect(Number(stacking.dotsZ)).toBeGreaterThan(Number(stacking.chromeZ));
        expect(stacking.heightDelta).toBeLessThan(2);

        const canvasFill = await page.evaluate(() => {
            const chrome = document.getElementById('landing-hero-liquid-chrome');
            const canvas = chrome?.querySelector('canvas');
            if (!chrome || !canvas) {
                return null;
            }
            const hostRect = chrome.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            return {
                hostHeight: hostRect.height,
                canvasHeight: canvasRect.height,
                fillRatio: canvasRect.height / hostRect.height,
            };
        });

        expect(canvasFill).not.toBeNull();
        expect(canvasFill.fillRatio).toBeGreaterThan(0.95);
        expect(stacking.maskImage === 'none' && stacking.webkitMaskImage === 'none').toBe(false);
        expect(`${stacking.maskImage} ${stacking.webkitMaskImage}`).toContain('linear-gradient');
        expect(stacking.fadeStart).toBe('58%');
    });

    test('app WakuWaku labels link back to home', async ({ page }) => {
        await page.goto('/app-preview');
        await expect(page.locator('.app-home-link')).toHaveAttribute('href', '/');
        await expect(page.locator('.companion-panel-label')).toHaveAttribute('href', '/');
        await page.locator('.app-home-link').click();
        await expect(page).toHaveURL(/\/$/);
        await expect(page.locator('.landing-body')).toBeVisible();
    });

    test('public home does not reopen chat for an existing Convex session', async ({ page }) => {
        await page.goto('/static/landing.js');
        await page.setContent(`
            <button class="landing-sign-in" type="button">Sign in</button>
            <p id="landing-auth-status"></p>
            <div id="convex-bridge-root" data-convex-enabled="true"></div>
        `);
        await page.evaluate(() => {
            window.__landingSyncCalls = 0;
            window.WakuConvex = {
                isReady: () => true,
                getSnapshot: () => ({ authenticated: true }),
                subscribe(listener) {
                    listener({ loading: false, authenticated: true });
                    return () => {};
                },
                async syncFlaskSession() {
                    window.__landingSyncCalls += 1;
                },
            };
        });
        await page.addScriptTag({ path: require.resolve('../static/landing.js') });
        await page.waitForTimeout(1200);

        await expect(page).toHaveURL(/\/static\/landing\.js$/);
        expect(await page.evaluate(() => window.__landingSyncCalls)).toBe(0);

        await page.route('**/dashboard', (route) =>
            route.fulfill({
                contentType: 'text/html',
                body: '<main id="dashboard-loaded">Dashboard</main>',
            })
        );
        await page.locator('.landing-sign-in').click();
        await expect(page).toHaveURL(/\/dashboard$/);
        await expect(page.locator('#dashboard-loaded')).toBeVisible();
    });

    test('wide short viewport keeps desktop chat layout (Nest Hub)', async ({ page }) => {
        await page.setViewportSize({ width: 1024, height: 600 });
        await page.goto('/app-preview');
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
        await page.goto('/app-preview');
        await page.waitForSelector('.companion-panel-label');

        const metrics = await getCompanionTitleMetrics(page);
        expect(metrics.fontSizePx).toBeGreaterThanOrEqual(48);
        expect(metrics.fitsPanel).toBe(true);
        expect(metrics.centered).toBe(true);
    });

    test('tablet viewport expands video-call layout', async ({ page }) => {
        await page.setViewportSize({ width: 834, height: 1112 });
        await page.goto('/app-preview');
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
        await page.goto('/app-preview');
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
        await page.goto('/app-preview');
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

    test('skip link reaches signed-out main content', async ({ page }) => {
        await page.goto('/');
        await page.keyboard.press('Tab');
        const landingSkip = page.locator('.landing-skip-link');
        await expect(landingSkip).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(page.locator('#landing-main')).toBeVisible();
    });

    test('convex auth test page passes axe (WCAG A/AA)', async ({ page }) => {
        await page.goto('/convex-auth-test');
        await page.waitForSelector('.auth-test');
        await expectNoSeriousAxeViolations(page);
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
