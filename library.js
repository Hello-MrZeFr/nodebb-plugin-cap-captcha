'use strict';

const routeHelpers = require.main.require('./src/routes/helpers');
const meta = require.main.require('./src/meta');
const middleware = require.main.require('./src/middleware');
const winston = require.main.require('winston');

const PLUGIN_ID = 'nodebb-plugin-cap-captcha';
const SETTINGS_KEY = 'cap-captcha';
const DEFAULT_WIDGET_SCRIPT = 'https://cdn.jsdelivr.net/npm/@cap.js/widget@0.1.57/cap.min.js';

const DEFAULTS = {
	enabled: 'off',
	siteKey: '',
	secret: '',
	frontendEndpoint: '/cap/',
	backendVerifyUrl: '',
	widgetScriptUrl: DEFAULT_WIDGET_SCRIPT,
};

const Plugin = module.exports;
let pluginSettings = { ...DEFAULTS };

function str(value) {
	return String(value ?? '').trim();
}

async function loadSettings() {
	const stored = await meta.settings.get(SETTINGS_KEY);
	pluginSettings = { ...DEFAULTS, ...(stored || {}) };
	return pluginSettings;
}

function isEnabled() {
	return str(pluginSettings.enabled) === 'on';
}

function validHttpUrl(value) {
	try {
		const url = new URL(str(value));
		return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password;
	} catch (err) {
		return false;
	}
}

function validFrontendEndpoint(value) {
	const endpoint = str(value);
	if (!endpoint) return false;
	if (endpoint.startsWith('/')) return true;
	return validHttpUrl(endpoint);
}

function normalizeFrontendEndpoint(value, siteKey) {
	const key = str(siteKey);
	let endpoint = str(value);
	if (!endpoint || !key) return '';

	if (endpoint.startsWith('/')) {
		endpoint = endpoint.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
		const segments = endpoint.split('/').filter(Boolean);
		const last = segments.length ? decodeURIComponent(segments[segments.length - 1]) : '';
		return last === key ? `${endpoint}/` : `${endpoint}/${encodeURIComponent(key)}/`;
	}

	try {
		const url = new URL(endpoint);
		url.pathname = url.pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
		const segments = url.pathname.split('/').filter(Boolean);
		const last = segments.length ? decodeURIComponent(segments[segments.length - 1]) : '';
		if (last !== key) url.pathname += `/${encodeURIComponent(key)}`;
		url.pathname += '/';
		return url.toString();
	} catch (err) {
		return '';
	}
}

function canUse() {
	return isEnabled() &&
		str(pluginSettings.siteKey) &&
		str(pluginSettings.secret) &&
		validFrontendEndpoint(pluginSettings.frontendEndpoint) &&
		validHttpUrl(pluginSettings.backendVerifyUrl) &&
		validHttpUrl(pluginSettings.widgetScriptUrl);
}

function buildEntry(role) {
	const key = encodeURIComponent(str(pluginSettings.siteKey));
	const endpoint = normalizeFrontendEndpoint(pluginSettings.frontendEndpoint, pluginSettings.siteKey);
	const script = str(pluginSettings.widgetScriptUrl);
	const id = `cap-captcha-${role}`;

	const html = [
		`<div id="${id}" class="cap-captcha-direct" data-cap-role="${role}">`,
			`<cap-widget required data-cap-api-endpoint="${endpoint}" data-cap-hidden-field-name="cap-token"></cap-widget>`,
		`</div>`,
		`<script type="module" src="${script}" data-cap-captcha-widget="1" data-cap-site-key="${key}"></script>`,
	].join('');

	return {
		label: '',
		inputId: id,
		styleName: 'cap-captcha-form-entry',
		html,
	};
}

async function addLoginCaptcha(data) {
	await loadSettings();
	if (!canUse()) return data;
	const templateData = data.templateData || data;
	if (!Array.isArray(templateData.loginFormEntry)) templateData.loginFormEntry = [];
	templateData.loginFormEntry.push(buildEntry('login'));
	return data;
}

async function addRegisterCaptcha(data) {
	await loadSettings();
	if (!canUse()) return data;
	const templateData = data.templateData || data;
	if (!Array.isArray(templateData.regFormEntry)) templateData.regFormEntry = [];
	templateData.regFormEntry.push(buildEntry('register'));
	return data;
}

