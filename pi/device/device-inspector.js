/// <reference path="../libs/js/property-inspector.js" />
/// <reference path="../libs/js/utils.js" />

const propertyInspector = document.getElementById("property-inspector");
const form = document.querySelector("#property-inspector form");
const deviceSelect = document.getElementById("device");
const friendlyNameControl = document.getElementById("friendly-name");
const actionItem = document.getElementById("actionItem");
const actionSelect = document.getElementById("action");
const actionPlaceholder = document.getElementById("action-placeholder");
const volumeItem = document.getElementById("volume-item");
const volumeControl = document.getElementById("volume");
const volumeStepItem = document.getElementById("volume-step-item");
const volumeStepControl = document.getElementById("volume-step");
const styleItem = document.getElementById("style-item");
const encoderActionItem = document.getElementById("encoder-action-item");
const max = document.getElementById("max");
const min = document.getElementById("min");
const tooltip = document.querySelector(".sdpi-info-label"); // This is a bad selector. fix it.

let settings;
let controller;
let currentDevices;
let platform;

deviceSelect.addEventListener("change", (event) => {
	if (controller === "Keypad") {
		if (event?.target?.value) {
			actionItem.style.display = "flex";
		}
	}

	friendlyNameControl.value = currentDevices.find((device) => device.id === event.target.value).friendlyName ?? "";
});

actionSelect.addEventListener("change", (event) => {
	if (controller === "Keypad") {
		switch (event.target.value) {
			case "set":
				volumeItem.style.display = "flex";
				volumeStepItem.style.display = "none";
				styleItem.style.display = "none";
				break;
			case "adjust":
				volumeItem.style.display = "none";
				volumeStepItem.style.display = "flex";
				styleItem.style.display = "flex";
				break;
			default:
				volumeItem.style.display = "none";
				volumeStepItem.style.display = "none";
				styleItem.style.display = "none";
		}
	}
});

$PI.onConnected(async ({ actionInfo, appInfo }) => {
	platform = appInfo.application.platform;
	settings = actionInfo.payload?.settings;
	controller = actionInfo.payload?.controller;
	deviceString = settings.device;
	$PI.language = appInfo?.application?.language;

	$PI.loadLocalization("../../../").then(() => {
		document.querySelectorAll("[data-localize]").forEach((element) => {
			element.textContent = element.innerHTML.trim().lox();
		});
	});
});

function initControlVisibilitly() {
	if (controller === "Keypad") {
		actionItem.style.display = "flex";

		if (settings.action) {
			actionPlaceholder.style.display = "none";
		}

		if (settings.action === "set") {
			volumeItem.style.display = "flex";
		} else if (settings.action === "adjust") {
			volumeStepItem.style.display = "flex";
			styleItem.style.display = "flex";
		}
	} else if (controller === "Encoder") {
		volumeStepControl.min = 1;

		if (!settings.volumeStep) {
			volumeStepControl.value = 3;
		}

		volumeStepControl.max = 5;
		min.textContent = "1";
		max.textContent = "5";
		volumeStepItem.style.display = "flex";
		encoderActionItem.style.display = "flex";
	}

	setToolTipListeners(volumeStepControl);
	setToolTipListeners(volumeControl);
}

form.addEventListener("change", () => {
	const newSettings = Utils.getFormValue(form);

	newSettings.friendlyName = newSettings.friendlyName ?? settings.friendlyName;
	newSettings.deviceId = newSettings.deviceId ?? settings.deviceId;

	settings = newSettings;

	$PI.setSettings(settings);
	$PI.sendToPlugin({ settings, controller });
});

