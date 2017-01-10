const BluetoothSerialPort = require('bluetooth-serial-port');

const rfcomm = new BluetoothSerialPort.BluetoothSerialPort();

rfcomm.on('found', function (address, name) {
	console.log('found device:', name, 'with address:', address);
});

rfcomm.on('finished', function () {
	console.log('Discovery finished');
});

console.log('Starting discovery (inquiry)');
rfcomm.inquire();