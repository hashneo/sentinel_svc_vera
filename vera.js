'use strict';
require('array.prototype.find');

String.prototype.zpad = function(length) {
    let str = this;
    while (str.length < length)
        str = '0' + str;
    return str;
};

function vera(config) {

    if ( !(this instanceof vera) ){
        return new vera(config);
    }

    const YAML = require('yamljs');

    //let kubeConfig = YAML.load( __dirname + '/kube.yml');

    const redis = require('redis');

    let pub = redis.createClient(
        {
            host: process.env.REDIS || global.config.redis || '127.0.0.1' ,
            socket_keepalive: true,
            retry_unfulfilled_commands: true
        }
    );

    pub.on('ready', function(e){
        let data = JSON.stringify( { module: 'vera', service: { name: 'sentinel-vera', port: 5050 } });
        pub.publish( 'sentinel.plugin.start', data);
    });

    pub.on('end', function(e){
        console.log('Redis hung up, committing suicide');
        process.exit(1);
    });

    const NodeCache = require( "node-cache" );

    const deviceCache = new NodeCache();
    const statusCache = new NodeCache();

    const merge = require('deepmerge');

    const request = require('request');

    const http = new require('http');
    const https = new require('https');

    const keepAliveAgents = {
        http: new http.Agent({keepAlive: true, maxSockets: 3}),
        https: new https.Agent({keepAlive: true, maxSockets: 3})
    };

    const categories = require('./device_categories.json');

    const mapper = require('./upnp/map.js');

    const that = this;

    let lastDataVersion = 0;
    let lastLoadTime = 0;

    deviceCache.on( 'set', function( key, value ){
        let data = JSON.stringify( { module: 'vera', id : key, value : value });
        console.log( 'sentinel.device.insert => ' + data );
        pub.publish( 'sentinel.device.insert', data);
    });

    deviceCache.on( 'delete', function( key ){
        let data = JSON.stringify( { module: 'vera', id : key });
        console.log( 'sentinel.device.delete => ' + data );
        pub.publish( 'sentinel.device.delete', data);
    });

    statusCache.on( 'set', function( key, value ){
        let data = JSON.stringify( { module: 'vera', id : key, value : value });
        console.log( 'sentinel.device.update => ' + data );
        pub.publish( 'sentinel.device.update', data);
    });

    function call(url) {

        return new Promise( (fulfill, reject) => {

            let agent  = null;

            if ( config.systemid == null ) {
                url = 'http://' + config.server + ':3480/data_request?output_format=json&id=' + url;
                agent = keepAliveAgents.http;
            } else {
                url = 'https://' + config.server + '/' + config.user + '/' + config.password + '/' + config.systemid + '/data_request?output_format=json&id=' + url;
                agent = keepAliveAgents.https;
            }

            url += '&rand=' + Math.random();

            console.log(url);

            let options = {
                url : url,
                timeout : 90000,
                agent: agent
            };

            try {
                request(options, (err, response, body) => {
                    if (!err && body.indexOf("ERROR:") != 0 && response.statusCode == 200) {
                        fulfill(JSON.parse(body));
                    } else {
                        console.error(err||body);
                        reject(err||body);
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

        if (extraParameters !== undefined) {
            Object.keys(extraParameters).forEach(function (key) {
                url += '&' + key + '=' + extraParameters[key];
            });
        }

        return new Promise( ( fulfill, reject ) => {
            call(url)
                .then( (data) =>{
                    if ( data['u:' + action + 'Response'] && data['u:' + action + 'Response']['JobID'] ){
                        fulfill('accepted');
                    }else{
                        reject('failed');
                    }
                })
                .catch( (err) =>{
                    reject(err);
                });
        });
    };

    this.setTarget = (id, service, value) => {
        return this.callAction(id, service, 'SetTarget', 'newTargetValue', value);
    };

    this.setLoadLevelTarget = (id, service, value) => {
        return this.callAction(id, service, 'SetLoadLevelTarget', 'newLoadlevelTarget', value);
    };

    this.startAnimation = (id, service, program) => {
        return this.callAction(id, service, 'StartAnimationProgram', 'programName', program);
    };

    this.stopAnimation = ( id, service  ) => {
        return this.callAction(id, service, 'StopAnimationProgram');
    };

    this.setColor = (id, service, value) => {

        let p = [];

        let v = value.r.toString(16).zpad(2) + value.g.toString(16).zpad(2) + value.b.toString(16).zpad(2) + value.w.toString(16).zpad(2) + '00';

        return this.callAction(id, service, 'SetColorTarget', 'newColorTargetValue', v);
        /*
         for( let k in value ){
         if ( value[k] !== undefined ){
         p.push ( new Promise( ( fulfill, reject ) => {
         this.callAction(id, service, 'SetColor', 'newColorTarget', k.toUpperCase() + value[k] )
         .then( () => {
         setTimeout( ()=> { fulfill() }, 2000 );
         })
         .catch( (err) => {
         reject(err)
         })
         }));
         }
         }

         return new Promise(  (fulfill, reject) => {
         Promise.all(p)
         .then( () =>{
         fulfill('accepted');
         })
         .catch( (err) => {
         reject(err);
         })
         });
         */
        /*
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
         */
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
                    if (data === null || data === undefined || data.DataVersion === undefined) {
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

                    if (status === undefined || status.devices === undefined) {
                        reject('no data returned');
                    }

                    let devices = [];

                    for (let i in status.devices) {
                        let device = status.devices[i];

                        let d = {'id': device.id};

                        d['name'] = device['name'];

                        let room = status.rooms.find(function (r) {
                            return r.id == device.room
                        });

                        if (room !== undefined) {
                            let section = status.sections.find(function (r) {
                                return r.id == room.section;
                            });
                            d['where'] = {'location': section.name, 'room': room.name};
                        }

                        let type = categories[device.category];

                        if (type !== undefined) {
                            d['type'] = type.name;

                            let subcategory = type.subcategories[device.subcategory];

                            if (subcategory !== undefined) {
                                d['type'] = d['type'] + '.' + subcategory.name;
                            }

                            if (type.variable !== undefined && type.variable !== "") {
                                d['current'] = device[type.variable];
                            }
                        }

                        if ( global.config.types ){
                            if ( global.config.types[d.id] ) {
                                d.type = global.config.types[d.id];
                            }
                        }

                        if ( global.config.hidden ){
                            if ( global.config.hidden.find( id => id === d.id ) ) {
                                d.type = undefined;
                            }
                        }

                        if (d.type !== undefined) {
                            console.log( JSON.stringify( d ) );
                            devices.push(d);

                            deviceCache.set(d.id, d);
                        }
                    }

                    fulfill(devices);

                    console.log("System load complete.");

                })
                .catch((err) => {
                    reject(err);
                })
        });
    }

    this.Reload = () => {
        return new Promise( (fulfill,reject) => {
            fulfill([]);
        });
    };

    loadSystem()

        .then( () => {

            function processStates(states) {
                let data = {};

                if (states === undefined)
                    return null;

                states.forEach( (state) => {
                    let service = state['service'];
                    //let variable = state['variable'];
                    //let value = state['value'];

                    if (mapper[service]) {
                        data = mapper[service].process(data, state);
                    }
                });

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
