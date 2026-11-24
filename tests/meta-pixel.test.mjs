import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';

const root = new URL('../', import.meta.url).pathname;
const ts = createRequire(root + 'package.json')('typescript');
const cache = new Map();

function load(file) {
  if (cache.has(file)) return cache.get(file);
  let source = readFileSync(root + file, 'utf8');
  if (file === 'lib/analytics.ts') {
    source = source.replace(
      "import {sendGTMEvent} from '@next/third-parties/google';",
      'const sendGTMEvent = (...args) => globalThis.sendGTMEvent(...args);',
    );
  }
  source = source.replace(/from ['"]@\/([^'"]+)['"]/g, (_match, spec) => `from ${JSON.stringify(load(`${spec}.ts`))}`);
  source = source.replace(/from ['"]\.\/([^'"]+)['"]/g, (_match, spec) => {
    const dir = file.slice(0, file.lastIndexOf('/') + 1);
    return `from ${JSON.stringify(load(`${dir}${spec}.ts`))}`;
  });
  const js = ts.transpileModule(source, {
    compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
  }).outputText;
  const url = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;
  cache.set(file, url);
  return url;
}

const config = await import(load('lib/analytics-config.ts'));
const pixel = await import(load('lib/meta-pixel.ts'));
const analytics = await import(load('lib/analytics.ts'));

assert.equal(config.metaPixelId(undefined), config.defaultMetaPixelId);
assert.equal(config.metaPixelId(''), config.defaultMetaPixelId);
assert.equal(config.metaPixelId(' 1479421600920150 '), '1479421600920150');
assert.equal(config.metaPixelId('123456789012345'), '123456789012345');
assert.equal(config.metaPixelId('1234567890123456'), '1234567890123456');
assert.equal(config.metaPixelId('12345678901234'), config.defaultMetaPixelId);
assert.equal(config.metaPixelId('12345678901234567'), config.defaultMetaPixelId);
assert.equal(config.metaPixelId('147942160092015O'), config.defaultMetaPixelId);
assert.equal(config.metaPixelId('1479421600920150");alert(1)//'), config.defaultMetaPixelId);

for (const path of ['/admin', '/admin/', '/admin/login', '/api', '/api/inquiries', '/quote', '/quote/token']) {
  assert.equal(config.isMetaPixelExcluded(path), true, path);
}
for (const path of ['/', '/inquiry', '/contact', '/quotes', '/administrator', '/quote-preview']) {
  assert.equal(config.isMetaPixelExcluded(path), false, path);
}

const bootstrap = pixel.metaPixelBootstrap('nope');
assert.match(bootstrap, /https:\/\/connect\.facebook\.net\/en_US\/fbevents\.js/);
assert.match(bootstrap, /fbq\('init',"1479421600920150"\)/);
assert.match(bootstrap, /fbq\('track','PageView'\)/);
assert.match(bootstrap, /__bubuMetaPixel\.booted/);
assert.match(bootstrap, /fbq\.disablePushState=true/);
assert.doesNotMatch(bootstrap, /nope|alert/);
assert.equal(
  pixel.metaPixelNoscriptSrc('123456789012345'),
  'https://www.facebook.com/tr?id=123456789012345&ev=PageView&noscript=1',
);

const fresh = {booted: 1, snippetPage: '/'};
assert.equal(pixel.decidePageView(fresh, '/', true, '/'), 'skip');
assert.equal(fresh.snippetPage, undefined);
assert.equal(fresh.last, '/');
assert.equal(pixel.decidePageView(fresh, '/', true, '/'), 'skip');
assert.equal(pixel.decidePageView(fresh, '/pricing', true, '/pricing'), 'send');
fresh.leftPublic = true;
assert.equal(pixel.decidePageView(fresh, '/pricing', true, '/pricing'), 'send');
assert.equal(pixel.decidePageView({booted: 0}, '/', false), 'wait');
assert.equal(pixel.decidePageView({booted: 1}, '/', false), 'wait');
assert.equal(pixel.decidePageView({booted: 1, snippetPage: '/?utm=1'}, '/', true, '/?utm=1'), 'skip');

