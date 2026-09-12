'use strict';

/* global $ */

(function () {
	const PLUGIN = 'cap-captcha';
	let bound = false;

	function getPublicConfig() {
		return window.config?.capCaptcha || {};
	}

	function tpl() {
		return window.ajaxify?.data?.tpl_url || '';
	}

	function authForm() {
		if (tpl() === 'login') return document.querySelector('#login-form');
		if (tpl() === 'register') {
			return document.querySelector('#register-form') || document.querySelector('form[action$="/register"]');
		}
		return null;
	}

	function resetWidget(form) {
		const widget = form?.querySelector('cap-widget');
		if (!widget) return;
		const input = form.querySelector('input[name="cap-token"]');
		if (input) input.value = '';
		try {
			widget.reset();
		} catch (err) {
			const replacement = widget.cloneNode(false);
			widget.replaceWith(replacement);
		}
	}

	function ensureTokenSync(form) {
		const widget = form?.querySelector('cap-widget');
		if (!widget || widget.dataset.capCaptchaBound === '1') return;
		widget.dataset.capCaptchaBound = '1';

		const ensureInput = (value) => {
			let input = form.querySelector('input[name="cap-token"]');
			if (!value) {
				if (input) input.remove();
				return;
			}
			if (!input) {
				input = document.createElement('input');
				input.type = 'hidden';
				input.name = 'cap-token';
				form.appendChild(input);
			}
			input.value = value;
		};

		widget.addEventListener('solve', (event) => {
			ensureInput(String(event.detail?.token || '').trim());
		});
		widget.addEventListener('reset', () => ensureInput(''));
		widget.addEventListener('error', () => ensureInput(''));
	}

	function ensureAuthWidget() {
		const cfg = getPublicConfig();
		if (!cfg.enabled) return;
		const form = authForm();
		if (!form) return;
		const widget = form.querySelector('cap-widget');
		if (!widget) return;
		ensureTokenSync(form);
	}

	function resetAfterAuthFailure() {
		const form = authForm();
		if (!form) return;
		resetWidget(form);
		setTimeout(ensureAuthWidget, 0);
	}

	function installAjaxFailureReset() {
		if (!window.jQuery || bound) return;
		bound = true;
		$(document).on('ajaxError.capCaptcha', function (event, xhr, settings) {
			const url = String(settings?.url || '');
			if (xhr?.status < 400 && xhr?.status !== 0) return;
			if (/(^|\/)(api\/)?login(?:\/|\?|$)/i.test(url) || /(^|\/)(api\/)?register(?:\/|\?|$)/i.test(url)) {
				resetAfterAuthFailure();
			}
		});
	}

	function init() {
		ensureAuthWidget();
		installAjaxFailureReset();
	}

	$(window).on('action:ajaxify.end.capCaptcha', init);
	$(window).on('action:app.load.capCaptcha', init);
	$(window).on('action:script.load.capCaptcha', init);
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init, { once: true });
	} else {
		setTimeout(init, 0);
	}
}());
