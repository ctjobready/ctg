import { expect, test, type Page } from '@playwright/test';
import { open } from './support/browser';

/**
 * WP30b behaviors (owner direction 2026-10-14): CodersTrust is a global organization headquartered in New York; the parent organization is
 * CT USA, Inc.; CodersTrust Bangladesh Ltd. is a country office; a page that is not about a Bangladesh program does not lead with a Bangladesh
 * photograph. Each test states one observable behavior of the built site (run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp30b.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();

/**
 * The hero photograph on a page: the eager, high-priority image. It is identified by its D13 asset id ("legacy-<folder>-<name>"), because the
 * build names a deduplicated file after whichever identical image it met first (the panel photograph is also a news cover).
 */
async function heroPhoto(page: Page): Promise<{ file: string; alt: string }> {
  const img = page.locator('img[fetchpriority="high"]').first();
  await expect(img).toHaveCount(1);
  const asset = (await img.getAttribute('data-asset')) ?? '';
  return { file: asset.replace(/^legacy-[a-z]+-/, ''), alt: (await img.getAttribute('alt')) ?? '' };
}

test.describe('hero photographs: the Home hero is a training room in Kosovo, and pages that are not about Bangladesh lead with a photograph from abroad', () => {
  test('Home: the hero is the Kosovo training photograph, described as Kosovo', async ({ page }) => {
    await open(page, '');
    const hero = await heroPhoto(page);
    expect(hero.file).toBe('kosovo-woman-training');
    expect(hero.alt).toContain('Kosovo');
    await expect(page.locator('main h1')).toHaveCount(1);
  });

  // path (relative to the baseURL) -> photograph file; a "from abroad" photograph where the page's subject is not a Bangladesh program
  const HEROES: [string, string][] = [
    ['programs/', 'computer-lab-rows'],
    ['partner-with-us/', 'us-chamber'],
    // WP55 (owner decision 2026-10-18): the old "Albania" photograph is the Kosovo pilot and leaves this hero; the Somaliland Hour of Code (December 2015) takes its place
    ['partner-with-us/development-partners/', 'somaliland-hour-of-code'],
    ['partner-with-us/investors/', 'davos-sdg-lab'],
    ['partner-with-us/universities/', 'ccny-mou-signing'],
    ['partner-with-us/employers/', 'woman-learner-laptop'],
    ['about/', 'european-parliament'],
    ['contact/', 'office-support-headset'],
    ['about/governance/', 'un-panel'],
    ['impact/case-studies/kosovo-women-in-online-work/', 'kosovo-women-screens'],
  ];
  for (const [path, file] of HEROES) {
    test(`${path}: the hero is ${file}`, async ({ page }) => {
      await open(page, path);
      expect((await heroPhoto(page)).file).toBe(file);
    });
  }

  test('the Kosovo hero photograph is never shown twice on the Home page (the Kosovo case card uses the wider Kosovo photograph)', async ({ page }) => {
    await open(page, '');
    const assets = await page.locator('img[data-asset]').evaluateAll((imgs) => imgs.map((i) => i.getAttribute('data-asset')));
    expect(assets.filter((a) => a === 'legacy-general-kosovo-woman-training')).toHaveLength(1);
  });

  test('the alt text of a Kosovo or Somaliland hero names the right place (no photograph is captioned with a country it is not from)', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    expect((await heroPhoto(page)).alt).toMatch(/Tima-ade University/);
    expect((await heroPhoto(page)).alt).not.toMatch(/Albania|Kosovo|Bangladesh/);
    await open(page, 'impact/case-studies/kosovo-women-in-online-work/');
    expect((await heroPhoto(page)).alt).toMatch(/Kosovo/);
  });
});