async function verifyToken(token) {
	await loadSettings();
	if (!canUse() || !token) return false;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 8000);
	try {
		const response = await fetch(str(pluginSettings.backendVerifyUrl), {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'accept': 'application/json',
			},
			body: JSON.stringify({
				secret: str(pluginSettings.secret),
				response: token,
			}),
			signal: controller.signal,
		});
		if (!response.ok) {
			winston.warn(`[${PLUGIN_ID}] Cap verification returned HTTP ${response.status}`);
			return false;
		}
		const result = await response.json();
		return result?.success === true;
	} catch (err) {
		winston.error(`[${PLUGIN_ID}] Cap verification failed: ${err.message}`);
		return false;
	} finally {
		clearTimeout(timer);
	}
}

function requestToken(req) {
	const token = req?.body?.['cap-token'];
	return typeof token === 'string' ? token.trim() : '';
}

async function checkLogin(data) {
	await loadSettings();
	if (!isEnabled()) return data;
	const token = requestToken(data.req);
	if (!token) throw new Error('[[cap-captcha:required]]');
	if (!(await verifyToken(token))) throw new Error('[[cap-captcha:invalid]]');
	return data;
}

async function checkRegister(data) {
	await loadSettings();
	if (!isEnabled()) return data;
	const token = requestToken(data.req);
	if (!token) throw new Error('[[cap-captcha:required]]');
	if (!(await verifyToken(token))) throw new Error('[[cap-captcha:invalid]]');
	return data;
}

function appendConfig(data) {
	data.capCaptcha = {
		enabled: isEnabled(),
		siteKey: str(pluginSettings.siteKey),
		frontendEndpoint: normalizeFrontendEndpoint(pluginSettings.frontendEndpoint, pluginSettings.siteKey),
		widgetScriptUrl: str(pluginSettings.widgetScriptUrl) || DEFAULT_WIDGET_SCRIPT,
	};
	return data;
}

function settingsSet(data) {
	if (!data || data.plugin !== SETTINGS_KEY) return;
	pluginSettings = { ...DEFAULTS, ...(data.settings || {}) };
}

function adminMenu(header) {
	header.plugins = Array.isArray(header.plugins) ? header.plugins : [];
	if (!header.plugins.some(item => item && item.route === '/plugins/cap-captcha')) {
		header.plugins.push({
			route: '/plugins/cap-captcha',
			icon: 'fa-shield-halved',
			name: 'Cap CAPTCHA',
		});
	}
	return header;
}

async function renderAdmin(req, res) {
	res.render('admin/plugins/cap-captcha', {
		title: 'Cap CAPTCHA',
		nbbId: SETTINGS_KEY,
	});
}

async function load({ router }) {
	await loadSettings();
	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/cap-captcha', renderAdmin);
	// Diagnostic endpoint only. It still requires CSRF and never returns the secret.
	router.post('/api/cap-captcha/verify', middleware.applyCSRF, async (req, res) => {
		if (!isEnabled()) return res.status(503).json({ success: false, code: 'disabled' });
		const token = requestToken(req);
		if (!token) return res.status(400).json({ success: false, code: 'required' });
		const success = await verifyToken(token);
		return res.status(success ? 200 : 403).json({ success });
	});
	winston.info(`[${PLUGIN_ID}] loaded`);
}

Plugin.load = load;
Plugin.adminMenu = adminMenu;
Plugin.addLoginCaptcha = addLoginCaptcha;
Plugin.addRegisterCaptcha = addRegisterCaptcha;
Plugin.checkLogin = checkLogin;
Plugin.checkRegister = checkRegister;
Plugin.appendConfig = appendConfig;
Plugin.settingsSet = settingsSet;
Plugin.uninstall = async function uninstall() {
	try {
		if (typeof meta.settings.delete === 'function') {
			await meta.settings.delete(SETTINGS_KEY);
		} else {
			await meta.settings.set(SETTINGS_KEY, {});
		}
	} catch (err) {
		winston.warn(`[${PLUGIN_ID}] uninstall cleanup skipped: ${err.message}`);
	}
};
