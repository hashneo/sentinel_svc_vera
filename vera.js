require('array.prototype.find');

module.exports = function (config, onDevice, onStatus) {

	var request = require('request');
	//var config = require('./config.json');
	var categories = require('./device_categories.json');

	var NodeCache = require( "node-cache" );
	var deviceCache = new NodeCache();
	var statusCache = new NodeCache();

	var merge = require('deepmerge');

	var http = require('http');
	var keepAliveAgent = new http.Agent({ keepAlive: true });

	var lastDataVersion = 0;
	var lastLoadTime = 0;

	var that = this;

	var inAction = false;

	deviceCache.on( "set", function( key, value ){
		if ( onDevice !== undefined )
			onDevice(value);
	});

	statusCache.on( "set", function( key, value ){
		if ( onStatus !== undefined )
			onStatus(key, value);
	});

	function processStates(states) {
		var data = {};

		if ( states === undefined )
			return null;

		for (var i in states) {
			var state = states[i];
			var service = state['service'];
			var variable = state['variable'];
			var value = state['value']
			if (variable !== undefined) {

				var serviceData;
				var match;
				if ( ( match = /urn:[a-zA-Z0-9\-]+:serviceId:(\w+)(\d+)(?:_(\w+))?/g.exec(service) ) != null ){

					var serviceName = match[1];
					var serviceInstance = match[2];
					var serviceMode = match[3];

					if (data[serviceName] == undefined) {
						data[serviceName] = {};
					}

					serviceData = data[serviceName];

					if ( serviceMode !== undefined ){
						if (serviceData[serviceMode] == undefined) {
							serviceData[serviceMode] = {};
						}

						serviceData = serviceData[serviceMode];
					}

					if ( serviceInstance > 1 ) {
						if (serviceData[serviceInstance] == undefined) {
							serviceData[serviceInstance] = {};
						}

						serviceData = serviceData[serviceInstance];
					}

					if ( variable.toLowerCase() === 'password')
						value = '********';

					serviceData[variable] = value;
				}
			}
		}

        delete data['ZWaveDevice'];
        delete data['HaDevice'];

        if ( data['SwitchPower'] !== undefined ){
            if ( data['SwitchPower']['Target'] !== undefined )
                data['SwitchPower']['Current'] = data['SwitchPower']['Target'];
            if ( data['SwitchPower']['Status'] !== undefined )
                data['SwitchPower']['Current'] = data['SwitchPower']['Status'];
        }

        if ( data['DoorLock'] !== undefined ){
            if ( data['DoorLock']['Target'] !== undefined )
                data['DoorLock']['Current'] = data['DoorLock']['Target'];
            if ( data['DoorLock']['Status'] !== undefined )
                data['DoorLock']['Current'] = data['DoorLock']['Status'];
        }

        if ( data['Dimming'] !== undefined ){
            if ( data['Dimming']['LoadLevelTarget'] !== undefined )
                data['Dimming']['Current'] = data['Dimming']['LoadLevelTarget'];
            if ( data['Dimming']['LoadLevelStatus'] !== undefined )
                data['Dimming']['Current'] = data['Dimming']['LoadLevelStatus'];
/*
			if ( data['Dimming']['Current'] === undefined ){
				delete data['Dimming'];
			}else{
				console.log( "load level => " + data['Dimming']['Current'] );
			}
*/
        }
		return data;
	}

	//http.globalAgent.maxSockets = 1;

	function call(url, success, error) {

		if ( config.systemid == null )
			url = 'http://' + config.server + ':3480/data_request?output_format=json&id=' + url;
		else
			url = 'https://' + config.server + '/' + config.user + '/' + config.password + '/' + config.systemid + '/data_request?output_format=json&id=' + url;

		var options = {
			url : url,
			timeout : 30000,
			agent: keepAliveAgent
		};

        try {
            request(options, function (err, response, body) {
                if (!err && body.indexOf("ERROR:") != 0 && response.statusCode == 200) {
                    var v = null;
                    try {
                        v = JSON.parse(body);
                    } catch (e) {
                    }
                    success(v);
                } else {
					console.log("request failed => " + err);
                    if (error !== undefined)
                        error(err);
                }
            });
        }catch(e){
            console.log("request error => " + e);
            if (error !== undefined)
                error(e);
        }
	}

	this.device = new function () {
		this.get = new function () {
			this.status = function (params, success) {
				var output = {};
				output['Status'] = statusCache.get(params.id);
				success(output);
			};
		};

		this.set = new function () {

			function getServiceFromStatus(id, variable, found, error) {
				that.device.status(id, function (d) {
					var states = d['Device_Num_' + id]["states"];
					var service = null;
					states.forEach(function (state) {
						if (state["variable"] === variable) {
							found(state["service"]);
							return;
						}
					});
				});
				if (error !== undefined && error !== null) {
					error();
				}
			};

			this.callAction = function (id, service, action, variable, value, success, error, extraParameters) {
				inAction = true;
				var url = 'action&action=' + action + '&serviceId=' + service + '&DeviceNum=' + id + '&' + variable + '=' + value;
				if (extraParameters != undefined) {
					Object.keys(extraParameters).forEach(function (key) {
						url += '&' + key + '=' + extraParameters[key];
					});
				}
				call(url, function (data) {
						success(data);
						inAction = false;
					},
					function(err){
						inAction = false;
						if (error)
							error(err);
					}
				);
			};

			this.setTarget = function (id, service, value, success, error) {
				this.callAction(id, service, 'SetTarget', 'newTargetValue', value, success, error);
			};

			this.setLoadLevelTarget = function (id, service, value, success, error) {
				this.callAction(id, service, 'SetLoadLevelTarget', 'newLoadlevelTarget', value, success, error);
			};

			this.setModeTarget = function (id, service, value, success, error) {
				this.callAction(id, service, 'SetModeTarget', 'NewModeTarget', value, success, error);
			};

			this.setCurrentSetpoint = function (id, service, value, success, error) {
				this.callAction(id, service, 'SetCurrentSetpoint', 'NewCurrentSetpoint', value, success, error);
			};

			this.setMode = function (id, service, value, success, error) {
				this.callAction(id, service, 'SetMode', 'NewMode', value, success, error);
			};

			// Functions to control Lights
			this.light = new function () {
				this.on = function (params, success) {
					that.device.set.setTarget(params.id, 'urn:upnp-org:serviceId:SwitchPower1', 1, success);
				};
				this.off = function (params, success) {
					that.device.set.setTarget(params.id, 'urn:upnp-org:serviceId:SwitchPower1', 0, success);
				};
				this.level = function (params, success) {
					that.device.set.setLoadLevelTarget(params.id, 'urn:upnp-org:serviceId:Dimming1', params.value, success);
				};
			};

			// Functions to control locks
			this.lock = new function () {
				this.open = function (params, success) {
					that.device.set.setTarget(params.id, 'urn:micasaverde-com:serviceId:DoorLock1', 0, success);
				};
				this.close = function (params, success) {
					that.device.set.setTarget(params.id, 'urn:micasaverde-com:serviceId:DoorLock1', 1, success);
				};
			};

			this.alarm = new function () {
				this.vista = new function () {
					this.mode = new function () {
						this.away = function (params, success) {
							that.device.set.callAction(params.id, 'urn:micasaverde-com:serviceId:AlarmPartition1', 'RequestArmMode', 'State', 'Armed', success, undefined, {'PINCode': params.code});
						},
						this.stay = function (params, success) {
							that.device.set.callAction(params.id, 'urn:micasaverde-com:serviceId:AlarmPartition1', 'RequestArmMode', 'State', 'Stay', success, undefined, {'PINCode': params.code});
						},
						this.night = function (params, success) {
							that.device.set.callAction(params.id, 'urn:micasaverde-com:serviceId:AlarmPartition1', 'RequestArmMode', 'State', 'Night', success, undefined, {'PINCode': params.code});
						},
						this.vacation = function (params, success) {
							that.device.set.callAction(params.id, 'urn:micasaverde-com:serviceId:AlarmPartition1', 'RequestArmMode', 'State', 'Vacation', success, undefined, {'PINCode': params.code});
						},
						this.disarm = function (params, success) {
							that.device.set.callAction(params.id, 'urn:micasaverde-com:serviceId:AlarmPartition1', 'RequestArmMode', 'State', 'Disarmed', success, undefined, {'PINCode': params.code});
						}
					};
					this.chime = new function () {
						this.toggle = function (params, success) {
							that.device.set.callAction(params.id, 'urn:micasaverde-com:serviceId:VistaAlarmPanel1', 'ToggleChimeMode', 'PINCode', params.code, success, undefined);
						};
						this.on = function (params, success) {
							that.device.set.callAction(params.id, 'urn:micasaverde-com:serviceId:VistaAlarmPanel1', 'SetChimeMode', 'Mode', '1', success, undefined, {'PINCode': params.code});
						};
						this.off = function (params, success) {
							that.device.set.callAction(params.id, 'urn:micasaverde-com:serviceId:VistaAlarmPanel1', 'SetChimeMode', 'Mode', '0', success, undefined, {'PINCode': params.code});
						};
					};
				};
			};

			// Functions to control climate controls
			this.hvac = new function () {
				this.off = function (params, success) {
					that.device.set.setModeTarget(params.id, 'urn:upnp-org:serviceId:HVAC_UserOperatingMode1', 'Off', success);
				};
				this.auto = function (params, success) {
					that.device.set.setModeTarget(params.id, 'urn:upnp-org:serviceId:HVAC_UserOperatingMode1', 'AutoChangeOver', success);
				};
				this.fan = new function () {
					this.auto = function (params, success) {
						that.device.set.setMode(params.id, 'urn:upnp-org:serviceId:HVAC_FanOperatingMode1', 'Auto', success);
					};
					this.on = function (params, success) {
						that.device.set.setMode(params.id, 'urn:upnp-org:serviceId:HVAC_FanOperatingMode1', 'ContinuousOn', success);
					};
					this.periodic = function (params, success) {
						that.device.set.setMode(params.id, 'urn:upnp-org:serviceId:HVAC_FanOperatingMode1', 'PeriodicOn', success);
					};
					this.off = function (params, success) {
						that.device.set.setMode(params.id, 'urn:upnp-org:serviceId:HVAC_FanOperatingMode1', 'Off', success);
					};
				};
				this.heating = new function () {
					this.on = function (params, success) {
						that.device.set.setModeTarget(params.id, 'urn:upnp-org:serviceId:HVAC_UserOperatingMode1', 'HeatOn', success);
					};
					this.set = function (params, success) {
						that.device.set.setCurrentSetpoint(params.id, 'urn:upnp-org:serviceId:TemperatureSetpoint1_Heat', params.value, success);
					};
				};
				this.cooling = new function () {
					this.on = function (params, success) {
						that.device.set.setModeTarget(params.id, 'urn:upnp-org:serviceId:HVAC_UserOperatingMode1', 'CoolOn', success);
					};
					this.set = function (params, success) {
						that.device.set.setCurrentSetpoint(params.id, 'urn:upnp-org:serviceId:TemperatureSetpoint1_Cool', params.value, success);
					};
				};
			};

		};
	};

	this.status = function (params, success, error) {
		var url = 'status&DataVersion=' + lastDataVersion + '&MinimumDelay=100&Timeout=10&LoadTime=' + lastLoadTime + '&rand=' + Math.random();
		//console.log( url );
		call(url, function (data) {
			if ( data === null || data === undefined || data.DataVersion == undefined ){
				if ( error !== undefined )
					error();
				return;
			}
			lastDataVersion = data.DataVersion;

			if ( lastLoadTime == 0 )
				lastLoadTime = data.LoadTime;

			success(data);
		}, error);
	};

	this.system = function (params, success, error) {
		console.log("Loading System");
		call('sdata', function (status) {

			if ( status === undefined || status.devices == undefined ){
				if ( error !== undefined )
					error();
				return;
			}

			var devices = [];
			for (var i in status.devices) {
				var device = status.devices[i];

				var d = {'id': device.id};

				d['name'] = device['name'];

				var room = status.rooms.find(function (r) {
					return r.id == device.room
				});

				if (room !== undefined) {
					var section = status.sections.find(function (r) {
						return r.id == room.section
					});
					d['where'] = {'location': section.name, 'room': room.name};
				}

				var type = categories[device.category];

				if (type !== undefined) {
					d['type'] = type.name;

					var subcategory = type.subcategories[device.subcategory];

					if (subcategory !== undefined) {
						d['type'] = d['type'] + '.' + subcategory.name;
					}

					if (type.variable !== undefined && type.variable !== "") {
						d['current'] = device[type.variable];
					}
				}

				if (d.type != undefined) {
					devices.push(d);
				}

				deviceCache.set(d.id, d);
			}

			if ( success != undefined )
				success(devices)
		}, error);
	};

	this.endPoints = {
		"system": this.system,
		"status": this.status,
		"device/:id/status": this.device.get.status,
		"light/:id/on": this.device.set.light.on,
		"light/:id/off": this.device.set.light.off,
		"light/:id/level/:value": this.device.set.light.level,
		"lock/:id/open": this.device.set.lock.open,
		"lock/:id/close": this.device.set.lock.close,
		"hvac/:id/off": this.device.set.hvac.off,
		"hvac/:id/auto": this.device.set.hvac.auto,
		"hvac/:id/heat": this.device.set.hvac.heating.on,
		"hvac/:id/heat/set/:value": this.device.set.hvac.heating.set,
		"hvac/:id/cool": this.device.set.hvac.cooling.on,
		"hvac/:id/cool/set/:value": this.device.set.hvac.cooling.set,
		"alarm/:id/arm/away": this.device.set.alarm.vista.mode.away,
		"alarm/:id/arm/stay": this.device.set.alarm.vista.mode.stay,
		"alarm/:id/arm/night": this.device.set.alarm.vista.mode.night,
		"alarm/:id/arm/vacation": this.device.set.alarm.vista.mode.vacation,
		"alarm/:id/disarm": this.device.set.alarm.vista.mode.disarm,
		"alarm/:id/chime/on": this.device.set.alarm.vista.chime.on,
		"alarm/:id/chime/off": this.device.set.alarm.vista.chime.off,
		"alarm/:id/chime/toggle": this.device.set.alarm.vista.chime.toggle
	};

	this.system( {}, function() {

		function updateStatus() {

			//console.log("Updating Status");

			if ( inAction ){
				console.log('Skipping update due to action being called');
				//setTimeout(updateStatus, 1000);
				return;
			}

			that.status({}, function (status) {

                try {
                    for (var i in status.devices) {
                        var device = status.devices[i];

                        var d = deviceCache.get(device.id);

                        if (d !== undefined) {
                            //console.log("Updating Status for Device => " + device.id + '(' + d.name + ')');

                            var current = statusCache.get(device.id);

                            var update = processStates(device['states']);

							if ( update ) {
								if (current !== undefined) {
									var newVal = merge(current, update);

									if (JSON.stringify(current) !== JSON.stringify(newVal)){
										statusCache.set(device.id, newVal);
									}
								} else {
									statusCache.set(device.id, update);
								}
							}
                        }
                    }
                }
                catch(e){
                    console.log("status threw error => " + e);
                }
				//setTimeout(updateStatus, 1000);

			}, function(e){
                console.log("status returned error => " + e);
				lastDataVersion = lastLoadTime = 0;
				//setTimeout(updateStatus, 5000);
			});

		}

		setInterval(updateStatus, 500);
	});

	return this;
}

