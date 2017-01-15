'use strict';
require('array.prototype.find');

function vera(config) {

    if ( !(this instanceof vera) ){
        return new vera(config);
    }

    const redis = require('redis');

    let pub = redis.createClient(
        {
            host: process.env.REDIS || global.config.redis || '127.0.0.1' ,
            socket_keepalive: true,
            retry_unfulfilled_commands: true
        }
    );

    pub.on('end', function(e){
        console.log('Redis hung up, committing suicide');
        process.exit(1);
    });

    const NodeCache = require( "node-cache" );

    const deviceCache = new NodeCache();
    const statusCache = new NodeCache();

    const merge = require('deepmerge');

    const request = require('request');
    const http = require('http');
    const keepAliveAgent = new http.Agent({ keepAlive: true, maxSockets: 3 });

    const categories = require('./device_categories.json');

    const that = this;

    let lastDataVersion = 0;
    let lastLoadTime = 0;

    deviceCache.on( "set", function( key, value ){
    });

    statusCache.on( "set", function( key, value ){
        let data = JSON.stringify( { module: 'vera', id : key, value : value });
        console.log( data );
        pub.publish("sentinel.device.update",  data);
    });

    function call(url) {

        return new Promise( (fulfill, reject) => {

            if ( config.systemid == null )
                url = 'http://' + config.server + ':3480/data_request?output_format=json&id=' + url;
            else
                url = 'https://' + config.server + '/' + config.user + '/' + config.password + '/' + config.systemid + '/data_request?output_format=json&id=' + url;

            url += '&rand=' + Math.random();

            console.log(url);

            let options = {
                url : url,
                timeout : 30000,
                agent: keepAliveAgent
            };

            try {
                request(options, (err, response, body) => {
                    if (!err && body.indexOf("ERROR:") != 0 && response.statusCode == 200) {
                        fulfill(JSON.parse(body));
                    } else {
                        console.error(err);
                        reject(err);
                    }
                });
            }catch(e){
                console.error(err);
                reject(e);
            }
        } );
    }

    this.getDevices = () => {

        return new Promise( (fulfill, reject) => {
            deviceCache.keys( ( err, ids ) => {
                if (err)
                    return reject(err);

                deviceCache.mget( ids, (err,values) =>{
                    if (err)
                        return reject(err);

                    statusCache.mget( ids, (err, statuses) => {
                        if (err)
                            return reject(err);

                        let data = [];

                        for (let key in values) {
                            let v = values[key];

                            if ( statuses[key] ) {
                                v.current = statuses[key];
                                data.push(v);
                            }
                        }

                        fulfill(data);
                    });

                });
            });
        });
    };

    this.getDeviceStatus = (id) => {

        return new Promise( (fulfill, reject) => {
            try {
                statusCache.get(id, (err, value) => {
                    if (err)
                        return reject(err);

                    fulfill(value);
                }, true);
            }catch(err){
                reject(err);
            }
        });

    };

    this.callAction = (id, service, action, variable, value, extraParameters) => {
        let url = 'action&action=' + action + '&serviceId=' + service + '&DeviceNum=' + id;

        if ( variable )
            url += '&' + variable + '=' + value;

        if (extraParameters != undefined) {
            Object.keys(extraParameters).forEach(function (key) {
                url += '&' + key + '=' + extraParameters[key];
            });
        }

        return call(url);
    };

    this.setTarget = (id, service, value) => {
        return this.callAction(id, service, 'SetTarget', 'newTargetValue', value);
    };

    this.setLoadLevelTarget = (id, service, value) => {
        return this.callAction(id, service, 'SetLoadLevelTarget', 'newLoadlevelTarget', value);
    };

    this.setColorRGBW = (id, service, value) => {
        let parts = value.split(',');
        if ( parts.length < 3 )
            throw "invalid parameters";
        // If no white is specified, assume 0;
        if ( parts.length == 3 )
            parts.push('0');

        let newRGB = parts[0] + ',' + parts[1] + ',' + parts[2];

        return new Promise( (fulfill,reject)=>{
            this.callAction(id, service, 'SetColorRGB', 'newColorRGBTarget', newRGB)
                .then(()=>{
                    setTimeout( () => {
                        this.callAction(id, service, 'SetColor', 'newColorTarget', 'W' + parts[3])
                            .then(()=>{
                                fulfill();
                            })
                            .catch((err) => {
                                reject(err);
                            })
                    }, 2000);
                })
                .catch((err) => {
                    reject(err);
                })
        })
    };

    this.setModeTarget = (id, service, value) => {
        return this.callAction(id, service, 'SetModeTarget', 'NewModeTarget', value);
    };

    this.setCurrentSetpoint = (id, service, value) => {
        return this.callAction(id, service, 'SetCurrentSetpoint', 'NewCurrentSetpoint', value);
    };

    this.setMode = (id, service, value) => {
        return this.callAction(id, service, 'SetMode', 'NewMode', value);
    };

    this.pollDevice = (id) => {
        return this.callAction(id, 'urn:micasaverde-com:serviceId:HaDevice1', 'Poll');
    };

    function updateStatus() {

        return new Promise( ( fulfill, reject ) => {
            let url = 'status&DataVersion=' + lastDataVersion + '&MinimumDelay=100&Timeout=60&LoadTime=' + lastLoadTime;

            //console.log(url);

            call(url)
                .then((data) => {
                    if (data === null || data === undefined || data.DataVersion == undefined) {
                        return reject('nothing returned')
                    }
                    lastDataVersion = data.DataVersion;
                    if (lastLoadTime == 0)
                        lastLoadTime = data.LoadTime;
                    fulfill(data);
                })
                .catch((err) => {
                    reject(err);
                })
        });
    }

    function loadSystem() {

        console.log("Loading System..");

        return new Promise( (fulfill, reject) => {

            call('sdata')

                .then((status) => {

                    if (status === undefined || status.devices == undefined) {
                        reject('no data returned');
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
                            console.log( JSON.stringify( d ) );
                            devices.push(d);
                        }

                        deviceCache.set(d.id, d);
                    }

                    fulfill(devices);

                    console.log("System load complete.");

                })
                .catch((err) => {
                    reject(err);
                })
        });
    }

    loadSystem()

        .then( () => {

            function processStates(states) {
                var data = {};

                if (states === undefined)
                    return null;

                var _mapper = require('./upnp/map.js');

                for (var i in states) {
                    var state = states[i];
                    var service = state['service'];
                    var variable = state['variable'];
                    var value = state['value'];

                    if (!_mapper[service])
                        continue;

                    data = _mapper[service].process( data, state );
/*
                    if (variable !== undefined) {

                        var serviceData;
                        var match;
                        if (( match = /urn:[a-zA-Z0-9\-]+:serviceId:(\w+)(\d+)(?:_(\w+))?/g.exec(service) ) != null) {

                            var serviceName = match[1];
                            var serviceInstance = match[2];
                            var serviceMode = match[3];

                            if (data[serviceName] == undefined) {
                                data[serviceName] = {};
                            }

                            serviceData = data[serviceName];

                            if (serviceMode !== undefined) {
                                if (serviceData[serviceMode] == undefined) {
                                    serviceData[serviceMode] = {};
                                }

                                serviceData = serviceData[serviceMode];
                            }

                            if (serviceInstance > 1) {
                                if (serviceData[serviceInstance] == undefined) {
                                    serviceData[serviceInstance] = {};
                                }

                                serviceData = serviceData[serviceInstance];
                            }

                            if (variable.toLowerCase() === 'password')
                                value = '********';

                            serviceData[variable] = value;
                        }
                    }
*/
                }
/*
                console.log('Service => ' + service);
                delete data['ZWaveDevice'];
                delete data['HaDevice'];
                delete data['ZWaveNetwork'];

                if (data['SwitchPower'] !== undefined) {
                    if (data['SwitchPower']['Target'] !== undefined)
                        data['SwitchPower']['Current'] = data['SwitchPower']['Target'];
                    if (data['SwitchPower']['Status'] !== undefined)
                        data['SwitchPower']['Current'] = data['SwitchPower']['Status'];
                }

                if (data['DoorLock'] !== undefined) {
                    delete data['MyQGateway'];
                    delete data['SwitchPower'];
                    delete data['DoorLock']['sl_LockButton'];
                    delete data['DoorLock']['sl_UserCode'];
                    delete data['DoorLock']['MaxPinSize'];
                    delete data['DoorLock']['MinPinSize'];
                    delete data['DoorLock']['PinCodes'];
                    delete data['DoorLock']['KeepPinCodes'];
                    delete data['DoorLock']['LockArgs'];
                    if (data['DoorLock']['Target'] !== undefined)
                        data['DoorLock']['Current'] = data['DoorLock']['Target'];
                    if (data['DoorLock']['Status'] !== undefined)
                        data['DoorLock']['Current'] = data['DoorLock']['Status'];
                }

                if (data['Dimming'] !== undefined) {
                    if (data['Dimming']['LoadLevelTarget'] !== undefined)
                        data['Dimming']['Current'] = data['Dimming']['LoadLevelTarget'];
                    if (data['Dimming']['LoadLevelStatus'] !== undefined)
                        data['Dimming']['Current'] = data['Dimming']['LoadLevelStatus'];

                }
*/
                return data;
            }

            function pollSystem() {

                updateStatus()
                    .then((status) => {

                        for (let i in status.devices) {

                            let device = status.devices[i];

                            let d = deviceCache.get(device.id);

                            if (d !== undefined) {
                                let current = statusCache.get(device.id);

                                let update = processStates(device['states']);

                                if (update) {
                                    if (current !== undefined) {
                                        let newVal = merge(current, update);

                                        if (JSON.stringify(current) !== JSON.stringify(newVal)) {
                                            statusCache.set(device.id, newVal);
                                        }
                                    } else {
                                        statusCache.set(device.id, update);
                                    }
                                }
                            }
                        }
                        setTimeout(pollSystem, 10);
                    })
                    .catch((err) => {
                        console.error(err);
                        lastDataVersion = lastLoadTime = 0;
                        setTimeout(pollSystem, 1000);
                    });

            }

            setTimeout(pollSystem, 10);
/*
            function pollDevices() {

                deviceCache.keys( ( err, ids ) => {
                    if (!err){
                        for (let i in ids) {
                            that.pollDevice(ids[i])
                                .then( ()=>{

                                })
                                .catch( (err)=>{

                                });
                        }
                    }

                    // Re-run every hour
                    setTimeout(pollDevices, (60 * 60) * 1000);
                });

            }

            setTimeout(pollDevices, 10);
*/
        })
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });

}

module.exports = vera;

