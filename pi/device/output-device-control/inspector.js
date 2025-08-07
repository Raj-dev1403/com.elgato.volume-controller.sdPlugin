/// <reference path="../../libs/js/property-inspector.js" />
/// <reference path="../device-inspector.js" />

// eventually this will probably be merged into the devices PI rather than separate for input and output
$PI.onSendToPropertyInspector("com.elgato.volume-controller.output-device-control", initPropertyInspector);
