'use strict';

module.exports.setLightState = (req, res) => {

    let id = req.swagger.params.id.value;
    let state = req.swagger.params.state.value;

    global.module.getDevice(id)

        .then ( (d) => {

            // if desired state is on and light is dimmable and was set, turn on via Dimming1
            if (state === 'on' && d.type.startsWith('light.dimmable')) {
                let v = d.current;

                if (v && v.set) {

                    global.module.setLoadLevelTarget(id, 'urn:upnp-org:serviceId:Dimming1', v.set)
                        .then((status) => {
                            res.json({data: {status: status}, result: 'ok'});
                        })
                        .catch((err) => {
                            res.status(500).json({code: err.code || 0, message: err.message});
                        });

                    return;
                }
            }

            // All other cases fall through to standard on
            global.module.setTarget(id, 'urn:upnp-org:serviceId:SwitchPower1', state === 'on' ? 1 : 0)
                .then((status) => {
                    res.json({data: {status: status}, result: 'ok'});
                })
                .catch((err) => {
                    res.status(500).json({code: err.code || 0, message: err.message});
                });

        })
        .catch( (err) => {
            res.status(500).json({code: err.code || 0, message: err.message});
        });
};

module.exports.setLightLevel = (req, res) => {

    let id = req.swagger.params.id.value;
    let value = req.swagger.params.level.value;

    global.module.setLoadLevelTarget(id, 'urn:upnp-org:serviceId:Dimming1', value)
        .then( (status) => {
            res.json( { data: { status: status }, result : 'ok' } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });
};
