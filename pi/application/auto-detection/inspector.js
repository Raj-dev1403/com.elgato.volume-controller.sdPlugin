const propertyInspector = document.getElementById('property-inspector');
const connectMessage = document.getElementById('unable-to-connect');
const unsupportedDevice = document.getElementById('unsupported-device');
const form = document.querySelector('#property-inspector form');
const volumeStepControl = document.getElementById('volume-step');
const tooltip = document.querySelector('.sdpi-info-label'); // This is a bad selector. fix it.
let currentDevice = null;
let deviceType = null;
let firstRun = true;

$PI.onConnected((jsn) => {
	const {
		actionInfo: { action, payload, device },
		appInfo: { devices },
	} = jsn;

	deviceType = devices.find((d) => d.id === device)?.type;

	currentDevice = device;
	setToolTipListeners();

	$PI.onSendToPropertyInspector(action, ({ payload }) => {
		const { connected, globalSettings } = payload;

		if (globalSettings && globalSettings[currentDevice]) {
			Utils.setFormValue(globalSettings[currentDevice], form);
		}

		form.addEventListener('change', (event) => {
			const formData = Utils.getFormValue(form);
			$PI.setGlobalSettings({ ...globalSettings, [currentDevice]: formData });
		});

		setControlVisibility(connected);
	});
});

async function setControlVisibility(connected) {
	if (firstRun) {
		await $PI.loadLocalization('../../../');

		document.querySelectorAll('[data-localize]').forEach((element) => {
			element.textContent = element.innerHTML.trim().lox();
		});
		firstRun = false;
	}

	if (!connected) {
		connectMessage.style.display = 'block';
		propertyInspector.style.display = 'none';
		unsupportedDevice.style.display = 'none';
		return;
	} else if (!isSupportedDevice(deviceType)) {
		propertyInspector.style.display = 'none';
		connectMessage.style.display = 'none';
		unsupportedDevice.style.display = 'block';
	} else {
		connectMessage.style.display = 'none';
		propertyInspector.style.display = 'block';
		unsupportedDevice.style.display = 'none';
	}
}

// Why are tooltips like this? ew.
function setToolTipListeners() {
	const fn = () => {
		const tw = tooltip.getBoundingClientRect().width;
		const rangeRect = volumeStepControl.getBoundingClientRect();
		const w = rangeRect.width - tw / 2;
		const percnt =
			(volumeStepControl.value - volumeStepControl.min) /
			(volumeStepControl.max - volumeStepControl.min);
		if (tooltip.classList.contains('hidden')) {
			tooltip.style.top = '-1000px';
		} else {
			tooltip.style.left = `${rangeRect.left + Math.round(w * percnt) - tw / 4}px`;
			const val = Math.round(volumeStepControl.value);
			tooltip.textContent = `+/- ${val} %`;
			tooltip.style.top = `${rangeRect.top - 30}px`;
		}
	};

	volumeStepControl.addEventListener(
		'mouseenter',
		function () {
			tooltip.classList.remove('hidden');
			tooltip.classList.add('shown');
			fn();
		},
		false
	);

	volumeStepControl.addEventListener(
		'mouseout',
		function () {
			tooltip.classList.remove('shown');
			tooltip.classList.add('hidden');
			fn();
		},
		false
	);
	volumeStepControl.addEventListener('input', fn, false);
}

function isSupportedDevice(deviceType) {
	switch (deviceType) {
		case 0:
		case 2:
		case 7:
			return true;
		default:
			return false;
	}
}
