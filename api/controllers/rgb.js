'use strict';

module.exports.setLightColor = (req, res) => {

    let id = req.swagger.params.id.value;

    let r = req.swagger.params.r.value ? req.swagger.params.r.value : 0;
    let g = req.swagger.params.g.value ? req.swagger.params.g.value : 0;
    let b = req.swagger.params.b.value ? req.swagger.params.b.value : 0;
    let w = req.swagger.params.w.value ? req.swagger.params.w.value : 0;

    global.module.setColor(id, 'urn:upnp-org:serviceId:RGBController1', {r,g,b,w} )
        .then( (status) => {
            res.json( { data: { status: status }, result : 'ok' } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });
};

module.exports.runAnimation = (req, res) => {
    let id = req.swagger.params.id.value;

    let program = req.swagger.params.program.value;

    global.module.startAnimation(id, 'urn:upnp-org:serviceId:RGBController1', program )
        .then( (status) => {
            res.json( { data: { status: status }, result : 'ok' } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });
};

module.exports.stopAnimation = (req, res) => {
    let id = req.swagger.params.id.value;

    global.module.stopAnimation(id, 'urn:upnp-org:serviceId:RGBController1' )
        .then( (status) => {
            res.json( { data: { status: status }, result : 'ok' } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });
};