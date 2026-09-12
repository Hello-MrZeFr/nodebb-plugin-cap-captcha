'use strict';

define('admin/plugins/cap-captcha', ['settings', 'alerts'], function (Settings, alerts) {
	const Admin = {};
	Admin.init = function () {
		const wrapper = $('.cap-captcha-settings');
		const nbbId = ajaxify.data.nbbId || 'cap-captcha';
		Settings.load(nbbId, wrapper, function () {});
		$('#save').on('click', function (e) {
			e.preventDefault();
			Settings.save(nbbId, wrapper, function () {
				alerts.success('Cap CAPTCHA 设置已保存');
			});
		});
	};
	return Admin;
});
