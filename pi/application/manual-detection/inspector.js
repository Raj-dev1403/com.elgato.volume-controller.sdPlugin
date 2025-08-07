const propertyInspector = document.getElementById('property-inspector');
const form = document.querySelector('#property-inspector form');
const applicationSelect = document.getElementById('application');
const dialFormControls = document.querySelectorAll('.dial');
const keypadFormControls = document.querySelectorAll('.keypad');
const volumeChangeControl = document.getElementById('volume-change');
const volumeStepControl = document.getElementById('volume-step');
const volumeControl = document.getElementById('volume');
const volumeStepItem = document.getElementById('volume-step-item');
const volumeItem = document.getElementById('volume-item');
const muteControl = document.getElementById('mute');
const adjustControl = document.getElementById('adjust');
const setControl = document.getElementById('set');
const typeItem = document.getElementById('type-item');
const styleItem = document.getElementById('icon-style-item');
const styleControl = document.getElementById('icon-style');
const max = document.getElementById('max');
const min = document.getElementById('min');
const tooltip = document.querySelector('.sdpi-info-label'); // This is a bad selector. fix it.

let settings;
let controller;
let appsFromSettings;

form.addEventListener('change', () => {
	const temp = Utils.getFormValue(form);
	if (temp.application) {
		const app = JSON.parse(temp.application);
		temp.application = getAppByExecutableFile(appsFromSettings, app.executableFile);
	} else {
		temp.application = settings.application;
	}

	settings = temp;

	$PI.setSettings(settings);
});

$PI.onConnected(async ({ actionInfo: { payload } }) => {
	settings = payload?.settings;
	controller = payload?.controller;
	settings.controller = controller;

	if (controller === 'Encoder') {
		typeItem.style.display = 'none';
		setVolumeControlItemVisibility(null, true);
		volumeStepControl.min = 1;
		volumeStepControl.value = 3;
		volumeStepControl.max = 5;
		min.textContent = '1';
		max.textContent = '5';
	} else {
		adjustControl.addEventListener('change', setVolumeControlItemVisibility);
		muteControl.addEventListener('change', setVolumeControlItemVisibility);
		setControl.addEventListener('change', setVolumeControlItemVisibility);
		typeItem.style.display = 'flex';
		volumeStepControl.min = -25;
		min.textContent = '-25';
	}

	setToolTipListeners(volumeStepControl);
	setToolTipListeners(volumeControl);
});

// do not put event listeners in here since we can receive this event multiple times
$PI.onSendToPropertyInspector('com.elgato.volume-controller.manual-detection', ({ payload }) => {
	const { apps, connected } = payload;
	appsFromSettings = apps;
	const appFromSettings = settings?.application;
	const { executableFile } = appFromSettings ?? {};
	const appFromSettingsIsAvailable = apps
		?.map((app) => app.executableFile)
		.includes(executableFile);
	const formValue = JSON.parse(JSON.stringify(settings));

	// We have to clear this before redrawing because the plugin might send more apps
	clearApplicationSelect();

	if (appFromSettings?.executableFile) {
		formValue.application = JSON.stringify({ executableFile });

		if (!appFromSettingsIsAvailable) {
			addOption(appFromSettings, true, true);
		}
	}
	apps?.forEach((app) => addOption(app, app.executableFile === executableFile));

	Utils.setFormValue(formValue, form);

	setControlVisibility(connected);
});

function setVolumeControlItemVisibility(event, isEncoder = false) {
	if (isEncoder) {
		volumeStepItem.style.display = 'flex';
		volumeItem.style.display = 'none';
		styleItem.style.display = 'none';
	} else if (adjustControl.checked) {
		volumeStepItem.style.display = 'flex';
		volumeItem.style.display = 'none';
		// styleItem.style.display = 'flex'; // put this back in to control slider style
	} else if (setControl.checked) {
		volumeStepItem.style.display = 'none';
		volumeItem.style.display = 'flex';
		styleItem.style.display = 'none';
	} else {
		volumeStepItem.style.display = 'none';
		volumeItem.style.display = 'none';
		styleItem.style.display = 'none';
	}
}

async function setControlVisibility(connected) {
	await $PI.loadLocalization('../../../');

	document.querySelectorAll('[data-localize]').forEach((element) => {
		element.textContent = element.innerHTML.trim().lox();
	});

	if (!connected) {
		document.getElementById('unable-to-connect').style.display = 'block';
		propertyInspector.style.display = 'none';
		return;
	} else {
		document.getElementById('unable-to-connect').style.display = 'none';
	}

	propertyInspector.style.display = 'block';

	if (controller === 'Encoder') {
		dialFormControls.forEach((control) => {
			control.style.display = 'flex';
		});
	} else {
		keypadFormControls.forEach((control) => {
			control.style.display = 'flex';
		});

		setVolumeControlItemVisibility(adjustControl.value);
	}
}

function addOption(app, selected = false, disabled = false) {
	const option = document.createElement('option');
	const { displayName, executableFile } = app;

	option.text = displayName;
	option.value = JSON.stringify({ executableFile });
	option.selected = selected;
	option.disabled = disabled;

	applicationSelect.options.add(option, applicationSelect.options.length);
}

function clearApplicationSelect() {
	applicationSelect.innerHTML = '';

	const option = document.createElement('option');
	option.text = 'Select Application';
	option.value = '';
	option.selected = true;
	option.disabled = true;
	option.hidden = true;

	applicationSelect.options.add(option, applicationSelect.options.length);
}

// Why are tooltips like this? ew.
function setToolTipListeners(control) {
	const fn = () => {
		const tw = tooltip.getBoundingClientRect().width;
		const rangeRect = control.getBoundingClientRect();
		const w = rangeRect.width - tw / 2;
		const percnt = (control.value - control.min) / (control.max - control.min);
		if (tooltip.classList.contains('hidden')) {
			tooltip.style.top = '-1000px';
		} else {
			tooltip.style.left = `${rangeRect.left + Math.round(w * percnt) - tw / 4}px`;
			const val = Math.round(control.value);
			const displayPercent = val > 0 ? `+${val}%` : `${val}%`;
			tooltip.textContent =
				controller === 'Keypad' ? displayPercent : `+/- ${displayPercent}`;
			tooltip.style.top = `${rangeRect.top - 30}px`;
		}
	};

	control.addEventListener(
		'mouseenter',
		function () {
			tooltip.classList.remove('hidden');
			tooltip.classList.add('shown');
			fn();
		},
		false
	);

	control.addEventListener(
		'mouseout',
		function () {
			tooltip.classList.remove('shown');
			tooltip.classList.add('hidden');
			fn();
		},
		false
	);
	control.addEventListener('input', fn, false);
}

function getAppByExecutableFile(apps, executableFile) {
	return apps.find((app) => {
		return app.executableFile === executableFile;
	});
}