test.describe('identity: headquartered in New York, parent organization CT USA, Inc., Bangladesh a country office', () => {
  test('the footer lists New York first, labelled Headquarters, then Dhaka, labelled Country Office', async ({ page }) => {
    await open(page, '');
    const offices = page.locator('#site-footer .footer__office h3');
    await expect(offices).toHaveCount(2);
    expect(compact(await offices.nth(0).textContent())).toBe('CT USA, Inc. · New York · Headquarters');
    expect(compact(await offices.nth(1).textContent())).toBe('CodersTrust Bangladesh Ltd. · Dhaka · Country Office');
  });

  for (const path of ['contact/', 'about/governance/']) {
    test(`${path}: the office cards are New York · Headquarters first, then Dhaka · Country Office`, async ({ page }) => {
      await open(page, path);
      const cards = page.locator('#offices article.office');
      await expect(cards).toHaveCount(2);
      expect(compact(await cards.nth(0).locator('.eyebrow').textContent())).toBe('New York · Headquarters');
      expect(compact(await cards.nth(0).locator('.card__title').textContent())).toBe('CT USA, Inc.');
      expect(compact(await cards.nth(1).locator('.eyebrow').textContent())).toBe('Dhaka · Country Office');
      expect(compact(await cards.nth(1).locator('.card__title').textContent())).toBe('CodersTrust Bangladesh Ltd.');
      expect(compact(await page.locator('#offices header.sh').first().textContent())).toContain('headquartered in New York');
    });
  }

  test('About states the registered identity fact (ID-11) and the meta description leads with New York', async ({ page }) => {
    await open(page, 'about/');
    const fact = page.locator('main [data-fact="ID-11"]');
    await expect(fact).toHaveCount(1);
    const t = compact(await fact.textContent());
    expect(t).toContain('headquartered in New York');
    expect(t).toContain('parent organization is CT USA, Inc.');
    expect(t).toContain('CodersTrust Bangladesh (CodersTrust Bangladesh Ltd.) is a country office');
    // WP57b (cycle-29 review, GLM L8): the rendered sentence is "Additional country and regional offices are planned." (the register's ID-11 adds "in the next few years"; src/data/copy.ts IDENTITY)
    expect(t).toContain('Additional country and regional offices are planned.');
    expect(t).not.toContain('in the next few years');
    // WP52 (cycle-27 review, GLM m4): the description opens with the year and names New York as the headquarters: "Since 2014, New York-headquartered CodersTrust has trained ... in 16 countries and territories."
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /^Since 2014, New York-headquartered CodersTrust .*in 16 countries and territories\.$/);
  });

  test('the world map line says Headquarters: New York and Country office: Dhaka', async ({ page }) => {
    await open(page, 'impact/global-reach/');
    expect(compact(await page.locator('.wmap__offices').textContent())).toBe('Headquarters: New York (CT USA, Inc.). Country office: Dhaka (CodersTrust Bangladesh Ltd.).');
  });

  test('no page calls the Bangladesh office the headquarters', async ({ page }) => {
    for (const path of ['', 'about/', 'contact/', 'about/governance/', 'careers/', 'partner-with-us/local-partners/', 'impact/global-reach/', 'privacy-policy/']) {
      await open(page, path);
      const text = compact(await page.locator('body').innerText());
      expect(text, `${path || 'home'} names a Bangladesh headquarters`).not.toMatch(/(Dhaka|Bangladesh)[^.]{0,60}headquarter|headquarters? (in|of) (Dhaka|Bangladesh)|Dhaka · Headquarters/i);
    }
  });

  test('the Organization JSON-LD: address is the New York headquarters, CT USA, Inc. the parent, CodersTrust Bangladesh Ltd. a sub-organization', async ({ page }) => {
    await open(page, '');
    const org = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).flatMap((s) => {
        const j = JSON.parse(s.textContent ?? '{}');
        return j['@graph'] ?? [j];
      });
      return nodes.find((n) => n['@type'] === 'Organization');
    });
    expect(org.address).toMatchObject({ '@type': 'PostalAddress', addressLocality: 'New York', addressRegion: 'NY', postalCode: '10005', addressCountry: 'US' });
    expect(org.parentOrganization).toMatchObject({ '@type': 'Organization', name: 'CT USA, Inc.' });
    expect(org.subOrganization).toHaveLength(1);
    expect(org.subOrganization[0]).toMatchObject({ '@type': 'Organization', name: 'CodersTrust Bangladesh Ltd.', address: { addressLocality: 'Dhaka', addressCountry: 'BD' } });
    expect(org.location.map((l: { address: { addressLocality: string } }) => l.address.addressLocality)).toEqual(['New York', 'Dhaka']);
    // global, not Bangladesh-led
    expect(org.areaServed.map((a: { name: string }) => a.name)).toEqual(['Asia', 'Africa', 'Europe', 'the Americas']);
  });

  test('llms.txt keeps the entity definition on line 2 and states the identity (ID-11) and the reach (SC-03) on lines 3 and 4', async ({ request }) => {
    const res = await request.get('llms.txt');
    expect(res.status()).toBe(200);
    const lines = (await res.text()).split('\n');
    expect(lines[0]).toBe('# CodersTrust');
    expect(lines[1]).toMatch(/^CodersTrust is a workforce-development organization/);
    expect(lines[2]).toMatch(/^CodersTrust is headquartered in New York, and its parent organization is CT USA, Inc\. CodersTrust Bangladesh \(CodersTrust Bangladesh Ltd\.\) is a country office\./);
    expect(lines[3]).toMatch(/^Programs in 16 countries and territories across Asia, Africa, Europe and the Americas, including Bangladesh since 2014\.$/);
    expect(lines[4]).toBe('');
  });
});