const calls = [];
globalThis.window = {
  location: {pathname: '/', search: ''},
  dataLayer: [],
  __bubuAnalytics: {mode: 'ga4'},
  fbq: (...args) => calls.push(args),
  setInterval: (fn) => {
    globalThis.window.fbq = (...args) => calls.push(args);
    fn();
    return 1;
  },
  clearInterval() {},
};

pixel.trackMetaEvent('line_click', {page_path: '/', cta_location: 'header', name: '王小明', phone: '0912345678'});
assert.equal(calls[0][0], 'track');
assert.equal(calls[0][1], 'Contact');
assert.deepEqual(calls[0][2], {method: 'line'});
assert.match(calls[0][3].eventID, /^[0-9a-f-]{36}$/i);
assert.equal(JSON.stringify(calls[0]).includes('0912345678'), false);
assert.equal(JSON.stringify(calls[0]).includes('王小明'), false);
assert.equal(JSON.stringify(calls[0]).includes('page_path'), false);

pixel.trackMetaEvent('phone_click', {page_path: '/contact'});
assert.deepEqual(calls[1][2], {method: 'phone'});
assert.notEqual(calls[1][3].eventID, calls[0][3].eventID);

pixel.trackMetaEvent('generate_lead', {service: 'S01,S03', page_path: '/inquiry', cta_location: 'inquiry_form'});
assert.equal(calls[2][1], 'Lead');
assert.deepEqual(calls[2][2], {content_name: 'S01,S03'});
assert.equal(JSON.stringify(calls[2]).includes('inquiry'), false);

pixel.trackMetaEvent('generate_lead', {service: '0912345678'});
assert.deepEqual(calls[3][2], {});

globalThis.window.location.pathname = '/quote/secret';
const before = calls.length;
pixel.trackMetaEvent('line_click', {page_path: '/quote/secret'});
assert.equal(calls.length, before);

globalThis.window.location.pathname = '/';
globalThis.window.fbq = () => {
  throw new Error('blocked');
};
assert.doesNotThrow(() => pixel.trackMetaEvent('phone_click', {}));

calls.length = 0;
globalThis.window.fbq = undefined;
pixel.trackMetaEvent('line_click', {});
assert.equal(calls.length, 1);
assert.equal(calls[0][1], 'Contact');

const gtm = [];
globalThis.sendGTMEvent = (payload) => gtm.push(payload);
globalThis.window.fbq = (...args) => calls.push(args);
globalThis.window.__bubuAnalytics = {mode: 'gtm'};
globalThis.window.location.pathname = '/inquiry';
calls.length = 0;
analytics.track('generate_lead', {service: 'S01', page_path: '/inquiry', cta_location: 'inquiry_form', id: ''});
assert.equal(gtm[0].event, 'generate_lead');
assert.equal(gtm[0].service, 'S01');
assert.equal(gtm[0].id, undefined);
assert.equal(calls[0][1], 'Lead');
assert.deepEqual(calls[0][2], {content_name: 'S01'});

globalThis.sendGTMEvent = () => {
  throw new Error('gtm down');
};
globalThis.window.dataLayer = [];
calls.length = 0;
analytics.track('line_click', {page_path: '/', cta_location: 'header'});
assert.equal(globalThis.window.dataLayer.at(-1).event, 'line_click');
assert.deepEqual(calls[0][2], {method: 'line'});

globalThis.window.__bubuAnalytics = {mode: 'ga4'};
globalThis.window.dataLayer = [];
calls.length = 0;
analytics.track('phone_click', {page_path: '/contact', cta_location: 'footer'});
assert.equal(globalThis.window.dataLayer[0][0], 'event');
assert.equal(globalThis.window.dataLayer[0][1], 'phone_click');
assert.deepEqual(calls[0][2], {method: 'phone'});

const pageViews = [];
globalThis.window.fbq = function fbq() {
  pageViews.push({self: this, args: Array.from(arguments)});
};
globalThis.window.fbq.callMethod = globalThis.window.fbq;
globalThis.window.location.pathname = '/about';
pixel.sendMetaPageView();
assert.equal(pageViews[0].self.allowDuplicatePageViews, true);
assert.deepEqual(pageViews[0].args.slice(0, 2), ['track', 'PageView']);
globalThis.window.fbq = () => {
  throw new Error('blocked');
};
assert.doesNotThrow(() => pixel.sendMetaPageView());

console.log('meta pixel tests passed');
