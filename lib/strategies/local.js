/* jslint node: true */
"use strict";

var passport = require('passport');
var bugsnag = require("bugsnag");

function validateEmail(email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

exports.callback = function(email, password, done) {
    if (!validateEmail(email)) {
        done(null, null, new Error('Invalid email address'));

    } else {
        exports.User.findOrCreate({
            where: {
                email: email
            }
        }, {
            email: email,
            password: password,
            displayName: email
        }, function(err, user) {
            if (err) {
                return done(null, user, new Error('Login error'));
            }
            if (!exports.User.verifyPassword(password, user.password)) {
                return done(null, user, new Error('Invalid email/password combination'));
            }
            return done(null, user);
        });
    }
};

exports.init = function(conf, app) {
    var Strategy = require('passport-local').Strategy;
    passport.use(new Strategy({
        usernameField: conf.usernameField || 'email'
    }, exports.callback));

    /* app.post('/login', passport.authenticate('local', {
        failureRedirect: '/login',
        failureFlash: true
    }), exports.onSuccess);*/

    //exports.setCallbackRoute('local', '/login');

    // TODO: rerender login with errors: https://github.com/jaredhanson/passport-local/issues/4

    app.post('/login', function(req, res, next) {
        passport.authenticate('local', function(err, user, info) {
            if (err || info || !user) {
                // *** Display message without using flash option
                // re-render the login form with a message
                if (err || info) {
                    req.flash('error', err && err.message || info && info.message);
                    if (info.name === 'BadRequestError') {
                        bugsnag.notify(err || info, {
                            user: user,
                            error: err,
                            info: info,
                            req: {
                                url: req.url,
                                headers: req.headers,
                                body: req.body
                            }
                        });
                    }
                }
                return res.redirect('/login');
                /* return res.render('static/login', {
                    user: {
                        email: req.body.email,
                        errors: [info]
                    }
                });*/
            } else {
                req.logIn(user, function(err) {
                    // TODO: set flash message if user was created that the user was created and the email should be validated soon
                    if (err) {
                        bugsnag.notify(err, {
                            user: user,
                            req: {
                                url: req.url,
                                headers: req.headers,
                                body: req.body
                            }
                        });
                        req.flash('error', err);
                        return next(err);
                    }
                    exports.onSuccess();
                });
            }
        })(req, res, next);
    });
};