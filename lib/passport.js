var Passport = require('passport').Passport;
require('yaml-js');
var flash = require('connect-flash');

exports.init = function(compound) {
    //var compound = compound;
    var app = compound.app;
    var passport = new Passport();

    app.use(flash());


    (function injectRoutes() {

        var gotRouter, i, l = app.stack.length;
        app.stack.forEach(function(r, i) {
            if (r.handle === app.router) {
                gotRouter = i;
            }
        });
        for (i = l; i > gotRouter; i--) {
            app.stack[i + 1] = app.stack[i - 1];
        }
        if (gotRouter) {
            app.stack[gotRouter] = {
                route: '',
                handle: passport.initialize()
            };
            app.stack[gotRouter + 1] = {
                route: '',
                handle: passport.session()
            };
        } else {
            app.use(passport.initialize());
            app.use(passport.session());
            app.use(app.router);
        }
    })();

    var conf;

    // TODO
    exports.setCallbackRoute = function(strategyName, path) {
        path = path || ('/auth/' + strategyName + '/callback');
        app.post(path, function(req, res, next) {
            passport.authenticate(strategyName, function(err, user, info) {
                if (err) {
                    return next(err);
                }
                if (!user) {
                    return onFailure(req, res);
                }
                req.logIn(user, function(err) {
                    if (err) {
                        return next(err);
                    }
                    return onSuccess(req, res);
                });
            })(req, res, next);
        });
    };

    exports.onSuccess = function onSuccess(req, res) {
        console.log('onSuccess');
        if (req.params.format === 'json') {
            res.send({
                code: 200
            });

        } else {
            req.flash('info', 'User successfully logged in');
            var userPath = app.compound.map.pathTo.user({
                id: req.session.passport.user
            });
            var redir = conf.successRedirect || userPath;
            if (req.session.redirect) {
                redir = req.session.redirect;
                delete req.session.redirect;
            }
            res.redirect(redir);
        }
    };

    exports.onFailure = function onFailure(req, res) {
        console.log('onFailure');
        if (req.params.format === 'json') {
            res.send(401, {
                code: 401,
                error: 'wrong login credentials'
            });

        } else {
            req.flash('error', 'Wrong login credentials');
            res.redirect(conf.failureRedirect || '/login');
        }
    };

    conf = require(app.root + '/config/passport.yml');
    if (conf && conf instanceof Array) conf = conf[0];
    conf = conf[app.set('env')];

    exports.strategies = [];
    var stratDir = __dirname + '/strategies/';
    require('fs').readdirSync(stratDir).forEach(function(file) {
        if (file.match(/[^\.].*?\.js$/)) {
            var name = file.replace(/\.js$/, '');
            exports.strategies[name] = require(stratDir + file);
            exports.strategies[name].onSuccess = exports.onSuccess;
            exports.strategies[name].setCallbackRoute = exports.setCallbackRoute;
        }
    });

    Object.keys(exports.strategies).forEach(function(str) {
        if (conf[str]) {
            exports.strategies[str].init(conf, app);
        }
    });

    compound.on('models', function(models) {
        if (models.User) {
            exports.loadUser(models.User);
        }
    });

    compound.on('structure', function(s) {
        s.controllers.auth = function AuthController() {
            this.__missingAction = function(c) {
                c.next();
            };
        };
    });

    app.get('/auth/:idp/*', function(req, res) {
        res.send('Provider `' + req.params.idp + '` is not enabled. Specify appropriated settings in config/passport.yml file');
    });

    // convert user to userId
    passport.serializeUser(function serializeUser(user, done) {
        done(null, user.id);
    });

    // convert userId to user
    passport.deserializeUser(function deserializeUser(userId, done) {
        exports.User.find(userId, function(err, user) {
            done(err, user);
        });
    });

};

exports.loadUser = function(u) {
    if (!u.findOrCreate) {
        u.findOrCreate = require('./user.js').findOrCreate;
    }
    Object.keys(exports.strategies).forEach(function(str) {
        exports.strategies[str].User = u;
    });
    exports.User = u;
};