function buildDeviceSelect(devices, deviceId, friendlyName) {
	devices.sort((a, b) => {
		if (a.friendlyName < b.friendlyName) return -1;
		if (a.friendlyName > b.friendlyName) return 1;
		return 0;
	});

	// Because we also try to match on the friendly name, the "connectedDevice" is not necessarily the selected device if it is a default
	const connectedDevice = devices.find((device) => device.id === deviceId) ?? devices.find((device) => device.friendlyName === friendlyName);
	const isDefaultCommunication = deviceId === "default-communication";
	const isDefault = !deviceId || deviceId === "default";

	let defaultCommunicationOption;

	deviceSelect.innerHTML = "";

	const defaultOption = document.createElement("option");
	defaultOption.text = "Default Device".lox();
	defaultOption.value = "default";
	defaultOption.disabled = false;
	defaultOption.hidden = false;
	defaultOption.selected = isDefault;
	deviceSelect.options.add(defaultOption, deviceSelect.options.length);

	if (platform === "windows") {
		defaultCommunicationOption = document.createElement("option");
		defaultCommunicationOption.text = "Default Device (Communication)".lox();
		defaultCommunicationOption.value = "default-communication";
		defaultCommunicationOption.disabled = false;
		defaultCommunicationOption.hidden = false;
		defaultCommunicationOption.selected = isDefaultCommunication;
		deviceSelect.options.add(defaultCommunicationOption, deviceSelect.options.length);
	}

	if (!isDefault && !isDefaultCommunication && !connectedDevice) {
		const unavailableOption = document.createElement("option");
		unavailableOption.text = friendlyName;
		unavailableOption.value = deviceId;
		unavailableOption.selected = true;
		unavailableOption.disabled = true;
		unavailableOption.hidden = false;
		deviceSelect.options.add(unavailableOption, 0);
	}

	devices.forEach((device) => {
		const isSelected = !isDefault && !isDefaultCommunication && device.id === connectedDevice?.id;
		const option = document.createElement("option");
		option.text = device.friendlyName;
		option.value = device.id;
		option.selected = isSelected;
		option.disabled = false;
		option.hidden = false;

		if (isSelected) {
			settings.deviceId = connectedDevice.id;
			settings.friendlyName = connectedDevice.friendlyName;
			friendlyNameControl.value = connectedDevice.friendlyName;
		}

		deviceSelect.options.add(option, deviceSelect.options.length);
	});
}

// Why are tooltips like this? ew.
function setToolTipListeners(control) {
	const label = "%"; // window.navigator.userAgent.toLowerCase().includes("mac") ? "dB" : "%";

	const fn = () => {
		const tw = tooltip.getBoundingClientRect().width;
		const rangeRect = control.getBoundingClientRect();
		const w = rangeRect.width - tw / 2;
		const percnt = (control.value - control.min) / (control.max - control.min);
		if (tooltip.classList.contains("hidden")) {
			tooltip.style.top = "-1000px";
		} else {
			tooltip.style.left = `${rangeRect.left + Math.round(w * percnt) - tw / 4}px`;
			const val = Math.round(control.value);
			const displayPercent = val > 0 ? `+${val}${label}` : `${val}${label}`;
			tooltip.textContent = controller === "Keypad" ? displayPercent : `+/- ${displayPercent}`;
			tooltip.style.top = `${rangeRect.top - 30}px`;
		}
	};

	control.addEventListener(
		"mouseenter",
		function () {
			tooltip.classList.remove("hidden");
			tooltip.classList.add("shown");
			fn();
		},
		false
	);

	control.addEventListener(
		"mouseout",
		function () {
			tooltip.classList.remove("shown");
			tooltip.classList.add("hidden");
			fn();
		},
		false
	);
	control.addEventListener("input", fn, false);
}

// do not put event listeners in here since we can receive this event multiple times
function initPropertyInspector({ payload }) {
	const { devices } = payload;

	currentDevices = devices;

	buildDeviceSelect(devices, settings.deviceId, settings.friendlyName);

	Utils.setFormValue(settings, form);

	initControlVisibilitly();

	// If the settings don't exist yet, set the default values from the form
	// Setting the defaults on the first appearance of the PI is easier than determining defaults or missing values in the plugin
	settings = Object.keys(settings).length === 0 ? Utils.getFormValue(form) : settings;

	$PI.setSettings(settings);
	$PI.sendToPlugin({ settings, controller });
}
