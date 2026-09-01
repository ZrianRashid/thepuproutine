/* The Pup Routine — first-party attribution (vanilla clone of MBC's attribution.ts).
   Channel-agnostic: first touch frozen on first visit, last touch refreshed every visit
   (a direct re-visit never overwrites the ad that worked), every platform click-id kept.
   No cookies, no third-party scripts, no consent needed. Exposes window.pupAttr(). */
(function () {
  var KEY = 'pup_attr_v1';

  var CLICK_ID_PARAMS = {
    fbclid: 'fbclid',      // Meta
    gclid: 'gclid',        // Google Ads
    gbraid: 'gclid',       // Google Ads, iOS app->web
    wbraid: 'gclid',       // Google Ads, iOS web->web
    ttclid: 'ttclid',      // TikTok
    li_fat_id: 'li_fat_id',// LinkedIn
    msclkid: 'msclkid',    // Microsoft / Bing
    rdt_cid: 'rdt_cid',    // Reddit
    epik: 'epik',          // Pinterest
    twclid: 'twclid',      // X
    ScCid: 'sccid'         // Snapchat
  };

  var REFERRER_MAP = [
    [/(^|\.)google\./, 'google'],
    [/(^|\.)bing\./, 'bing'],
    [/(^|\.)duckduckgo\./, 'duckduckgo'],
    [/(^|\.)(facebook|fb)\./, 'facebook'],
    [/(^|\.)instagram\./, 'instagram'],
    [/(^|\.)linkedin\./, 'linkedin'],
    [/(^|\.)tiktok\./, 'tiktok'],
    [/(^|\.)reddit\./, 'reddit'],
    [/(^|\.)pinterest\./, 'pinterest'],
    [/(^|\.)(x|twitter)\.com/, 'x'],
    [/(^|\.)youtube\./, 'youtube']
  ];

  function params() { return new URLSearchParams(window.location.search); }

  function readStore() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && parsed.first ? parsed : null;
    } catch (e) { return null; }
  }

  function currentTouch() {
    var p = params();
    var ref = document.referrer || '';
    var refHost = '';
    try { refHost = ref ? new URL(ref).hostname : ''; } catch (e) { refHost = ''; }
    var sameSite = refHost && refHost.indexOf(window.location.hostname) >= 0;

    var source = p.get('utm_source') || '';
    var medium = p.get('utm_medium') || '';
    if (!source) {
      if (sameSite || !refHost) {
        source = '(direct)';
        medium = medium || '(none)';
      } else {
        var hit = null;
        for (var i = 0; i < REFERRER_MAP.length; i++) {
          if (REFERRER_MAP[i][0].test(refHost)) { hit = REFERRER_MAP[i][1]; break; }
        }
        source = hit || refHost;
        medium = medium || 'referral';
      }
    }
    if (!p.get('utm_medium')) {
      for (var k in CLICK_ID_PARAMS) { if (p.get(k)) { medium = 'paid'; break; } }
    }
    return {
      ts: new Date().toISOString(), source: source, medium: medium || '(none)',
      campaign: p.get('utm_campaign') || '', content: p.get('utm_content') || '',
      term: p.get('utm_term') || '', referrer: sameSite ? '' : ref
    };
  }

  function clickIds(previous) {
    var p = params();
    var out = {};
    for (var f in (previous || {})) out[f] = previous[f];
    for (var param in CLICK_ID_PARAMS) {
      var v = p.get(param);
      if (v) out[CLICK_ID_PARAMS[param]] = v;
    }
    return out;
  }

  function deviceClass() {
    var ua = navigator.userAgent;
    if (/iPad|Tablet/i.test(ua)) return 'tablet';
    if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  function init() {
    var stored = readStore();
    var touch = currentTouch();
    var attr;
    if (stored) {
      attr = {
        first: stored.first,
        last: (touch.source === '(direct)' && stored.last) ? stored.last : touch,
        touches: (stored.touches || 1) + 1,
        clickIds: clickIds(stored.clickIds),
        device: deviceClass()
      };
    } else {
      attr = { first: touch, last: touch, touches: 1, clickIds: clickIds(), device: deviceClass() };
    }
    try { localStorage.setItem(KEY, JSON.stringify(attr)); } catch (e) { /* private mode */ }
    return attr;
  }

  var current = init();
  window.pupAttr = function () { return readStore() || current; };
})();
