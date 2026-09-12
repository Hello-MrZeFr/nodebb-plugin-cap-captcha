<div class="acp-page-container">
	<!-- IMPORT admin/partials/settings/header.tpl -->
	<form class="cap-captcha-settings">
		<div class="card">
			<div class="card-body">
				<div class="alert alert-info">仅保护登录和注册。Secret Key 只用于 NodeBB 后端验证。</div>
				<div class="form-check mb-3">
					<input class="form-check-input" id="cap-enabled" type="checkbox" name="enabled" value="on">
					<label class="form-check-label" for="cap-enabled">启用</label>
				</div>
				<div class="mb-3"><label class="form-label" for="cap-site-key">Site Key</label><input class="form-control" id="cap-site-key" name="siteKey" type="text" autocomplete="off"></div>
				<div class="mb-3"><label class="form-label" for="cap-secret">Secret Key</label><input class="form-control" id="cap-secret" name="secret" type="password" autocomplete="new-password"></div>
				<div class="mb-3"><label class="form-label" for="cap-frontend">前端请求地址</label><input class="form-control" id="cap-frontend" name="frontendEndpoint" type="text" placeholder="https://www.emclub.top/cap/"></div>
				<div class="mb-3"><label class="form-label" for="cap-backend">后端 /siteverify 地址</label><input class="form-control" id="cap-backend" name="backendVerifyUrl" type="url" placeholder="http://192.168.10.122:3051/siteverify"></div>
				<div class="mb-4"><label class="form-label" for="cap-widget-js">Widget JS / CDN 地址</label><input class="form-control" id="cap-widget-js" name="widgetScriptUrl" type="url" placeholder="https://cdn.jsdelivr.net/npm/@cap.js/widget@0.1.57/cap.min.js"></div>
				<!-- IMPORT admin/partials/save_button.tpl -->
			</div>
		</div>
	</form>
</div>
